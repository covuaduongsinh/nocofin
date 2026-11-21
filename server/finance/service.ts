import { randomUUID } from 'node:crypto';
import { ApiError } from '@nocobase/app-server/router';
import type { DatabaseConnection } from '@nocobase/db';
import type {
  FinBranch,
  FinAccount,
  FinCategory,
  FinTransaction,
} from './resources.js';

export interface OverviewQuery {
  period?: string;
  branchId?: string;
}

export interface ListTransactionsQuery {
  page?: number;
  pageSize?: number;
  period?: string;
  branchId?: string;
  accountId?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  search?: string;
  tournamentId?: string;
}

export interface CreateTransactionInput {
  type: 'income' | 'expense';
  date: string; // YYYY-MM-DD
  amount: number | string;
  categoryId: string;
  accountId: string;
  branchId?: string | null;
  counterparty?: string | null;
  description?: string | null;
  tournamentId?: string | null;
}

export interface UpdateTransactionInput {
  date?: string;
  amount?: number | string;
  categoryId?: string;
  accountId?: string;
  branchId?: string | null;
  counterparty?: string | null;
  description?: string | null;
  tournamentId?: string | null;
}

// Drivers differ in what they return for the same columns: SQLite answers booleans as 0/1, and Postgres answers
// bigint as a string and a DATE column as a Date at local midnight. The HTTP contract the client reads
// (client/pages/finance/types.ts) is booleans, numbers and YYYY-MM-DD strings on every dialect, so rows are normalized
// here before they leave the service.
export const toBoolean = (value: unknown): boolean =>
  value === true ||
  value === 1 ||
  value === '1' ||
  value === 't' ||
  value === 'true';

export const toCalendarDate = (value: unknown): string => {
  if (value instanceof Date) {
    // The driver built this Date at local midnight; toISOString() would shift it a day east of UTC.
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
};

const normalizeBranch = <T extends { active: unknown }>(row: T) => ({
  ...row,
  active: toBoolean(row.active),
});

const normalizeCategory = <T extends { active: unknown; sort: unknown }>(
  row: T,
) => ({
  ...row,
  sort: Number(row.sort),
  active: toBoolean(row.active),
});

export const normalizeTransaction = <
  T extends { amount: unknown; date: unknown },
>(
  row: T,
) => ({
  ...row,
  amount: Number(row.amount),
  date: toCalendarDate(row.date),
  tournamentId: (row as { tournamentId?: string | null }).tournamentId ?? null,
});

/** A voucher of a settled tournament is part of its final account and may no longer change. */
export const tournamentClosedError = (field = 'tournamentId') =>
  new ApiError({
    status: 'FAILED_PRECONDITION',
    reason: 'FINANCE_TOURNAMENT_CLOSED',
    domain: 'finance',
    message:
      'The tournament is settled (closed); reopen it before changing its vouchers or budget.',
    fieldViolations: [
      { field, description: 'The tournament is settled (closed).' },
    ],
  });

interface VoucherReferences {
  type: string;
  categoryId?: string;
  accountId?: string;
  branchId?: string | null;
  tournamentId?: string | null;
}

/**
 * A voucher may only name an existing, active category of its own type, an existing active account and, when it has
 * one, an existing active branch and an existing tournament that is not settled. Checked here rather than left to the foreign keys, which answer an unknown id with a
 * 500 and accept inactive or wrongly typed references.
 */
async function assertVoucherReferences(
  connection: DatabaseConnection,
  refs: VoucherReferences,
): Promise<void> {
  const violations: Array<{ field: string; description: string }> = [];
  if (refs.categoryId !== undefined) {
    const category = await connection.query
      .selectFrom('finCategories')
      .select(['type', 'active'])
      .where('id', '=', refs.categoryId)
      .executeTakeFirst<{ type: string; active: unknown }>();
    if (!category || !toBoolean(category.active))
      violations.push({
        field: 'categoryId',
        description: 'Must name an active category.',
      });
    else if (category.type !== refs.type)
      violations.push({
        field: 'categoryId',
        description: `Must name a category of type ${refs.type}.`,
      });
  }
  if (refs.accountId !== undefined) {
    const account = await connection.query
      .selectFrom('finAccounts')
      .select(['active'])
      .where('id', '=', refs.accountId)
      .executeTakeFirst<{ active: unknown }>();
    if (!account || !toBoolean(account.active))
      violations.push({
        field: 'accountId',
        description: 'Must name an active fund account.',
      });
  }
  if (refs.branchId) {
    const branch = await connection.query
      .selectFrom('finBranches')
      .select(['active'])
      .where('id', '=', refs.branchId)
      .executeTakeFirst<{ active: unknown }>();
    if (!branch || !toBoolean(branch.active))
      violations.push({
        field: 'branchId',
        description: 'Must name an active branch.',
      });
  }
  if (refs.tournamentId) {
    const tournament = await connection.query
      .selectFrom('finTournaments')
      .select(['status'])
      .where('id', '=', refs.tournamentId)
      .executeTakeFirst<{ status: string }>();
    if (!tournament)
      violations.push({
        field: 'tournamentId',
        description: 'Must name an existing tournament.',
      });
    else if (tournament.status === 'closed')
      violations.push({
        field: 'tournamentId',
        description: 'Must name a tournament that is not settled (closed).',
      });
  }
  if (violations.length > 0) {
    throw new ApiError({
      status: 'INVALID_ARGUMENT',
      reason: 'FINANCE_VOUCHER_REFERENCE_INVALID',
      domain: 'finance',
      message:
        'The voucher names a missing or inactive category, account, branch or tournament, or a settled tournament.',
      fieldViolations: violations,
    });
  }
}

/** Rejects a change to the vouchers or budget of a settled tournament. */
export async function assertTournamentOpen(
  connection: DatabaseConnection,
  tournamentId: string | null | undefined,
  field = 'tournamentId',
): Promise<void> {
  if (!tournamentId) return;
  const tournament = await connection.query
    .selectFrom('finTournaments')
    .select(['status'])
    .where('id', '=', tournamentId)
    .executeTakeFirst<{ status: string }>();
  if (tournament?.status === 'closed') throw tournamentClosedError(field);
}

/** Adds the names of each voucher's category, account and branch, as the list and the tournament report show them. */
export async function enrichTransactions(
  connection: DatabaseConnection,
  rows: FinTransaction[],
) {
  const categories = await connection.query
    .selectFrom('finCategories')
    .select(['id', 'code', 'name', 'type'])
    .execute<{
      id: string;
      code: string;
      name: string;
      type: string;
    }>();
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const accounts = await connection.query
    .selectFrom('finAccounts')
    .select(['id', 'code', 'name'])
    .execute<{ id: string; code: string; name: string }>();
  const accMap = new Map(accounts.map((a) => [a.id, a]));

  const branches = await connection.query
    .selectFrom('finBranches')
    .select(['id', 'code', 'name'])
    .execute<{ id: string; code: string; name: string }>();
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  const tournamentIds = [
    ...new Set(rows.map((r) => r.tournamentId).filter(Boolean)),
  ] as string[];
  const tournaments =
    tournamentIds.length === 0
      ? []
      : await connection.query
          .selectFrom('finTournaments')
          .select(['id', 'code', 'name'])
          .where('id', 'in', tournamentIds)
          .execute<{ id: string; code: string; name: string }>();
  const tournamentMap = new Map(tournaments.map((t) => [t.id, t]));

  return rows.map((r) => {
    const cat = catMap.get(r.categoryId);
    const acc = accMap.get(r.accountId);
    const branch = r.branchId ? branchMap.get(r.branchId) : null;
    return {
      ...normalizeTransaction(r),
      categoryName: cat?.name ?? '',
      categoryCode: cat?.code ?? '',
      accountName: acc?.name ?? '',
      accountCode: acc?.code ?? '',
      branchName: branch?.name ?? (r.branchId ? '' : 'Chung (Toàn công ty)'),
      branchCode: branch?.code ?? '',
      tournamentCode: r.tournamentId
        ? (tournamentMap.get(r.tournamentId)?.code ?? '')
        : '',
      tournamentName: r.tournamentId
        ? (tournamentMap.get(r.tournamentId)?.name ?? '')
        : '',
    };
  });
}

export class FinanceService {
  constructor(private readonly connection: DatabaseConnection) {}

  /**
   * Get financial overview KPIs: total income, total expense, net flow,
   * account balances, branch performance, category breakdown, and timeline.
   */
  async getOverview(query: OverviewQuery) {
    const period = query.period || new Date().toISOString().slice(0, 7);
    const branchId = query.branchId;

    // 1. Transactions in period
    let txQuery = this.connection.query
      .selectFrom('finTransactions')
      .selectAll()
      .where('period', '=', period);

    if (branchId) {
      txQuery = txQuery.where('branchId', '=', branchId);
    }

    const periodTransactions = await txQuery.execute<FinTransaction>();

    let totalIncome = 0;
    let totalExpense = 0;
    for (const tx of periodTransactions) {
      const amt = Number(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amt;
      } else if (tx.type === 'expense') {
        totalExpense += amt;
      }
    }
    const netFlow = totalIncome - totalExpense;

    // 2. All active accounts and their current balances across all time
    const allAccounts = await this.connection.query
      .selectFrom('finAccounts')
      .selectAll()
      .orderBy('kind', 'asc')
      .orderBy('code', 'asc')
      .execute<FinAccount>();

    // Query sum of transactions for each account
    const allTransactions = await this.connection.query
      .selectFrom('finTransactions')
      .select(['accountId', 'type', 'amount'])
      .execute<{
        accountId: string;
        type: string;
        amount: number | string;
      }>();

    const accountTotals = new Map<
      string,
      { income: number; expense: number }
    >();
    for (const tx of allTransactions) {
      const entry = accountTotals.get(tx.accountId) ?? {
        income: 0,
        expense: 0,
      };
      const amt = Number(tx.amount);
      if (tx.type === 'income') entry.income += amt;
      else if (tx.type === 'expense') entry.expense += amt;
      accountTotals.set(tx.accountId, entry);
    }

    let totalAvailableFunds = 0;
    const accountsWithBalance = allAccounts.map((acc) => {
      const totals = accountTotals.get(acc.id) ?? { income: 0, expense: 0 };
      const opening = Number(acc.openingBalance);
      const currentBalance = opening + totals.income - totals.expense;
      const active = toBoolean(acc.active);
      if (active) {
        totalAvailableFunds += currentBalance;
      }
      return {
        ...acc,
        active,
        openingBalance: opening,
        currentBalance,
        totalIncome: totals.income,
        totalExpense: totals.expense,
      };
    });

    // 3. Branches performance in this period
    const allBranches = await this.connection.query
      .selectFrom('finBranches')
      .selectAll()
      .orderBy('code', 'asc')
      .execute<FinBranch>();

    const branchTotals = new Map<string, { income: number; expense: number }>();
    for (const tx of periodTransactions) {
      if (tx.branchId) {
        const entry = branchTotals.get(tx.branchId) ?? {
          income: 0,
          expense: 0,
        };
        const amt = Number(tx.amount);
        if (tx.type === 'income') entry.income += amt;
        else if (tx.type === 'expense') entry.expense += amt;
        branchTotals.set(tx.branchId, entry);
      }
    }

    const branchesWithPerformance = allBranches.map((b) => {
      const totals = branchTotals.get(b.id) ?? { income: 0, expense: 0 };
      return {
        ...normalizeBranch(b),
        totalIncome: totals.income,
        totalExpense: totals.expense,
        netFlow: totals.income - totals.expense,
      };
    });

    // 4. Categories breakdown in this period
    const allCategories = await this.connection.query
      .selectFrom('finCategories')
      .selectAll()
      .orderBy('sort', 'asc')
      .execute<FinCategory>();

    const catTotals = new Map<string, number>();
    for (const tx of periodTransactions) {
      const prev = catTotals.get(tx.categoryId) ?? 0;
      catTotals.set(tx.categoryId, prev + Number(tx.amount));
    }

    const incomeCategories: Array<{
      id: string;
      name: string;
      code: string;
      amount: number;
      percentage: number;
    }> = [];
    const expenseCategories: Array<{
      id: string;
      name: string;
      code: string;
      amount: number;
      percentage: number;
    }> = [];

    for (const cat of allCategories) {
      const amt = catTotals.get(cat.id) ?? 0;
      if (amt > 0) {
        if (cat.type === 'income') {
          incomeCategories.push({
            id: cat.id,
            name: cat.name,
            code: cat.code,
            amount: amt,
            percentage:
              totalIncome > 0 ? Math.round((amt / totalIncome) * 100) : 0,
          });
        } else {
          expenseCategories.push({
            id: cat.id,
            name: cat.name,
            code: cat.code,
            amount: amt,
            percentage:
              totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0,
          });
        }
      }
    }

    // Sort by amount descending
    incomeCategories.sort((a, b) => b.amount - a.amount);
    expenseCategories.sort((a, b) => b.amount - a.amount);

    // 5. Timeline daily flow in period
    const dayTotals = new Map<string, { income: number; expense: number }>();
    for (const tx of periodTransactions) {
      const dateKey = toCalendarDate(tx.date);
      const entry = dayTotals.get(dateKey) ?? { income: 0, expense: 0 };
      const amt = Number(tx.amount);
      if (tx.type === 'income') entry.income += amt;
      else if (tx.type === 'expense') entry.expense += amt;
      dayTotals.set(dateKey, entry);
    }

    const timeline = Array.from(dayTotals.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period,
      branchId: branchId ?? null,
      totalIncome,
      totalExpense,
      netFlow,
      totalAvailableFunds,
      accounts: accountsWithBalance,
      branches: branchesWithPerformance,
      breakdown: {
        income: incomeCategories,
        expense: expenseCategories,
      },
      incomeCategories,
      expenseCategories,
      timeline,
      dailyFlow: timeline,
    };
  }

  /**
   * List transactions with pagination and filters
   */
  async listTransactions(query: ListTransactionsQuery) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const offset = (page - 1) * pageSize;

    let baseQuery = this.connection.query.selectFrom('finTransactions');

    if (query.period) {
      baseQuery = baseQuery.where('period', '=', query.period);
    }
    if (query.branchId) {
      baseQuery = baseQuery.where('branchId', '=', query.branchId);
    }
    if (query.accountId) {
      baseQuery = baseQuery.where('accountId', '=', query.accountId);
    }
    if (query.categoryId) {
      baseQuery = baseQuery.where('categoryId', '=', query.categoryId);
    }
    if (query.type) {
      baseQuery = baseQuery.where('type', '=', query.type);
    }
    if (query.tournamentId) {
      baseQuery = baseQuery.where('tournamentId', '=', query.tournamentId);
    }
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where((eb) =>
        eb.or([
          eb('code', 'like', term),
          eb('counterparty', 'like', term),
          eb('description', 'like', term),
        ]),
      );
    }

    // Count total
    const countResult = await baseQuery
      .select((eb) => [eb.fn.count('id').as('count')])
      .executeTakeFirst();
    const total = Number(countResult?.count || 0);

    // Fetch page rows
    const rows = await baseQuery
      .selectAll()
      .orderBy('date', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute<FinTransaction>();

    const enrichedRows = await enrichTransactions(this.connection, rows);

    return {
      rows: enrichedRows,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Create transaction voucher with atomic counter code:
   * PT-YYYY-0001 (Income) or PC-YYYY-0001 (Expense)
   */
  async createTransaction(
    input: CreateTransactionInput,
    userId: string,
    db: DatabaseConnection = this.connection,
  ) {
    // The year is read from the YYYY-MM-DD text: new Date(text) is UTC midnight, a different year west of UTC on 1 Jan.
    const year = input.date.slice(0, 4);
    const prefix = input.type === 'income' ? 'PT' : 'PC';
    const counterKey = `${prefix}-${year}`;

    const period = input.date.slice(0, 7);

    // References, the voucher number and the voucher are one transaction: a rejected or failed insert must not consume
    // a number from the counter.
    return db.transaction(async (trx) => {
      await assertVoucherReferences(trx, {
        type: input.type,
        categoryId: input.categoryId,
        accountId: input.accountId,
        branchId: input.branchId ?? null,
        tournamentId: input.tournamentId ?? null,
      });

      const existing = await trx.query
        .selectFrom('finCounters')
        .select(['value'])
        .where('key', '=', counterKey)
        .executeTakeFirst();

      let nextSeq = 1;
      if (existing) {
        nextSeq = Number(existing.value) + 1;
        await trx.query
          .updateTable('finCounters')
          .set({ value: nextSeq })
          .where('key', '=', counterKey)
          .execute();
      } else {
        await trx.query
          .insertInto('finCounters')
          .values({ key: counterKey, value: nextSeq })
          .execute();
      }

      const now = new Date();
      const record = {
        id: randomUUID(),
        code: `${counterKey}-${String(nextSeq).padStart(4, '0')}`,
        type: input.type,
        date: input.date,
        period,
        amount: Math.round(Number(input.amount)),
        categoryId: input.categoryId,
        accountId: input.accountId,
        branchId: input.branchId || null,
        counterparty: input.counterparty || null,
        description: input.description || null,
        tournamentId: input.tournamentId || null,
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      };

      await trx.query.insertInto('finTransactions').values(record).execute();

      return record;
    });
  }

  /**
   * Update transaction
   */
  async updateTransaction(
    id: string,
    input: UpdateTransactionInput,
    db: DatabaseConnection = this.connection,
  ) {
    return db.transaction(async (trx) => {
      const existing = await trx.query
        .selectFrom('finTransactions')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!existing) {
        throw new ApiError({
          status: 'NOT_FOUND',
          reason: 'FINANCE_TRANSACTION_NOT_FOUND',
          domain: 'finance',
          message: `Transaction ${id} was not found.`,
        });
      }
      const current = existing as unknown as FinTransaction;
      // A voucher already in a settled tournament is part of its final account: it cannot be edited or moved out.
      await assertTournamentOpen(trx, current.tournamentId);
      // Only references the edit changes are checked, so a voucher whose category or account was retired later can
      // still be corrected in its other fields.
      const changed = (
        field: 'categoryId' | 'accountId' | 'branchId' | 'tournamentId',
      ) =>
        input[field] !== undefined &&
        (input[field] || null) !== (current[field] ?? null)
          ? (input[field] ?? null)
          : undefined;
      await assertVoucherReferences(trx, {
        type: current.type,
        categoryId: changed('categoryId') ?? undefined,
        accountId: changed('accountId') ?? undefined,
        branchId: changed('branchId'),
        tournamentId: changed('tournamentId'),
      });

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.date !== undefined) {
        updates.date = input.date;
        updates.period = input.date.slice(0, 7);
      }
      if (input.amount !== undefined) {
        updates.amount = Math.round(Number(input.amount));
      }
      if (input.categoryId !== undefined) {
        updates.categoryId = input.categoryId;
      }
      if (input.accountId !== undefined) {
        updates.accountId = input.accountId;
      }
      if (input.branchId !== undefined) {
        updates.branchId = input.branchId || null;
      }
      if (input.counterparty !== undefined) {
        updates.counterparty = input.counterparty || null;
      }
      if (input.description !== undefined) {
        updates.description = input.description || null;
      }
      if (input.tournamentId !== undefined) {
        updates.tournamentId = input.tournamentId || null;
      }

      await trx.query
        .updateTable('finTransactions')
        .set(updates)
        .where('id', '=', id)
        .execute();

      return normalizeTransaction({ ...current, ...updates });
    });
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(id: string) {
    const existing = await this.connection.query
      .selectFrom('finTransactions')
      .select(['tournamentId'])
      .where('id', '=', id)
      .executeTakeFirst<{ tournamentId: string | null }>();
    // Deleting a voucher of a settled tournament would change its final account as much as editing it.
    await assertTournamentOpen(this.connection, existing?.tournamentId);
    await this.connection.query
      .deleteFrom('finTransactions')
      .where('id', '=', id)
      .execute();
    return { success: true, id };
  }

  /**
   * Accounts CRUD
   */
  async listAccounts() {
    const accounts = await this.connection.query
      .selectFrom('finAccounts')
      .selectAll()
      .orderBy('kind', 'asc')
      .orderBy('code', 'asc')
      .execute<FinAccount>();

    const txs = await this.connection.query
      .selectFrom('finTransactions')
      .select(['accountId', 'type', 'amount'])
      .execute<{
        accountId: string;
        type: string;
        amount: number | string;
      }>();

    const totals = new Map<string, { income: number; expense: number }>();
    for (const tx of txs) {
      const entry = totals.get(tx.accountId) ?? { income: 0, expense: 0 };
      const amt = Number(tx.amount);
      if (tx.type === 'income') entry.income += amt;
      else if (tx.type === 'expense') entry.expense += amt;
      totals.set(tx.accountId, entry);
    }

    return accounts.map((acc) => {
      const t = totals.get(acc.id) ?? { income: 0, expense: 0 };
      const opening = Number(acc.openingBalance);
      return {
        ...acc,
        active: toBoolean(acc.active),
        openingBalance: opening,
        totalIncome: t.income,
        totalExpense: t.expense,
        currentBalance: opening + t.income - t.expense,
      };
    });
  }

  async createAccount(
    input: {
      code: string;
      name: string;
      kind: string;
      bankName?: string | null;
      accountNumber?: string | null;
      openingBalance?: number;
      active?: boolean;
      note?: string | null;
    },
    db: DatabaseConnection = this.connection,
  ) {
    const id = randomUUID();
    const record = {
      id,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      kind: input.kind,
      bankName: input.bankName?.trim() || null,
      accountNumber: input.accountNumber?.trim() || null,
      openingBalance: Math.round(Number(input.openingBalance || 0)),
      active: input.active !== false,
      note: input.note?.trim() || null,
    };
    await db.query.insertInto('finAccounts').values(record).execute();
    return record;
  }

  async updateAccount(
    id: string,
    input: {
      name?: string;
      kind?: string;
      bankName?: string | null;
      accountNumber?: string | null;
      openingBalance?: number;
      active?: boolean;
      note?: string | null;
    },
    db: DatabaseConnection = this.connection,
  ) {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.kind !== undefined) updates.kind = input.kind;
    if (input.bankName !== undefined)
      updates.bankName = input.bankName?.trim() || null;
    if (input.accountNumber !== undefined)
      updates.accountNumber = input.accountNumber?.trim() || null;
    if (input.openingBalance !== undefined)
      updates.openingBalance = Math.round(Number(input.openingBalance));
    if (input.active !== undefined) updates.active = Boolean(input.active);
    if (input.note !== undefined) updates.note = input.note?.trim() || null;

    await db.query
      .updateTable('finAccounts')
      .set(updates)
      .where('id', '=', id)
      .execute();

    return { id, ...updates };
  }

  /**
   * Branches CRUD
   */
  async listBranches() {
    const rows = await this.connection.query
      .selectFrom('finBranches')
      .selectAll()
      .orderBy('code', 'asc')
      .execute<FinBranch>();
    return rows.map(normalizeBranch);
  }

  async createBranch(
    input: {
      code: string;
      name: string;
      kind: string;
      active?: boolean;
      note?: string | null;
    },
    db: DatabaseConnection = this.connection,
  ) {
    const id = randomUUID();
    const record = {
      id,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      kind: input.kind,
      active: input.active !== false,
      note: input.note?.trim() || null,
    };
    await db.query.insertInto('finBranches').values(record).execute();
    return record;
  }

  async updateBranch(
    id: string,
    input: {
      name?: string;
      kind?: string;
      active?: boolean;
      note?: string | null;
    },
    db: DatabaseConnection = this.connection,
  ) {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.kind !== undefined) updates.kind = input.kind;
    if (input.active !== undefined) updates.active = Boolean(input.active);
    if (input.note !== undefined) updates.note = input.note?.trim() || null;

    await db.query
      .updateTable('finBranches')
      .set(updates)
      .where('id', '=', id)
      .execute();

    return { id, ...updates };
  }

  /**
   * Categories CRUD
   */
  async listCategories(type?: 'income' | 'expense') {
    let q = this.connection.query.selectFrom('finCategories').selectAll();
    if (type) {
      q = q.where('type', '=', type);
    }
    const rows = await q
      .orderBy('type', 'asc')
      .orderBy('sort', 'asc')
      .execute<FinCategory>();
    return rows.map(normalizeCategory);
  }

  async createCategory(
    input: {
      code: string;
      name: string;
      type: string;
      sort?: number;
      active?: boolean;
    },
    db: DatabaseConnection = this.connection,
  ) {
    const id = randomUUID();
    const record = {
      id,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      type: input.type,
      sort: Number(input.sort || 0),
      active: input.active !== false,
    };
    await db.query.insertInto('finCategories').values(record).execute();
    return record;
  }

  async updateCategory(
    id: string,
    input: {
      name?: string;
      type?: string;
      sort?: number;
      active?: boolean;
    },
    db: DatabaseConnection = this.connection,
  ) {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.type !== undefined) updates.type = input.type;
    if (input.sort !== undefined) updates.sort = Number(input.sort);
    if (input.active !== undefined) updates.active = Boolean(input.active);

    await db.query
      .updateTable('finCategories')
      .set(updates)
      .where('id', '=', id)
      .execute();

    return { id, ...updates };
  }

  /**
   * Options for transaction form: active branches, active accounts, active categories
   */
  async getOptions() {
    const branches = await this.connection.query
      .selectFrom('finBranches')
      .select(['id', 'code', 'name'])
      .where('active', '=', true)
      .orderBy('code', 'asc')
      .execute<{ id: string; code: string; name: string }>();

    const accounts = await this.connection.query
      .selectFrom('finAccounts')
      .select(['id', 'code', 'name', 'kind', 'bankName', 'accountNumber'])
      .where('active', '=', true)
      .orderBy('code', 'asc')
      .execute<{
        id: string;
        code: string;
        name: string;
        kind: string;
        bankName: string | null;
        accountNumber: string | null;
      }>();

    const categories = await this.connection.query
      .selectFrom('finCategories')
      .select(['id', 'code', 'name', 'type', 'sort'])
      .where('active', '=', true)
      .orderBy('type', 'asc')
      .orderBy('sort', 'asc')
      .execute<{
        id: string;
        code: string;
        name: string;
        type: string;
        sort: number;
      }>();

    // Tournaments a voucher may still be linked to. Part of the voucher form's options, so tagging a voucher needs
    // only the voucher permission (docs/plans/2026-11-21-tai-chinh-giai-dau.md, "Quyền").
    const tournaments = await this.connection.query
      .selectFrom('finTournaments')
      .select(['id', 'code', 'name', 'branchId', 'status'])
      .where('status', '!=', 'closed')
      .orderBy('startDate', 'desc')
      .orderBy('code', 'desc')
      .execute<{
        id: string;
        code: string;
        name: string;
        branchId: string | null;
        status: string;
      }>();

    return {
      branches,
      accounts,
      categories: categories.map((c) => ({ ...c, sort: Number(c.sort) })),
      tournaments,
    };
  }
}
