import { randomUUID } from 'node:crypto';
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
}

export interface UpdateTransactionInput {
  date?: string;
  amount?: number | string;
  categoryId?: string;
  accountId?: string;
  branchId?: string | null;
  counterparty?: string | null;
  description?: string | null;
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

    const periodTransactions = (await txQuery.execute()) as FinTransaction[];

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
    const allAccounts = (await this.connection.query
      .selectFrom('finAccounts')
      .selectAll()
      .orderBy('kind', 'asc')
      .orderBy('code', 'asc')
      .execute()) as FinAccount[];

    // Query sum of transactions for each account
    const allTransactions = (await this.connection.query
      .selectFrom('finTransactions')
      .select(['accountId', 'type', 'amount'])
      .execute()) as Array<{ accountId: string; type: string; amount: number | string }>;

    const accountTotals = new Map<string, { income: number; expense: number }>();
    for (const tx of allTransactions) {
      const entry = accountTotals.get(tx.accountId) ?? { income: 0, expense: 0 };
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
      if (acc.active) {
        totalAvailableFunds += currentBalance;
      }
      return {
        ...acc,
        openingBalance: opening,
        currentBalance,
        totalIncome: totals.income,
        totalExpense: totals.expense,
      };
    });

    // 3. Branches performance in this period
    const allBranches = (await this.connection.query
      .selectFrom('finBranches')
      .selectAll()
      .orderBy('code', 'asc')
      .execute()) as FinBranch[];

    const branchTotals = new Map<string, { income: number; expense: number }>();
    for (const tx of periodTransactions) {
      if (tx.branchId) {
        const entry = branchTotals.get(tx.branchId) ?? { income: 0, expense: 0 };
        const amt = Number(tx.amount);
        if (tx.type === 'income') entry.income += amt;
        else if (tx.type === 'expense') entry.expense += amt;
        branchTotals.set(tx.branchId, entry);
      }
    }

    const branchesWithPerformance = allBranches.map((b) => {
      const totals = branchTotals.get(b.id) ?? { income: 0, expense: 0 };
      return {
        ...b,
        totalIncome: totals.income,
        totalExpense: totals.expense,
        netFlow: totals.income - totals.expense,
      };
    });

    // 4. Categories breakdown in this period
    const allCategories = (await this.connection.query
      .selectFrom('finCategories')
      .selectAll()
      .orderBy('sort', 'asc')
      .execute()) as FinCategory[];

    const catTotals = new Map<string, number>();
    for (const tx of periodTransactions) {
      const prev = catTotals.get(tx.categoryId) ?? 0;
      catTotals.set(tx.categoryId, prev + Number(tx.amount));
    }

    const incomeCategories: Array<{ id: string; name: string; code: string; amount: number; percentage: number }> = [];
    const expenseCategories: Array<{ id: string; name: string; code: string; amount: number; percentage: number }> = [];

    for (const cat of allCategories) {
      const amt = catTotals.get(cat.id) ?? 0;
      if (amt > 0) {
        if (cat.type === 'income') {
          incomeCategories.push({
            id: cat.id,
            name: cat.name,
            code: cat.code,
            amount: amt,
            percentage: totalIncome > 0 ? Math.round((amt / totalIncome) * 100) : 0,
          });
        } else {
          expenseCategories.push({
            id: cat.id,
            name: cat.name,
            code: cat.code,
            amount: amt,
            percentage: totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0,
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
      const dateKey = typeof tx.date === 'string' ? tx.date : new Date(tx.date as any).toISOString().slice(0, 10);
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
    const rows = (await baseQuery
      .selectAll()
      .orderBy('date', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute()) as FinTransaction[];

    // Enrich with names
    const categories = (await this.connection.query
      .selectFrom('finCategories')
      .select(['id', 'code', 'name', 'type'])
      .execute()) as Array<{ id: string; code: string; name: string; type: string }>;
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const accounts = (await this.connection.query
      .selectFrom('finAccounts')
      .select(['id', 'code', 'name', 'kind', 'bankName', 'accountNumber'])
      .execute()) as Array<{ id: string; code: string; name: string; kind: string; bankName: string | null; accountNumber: string | null }>;
    const accMap = new Map(accounts.map((a) => [a.id, a]));

    const branches = (await this.connection.query
      .selectFrom('finBranches')
      .select(['id', 'code', 'name'])
      .execute()) as Array<{ id: string; code: string; name: string }>;
    const branchMap = new Map(branches.map((b) => [b.id, b]));

    const enrichedRows = rows.map((r) => {
      const cat = catMap.get(r.categoryId);
      const acc = accMap.get(r.accountId);
      const branch = r.branchId ? branchMap.get(r.branchId) : null;
      const dateStr = typeof r.date === 'string' ? r.date : new Date(r.date as any).toISOString().slice(0, 10);
      return {
        ...r,
        amount: Number(r.amount),
        date: dateStr,
        transactionDate: dateStr,
        categoryName: cat?.name ?? '',
        categoryCode: cat?.code ?? '',
        accountName: acc?.name ?? '',
        accountCode: acc?.code ?? '',
        branchName: branch?.name ?? (r.branchId ? '' : 'Chung (Toàn công ty)'),
        branchCode: branch?.code ?? '',
      };
    });

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
  async createTransaction(input: CreateTransactionInput, userId: string) {
    const year = new Date(input.date).getFullYear();
    const prefix = input.type === 'income' ? 'PT' : 'PC';
    const counterKey = `${prefix}-${year}`;

    // Atomically increment counter in transaction
    const nextSeq = await this.connection.transaction(async (trx) => {
      const existing = await trx.query
        .selectFrom('finCounters')
        .select(['value'])
        .where('key', '=', counterKey)
        .executeTakeFirst();

      let val = 1;
      if (existing) {
        val = Number(existing.value) + 1;
        await trx.query
          .updateTable('finCounters')
          .set({ value: val })
          .where('key', '=', counterKey)
          .execute();
      } else {
        await trx.query
          .insertInto('finCounters')
          .values({ key: counterKey, value: val })
          .execute();
      }
      return val;
    });

    const code = `${counterKey}-${String(nextSeq).padStart(4, '0')}`;
    const id = randomUUID();
    const now = new Date();
    const period = input.date.slice(0, 7);

    const record = {
      id,
      code,
      type: input.type,
      date: input.date,
      period,
      amount: Math.round(Number(input.amount)),
      categoryId: input.categoryId,
      accountId: input.accountId,
      branchId: input.branchId || null,
      counterparty: input.counterparty || null,
      description: input.description || null,
      createdById: userId,
      createdAt: now,
      updatedAt: now,
    };

    await this.connection.query
      .insertInto('finTransactions')
      .values(record)
      .execute();

    return record;
  }

  /**
   * Update transaction
   */
  async updateTransaction(id: string, input: UpdateTransactionInput) {
    const existing = await this.connection.query
      .selectFrom('finTransactions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new Error(`Transaction ${id} not found`);
    }

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

    await this.connection.query
      .updateTable('finTransactions')
      .set(updates)
      .where('id', '=', id)
      .execute();

    return { ...existing, ...updates };
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(id: string) {
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
    const accounts = (await this.connection.query
      .selectFrom('finAccounts')
      .selectAll()
      .orderBy('kind', 'asc')
      .orderBy('code', 'asc')
      .execute()) as FinAccount[];

    const txs = (await this.connection.query
      .selectFrom('finTransactions')
      .select(['accountId', 'type', 'amount'])
      .execute()) as Array<{ accountId: string; type: string; amount: number | string }>;

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
        openingBalance: opening,
        totalIncome: t.income,
        totalExpense: t.expense,
        currentBalance: opening + t.income - t.expense,
      };
    });
  }

  async createAccount(input: {
    code: string;
    name: string;
    kind: string;
    bankName?: string | null;
    accountNumber?: string | null;
    openingBalance?: number;
    active?: boolean;
    note?: string | null;
  }) {
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
    await this.connection.query.insertInto('finAccounts').values(record).execute();
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
  ) {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.kind !== undefined) updates.kind = input.kind;
    if (input.bankName !== undefined) updates.bankName = input.bankName?.trim() || null;
    if (input.accountNumber !== undefined) updates.accountNumber = input.accountNumber?.trim() || null;
    if (input.openingBalance !== undefined) updates.openingBalance = Math.round(Number(input.openingBalance));
    if (input.active !== undefined) updates.active = Boolean(input.active);
    if (input.note !== undefined) updates.note = input.note?.trim() || null;

    await this.connection.query
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
    return this.connection.query
      .selectFrom('finBranches')
      .selectAll()
      .orderBy('code', 'asc')
      .execute();
  }

  async createBranch(input: {
    code: string;
    name: string;
    kind: string;
    active?: boolean;
    note?: string | null;
  }) {
    const id = randomUUID();
    const record = {
      id,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      kind: input.kind,
      active: input.active !== false,
      note: input.note?.trim() || null,
    };
    await this.connection.query.insertInto('finBranches').values(record).execute();
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
  ) {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.kind !== undefined) updates.kind = input.kind;
    if (input.active !== undefined) updates.active = Boolean(input.active);
    if (input.note !== undefined) updates.note = input.note?.trim() || null;

    await this.connection.query
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
    return q.orderBy('type', 'asc').orderBy('sort', 'asc').execute();
  }

  async createCategory(input: {
    code: string;
    name: string;
    type: string;
    sort?: number;
    active?: boolean;
  }) {
    const id = randomUUID();
    const record = {
      id,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      type: input.type,
      sort: Number(input.sort || 0),
      active: input.active !== false,
    };
    await this.connection.query.insertInto('finCategories').values(record).execute();
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
  ) {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.type !== undefined) updates.type = input.type;
    if (input.sort !== undefined) updates.sort = Number(input.sort);
    if (input.active !== undefined) updates.active = Boolean(input.active);

    await this.connection.query
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
    const branches = (await this.connection.query
      .selectFrom('finBranches')
      .select(['id', 'code', 'name'])
      .where('active', '=', true)
      .orderBy('code', 'asc')
      .execute()) as Array<{ id: string; code: string; name: string }>;

    const accounts = (await this.connection.query
      .selectFrom('finAccounts')
      .select(['id', 'code', 'name', 'kind', 'bankName', 'accountNumber'])
      .where('active', '=', true)
      .orderBy('code', 'asc')
      .execute()) as Array<{ id: string; code: string; name: string; kind: string; bankName: string | null; accountNumber: string | null }>;

    const categories = (await this.connection.query
      .selectFrom('finCategories')
      .select(['id', 'code', 'name', 'type', 'sort'])
      .where('active', '=', true)
      .orderBy('type', 'asc')
      .orderBy('sort', 'asc')
      .execute()) as Array<{ id: string; code: string; name: string; type: string; sort: number }>;

    return {
      branches,
      accounts,
      categories,
    };
  }
}
