import { randomUUID } from 'node:crypto';
import { ApiError } from '@nocobase/app-server/router';
import type { DatabaseConnection } from '@nocobase/db';

import type {
  FinTournament,
  FinTournamentBudget,
  FinTransaction,
  TournamentStatus,
} from './resources.js';
import {
  enrichTransactions,
  toCalendarDate,
  tournamentClosedError,
} from './service.js';

// Tournament finance (phase 3, docs/plans/2026-11-21-tai-chinh-giai-dau.md). A tournament groups ordinary vouchers
// (finTransactions.tournamentId) and carries a budget per category. Like FinanceService, everything leaving this
// module is normalized — numbers as numbers, calendar dates as YYYY-MM-DD — so SQLite and Postgres answer alike.

export const tournamentStatuses = ['planning', 'ongoing', 'closed'] as const;

export interface CreateTournamentInput {
  name: string;
  startDate: string;
  endDate?: string | null;
  branchId?: string | null;
  venue?: string | null;
  status?: TournamentStatus;
  note?: string | null;
}

export type UpdateTournamentInput = Partial<CreateTournamentInput>;

export interface BudgetLineInput {
  categoryId: string;
  amount: number;
}

const notFound = (id: string) =>
  new ApiError({
    status: 'NOT_FOUND',
    reason: 'FINANCE_TOURNAMENT_NOT_FOUND',
    domain: 'finance',
    message: `Tournament ${id} was not found.`,
  });

const invalid = (
  reason: string,
  message: string,
  fieldViolations: Array<{ field: string; description: string }>,
) =>
  new ApiError({
    status: 'INVALID_ARGUMENT',
    reason,
    domain: 'finance',
    message,
    fieldViolations,
  });

const normalizeTournament = (row: FinTournament) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  startDate: toCalendarDate(row.startDate),
  endDate: row.endDate ? toCalendarDate(row.endDate) : null,
  branchId: row.branchId ?? null,
  venue: row.venue ?? null,
  status: row.status,
  note: row.note ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const assertDateRange = (startDate: string, endDate: string | null) => {
  if (endDate && endDate < startDate)
    throw invalid(
      'FINANCE_TOURNAMENT_DATES_INVALID',
      'The end date is before the start date.',
      [{ field: 'endDate', description: 'Must not be before startDate.' }],
    );
};

async function assertBranch(
  connection: DatabaseConnection,
  branchId: string | null | undefined,
) {
  if (!branchId) return;
  const branch = await connection.query
    .selectFrom('finBranches')
    .select(['id'])
    .where('id', '=', branchId)
    .executeTakeFirst();
  if (!branch)
    throw invalid(
      'FINANCE_TOURNAMENT_REFERENCE_INVALID',
      'The tournament names a missing branch.',
      [{ field: 'branchId', description: 'Must name an existing branch.' }],
    );
}

/** Totals of a tournament's vouchers and budget, keyed by tournament. */
async function totalsByTournament(
  connection: DatabaseConnection,
  tournamentIds: readonly string[],
) {
  const totals = new Map<
    string,
    {
      totalIncome: number;
      totalExpense: number;
      budgetIncome: number;
      budgetExpense: number;
      voucherCount: number;
    }
  >();
  for (const id of tournamentIds)
    totals.set(id, {
      totalIncome: 0,
      totalExpense: 0,
      budgetIncome: 0,
      budgetExpense: 0,
      voucherCount: 0,
    });
  if (tournamentIds.length === 0) return totals;

  const vouchers = await connection.query
    .selectFrom('finTransactions')
    .select(['tournamentId', 'type', 'amount'])
    .where('tournamentId', 'in', [...tournamentIds])
    .execute<{ tournamentId: string; type: string; amount: unknown }>();
  for (const voucher of vouchers) {
    const entry = totals.get(voucher.tournamentId);
    if (!entry) continue;
    entry.voucherCount += 1;
    if (voucher.type === 'income') entry.totalIncome += Number(voucher.amount);
    else if (voucher.type === 'expense')
      entry.totalExpense += Number(voucher.amount);
  }

  const budgets = await connection.query
    .selectFrom('finTournamentBudgets')
    .innerJoin(
      'finCategories',
      'finCategories.id',
      'finTournamentBudgets.categoryId',
    )
    .select([
      'finTournamentBudgets.tournamentId as tournamentId',
      'finTournamentBudgets.amount as amount',
      'finCategories.type as type',
    ])
    .where('finTournamentBudgets.tournamentId', 'in', [...tournamentIds])
    .execute<{ tournamentId: string; amount: unknown; type: string }>();
  for (const budget of budgets) {
    const entry = totals.get(budget.tournamentId);
    if (!entry) continue;
    if (budget.type === 'income') entry.budgetIncome += Number(budget.amount);
    else entry.budgetExpense += Number(budget.amount);
  }
  return totals;
}

/** What share of the expense budget has been spent, as a whole percentage; null without an expense budget. */
const spentRatio = (totalExpense: number, budgetExpense: number) =>
  budgetExpense > 0 ? Math.round((totalExpense / budgetExpense) * 100) : null;

export class TournamentService {
  constructor(private readonly connection: DatabaseConnection) {}

  private async branchNames(connection: DatabaseConnection) {
    const branches = await connection.query
      .selectFrom('finBranches')
      .select(['id', 'name'])
      .execute<{ id: string; name: string }>();
    return new Map(branches.map((b) => [b.id, b.name]));
  }

  private async load(connection: DatabaseConnection, id: string) {
    const row = await connection.query
      .selectFrom('finTournaments')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst<FinTournament>();
    if (!row) throw notFound(id);
    return row;
  }

  /** GET finance/tournaments: every tournament with its receipts, payments and result. */
  async listTournaments(query: { status?: TournamentStatus } = {}) {
    let q = this.connection.query.selectFrom('finTournaments').selectAll();
    if (query.status) q = q.where('status', '=', query.status);
    const rows = await q
      .orderBy('startDate', 'desc')
      .orderBy('code', 'desc')
      .execute<FinTournament>();
    const totals = await totalsByTournament(
      this.connection,
      rows.map((row) => row.id),
    );
    const branches = await this.branchNames(this.connection);
    return rows.map((row) => {
      const t = totals.get(row.id)!;
      return {
        ...normalizeTournament(row),
        branchName: row.branchId ? (branches.get(row.branchId) ?? '') : null,
        totalIncome: t.totalIncome,
        totalExpense: t.totalExpense,
        net: t.totalIncome - t.totalExpense,
        budgetIncome: t.budgetIncome,
        budgetExpense: t.budgetExpense,
        voucherCount: t.voucherCount,
      };
    });
  }

  /** POST finance/tournaments: the code GD-YYYY-NN comes from the start date's year, in the same transaction. */
  async createTournament(
    input: CreateTournamentInput,
    db: DatabaseConnection = this.connection,
  ) {
    const endDate = input.endDate || null;
    assertDateRange(input.startDate, endDate);
    return db.transaction(async (trx) => {
      await assertBranch(trx, input.branchId);
      // The year is read from the YYYY-MM-DD text, never through Date (time zones).
      const counterKey = `GD-${input.startDate.slice(0, 4)}`;
      const counter = await trx.query
        .selectFrom('finCounters')
        .select(['value'])
        .where('key', '=', counterKey)
        .executeTakeFirst<{ value: unknown }>();
      const next = counter ? Number(counter.value) + 1 : 1;
      if (counter)
        await trx.query
          .updateTable('finCounters')
          .set({ value: next })
          .where('key', '=', counterKey)
          .execute();
      else
        await trx.query
          .insertInto('finCounters')
          .values({ key: counterKey, value: next })
          .execute();

      const now = new Date();
      const record = {
        id: randomUUID(),
        code: `${counterKey}-${String(next).padStart(2, '0')}`,
        name: input.name.trim(),
        startDate: input.startDate,
        endDate,
        branchId: input.branchId || null,
        venue: input.venue?.trim() || null,
        status: input.status ?? 'planning',
        note: input.note?.trim() || null,
        createdAt: now,
        updatedAt: now,
      };
      await trx.query.insertInto('finTournaments').values(record).execute();
      return normalizeTournament(record);
    });
  }

  /**
   * PATCH finance/tournaments/:id. A settled (closed) tournament accepts only a status change, which reopens it;
   * its other details are part of the final account.
   */
  async updateTournament(
    id: string,
    input: UpdateTournamentInput,
    db: DatabaseConnection = this.connection,
  ) {
    return db.transaction(async (trx) => {
      const current = await this.load(trx, id);
      const changesOtherThanStatus = Object.entries(input).some(
        ([field, value]) => field !== 'status' && value !== undefined,
      );
      const reopening = input.status !== undefined && input.status !== 'closed';
      if (current.status === 'closed' && changesOtherThanStatus && !reopening)
        throw tournamentClosedError('status');

      const startDate = input.startDate ?? toCalendarDate(current.startDate);
      const endDate =
        input.endDate !== undefined
          ? input.endDate || null
          : current.endDate
            ? toCalendarDate(current.endDate)
            : null;
      assertDateRange(startDate, endDate);
      if (input.branchId !== undefined) await assertBranch(trx, input.branchId);

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) updates.name = input.name.trim();
      if (input.startDate !== undefined) updates.startDate = input.startDate;
      if (input.endDate !== undefined) updates.endDate = endDate;
      if (input.branchId !== undefined)
        updates.branchId = input.branchId || null;
      if (input.venue !== undefined)
        updates.venue = input.venue?.trim() || null;
      if (input.status !== undefined) updates.status = input.status;
      if (input.note !== undefined) updates.note = input.note?.trim() || null;

      await trx.query
        .updateTable('finTournaments')
        .set(updates)
        .where('id', '=', id)
        .execute();
      return normalizeTournament({ ...current, ...updates });
    });
  }

  /**
   * PUT finance/tournaments/:id/budgets: replaces the whole budget. A line of 0 removes its category from the
   * budget; each category appears at most once and must exist.
   */
  async saveBudgets(
    id: string,
    lines: readonly BudgetLineInput[],
    db: DatabaseConnection = this.connection,
  ) {
    const seen = new Set<string>();
    const duplicates = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => {
        if (seen.has(line.categoryId)) return true;
        seen.add(line.categoryId);
        return false;
      });
    if (duplicates.length > 0)
      throw invalid(
        'FINANCE_TOURNAMENT_BUDGET_INVALID',
        'A category appears more than once in the budget.',
        duplicates.map(({ index }) => ({
          field: `budgets[${index}].categoryId`,
          description: 'Each category may appear once.',
        })),
      );

    return db.transaction(async (trx) => {
      const tournament = await this.load(trx, id);
      if (tournament.status === 'closed') throw tournamentClosedError('status');

      const ids = lines.map((line) => line.categoryId);
      const known =
        ids.length === 0
          ? []
          : await trx.query
              .selectFrom('finCategories')
              .select(['id'])
              .where('id', 'in', ids)
              .execute<{ id: string }>();
      const knownIds = new Set(known.map((row) => row.id));
      const missing = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => !knownIds.has(line.categoryId));
      if (missing.length > 0)
        throw invalid(
          'FINANCE_TOURNAMENT_BUDGET_INVALID',
          'The budget names a missing category.',
          missing.map(({ index }) => ({
            field: `budgets[${index}].categoryId`,
            description: 'Must name an existing category.',
          })),
        );

      await trx.query
        .deleteFrom('finTournamentBudgets')
        .where('tournamentId', '=', id)
        .execute();
      const rows = lines
        .filter((line) => Math.round(line.amount) > 0)
        .map((line) => ({
          id: randomUUID(),
          tournamentId: id,
          categoryId: line.categoryId,
          amount: Math.round(line.amount),
        }));
      if (rows.length > 0)
        await trx.query
          .insertInto('finTournamentBudgets')
          .values(rows)
          .execute();
      await trx.query
        .updateTable('finTournaments')
        .set({ updatedAt: new Date() })
        .where('id', '=', id)
        .execute();
      return rows.map((row) => ({ ...row }));
    });
  }

  /**
   * GET finance/tournaments/:id: the tournament, budget against actual per category, the totals and its vouchers.
   */
  async getReport(id: string) {
    const tournament = await this.load(this.connection, id);
    const [totals, branches] = await Promise.all([
      totalsByTournament(this.connection, [id]),
      this.branchNames(this.connection),
    ]);
    const t = totals.get(id)!;

    const budgets = await this.connection.query
      .selectFrom('finTournamentBudgets')
      .selectAll()
      .where('tournamentId', '=', id)
      .execute<FinTournamentBudget>();
    const vouchers = await this.connection.query
      .selectFrom('finTransactions')
      .selectAll()
      .where('tournamentId', '=', id)
      .orderBy('date', 'desc')
      .orderBy('createdAt', 'desc')
      .execute<FinTransaction>();
    const categories = await this.connection.query
      .selectFrom('finCategories')
      .select(['id', 'code', 'name', 'type', 'sort'])
      .execute<{
        id: string;
        code: string;
        name: string;
        type: string;
        sort: unknown;
      }>();

    const lines = new Map<string, { budget: number; actual: number }>();
    for (const budget of budgets)
      lines.set(budget.categoryId, {
        budget: Number(budget.amount),
        actual: 0,
      });
    for (const voucher of vouchers) {
      const line = lines.get(voucher.categoryId) ?? { budget: 0, actual: 0 };
      line.actual += Number(voucher.amount);
      lines.set(voucher.categoryId, line);
    }
    const categoryRows = categories
      .filter((category) => lines.has(category.id))
      // Income lines first, then expense, each in the category dictionary's order.
      .sort(
        (a, b) =>
          Number(a.type !== 'income') - Number(b.type !== 'income') ||
          Number(a.sort) - Number(b.sort),
      )
      .map((category) => {
        const line = lines.get(category.id)!;
        const variance = line.actual - line.budget;
        return {
          categoryId: category.id,
          categoryCode: category.code,
          categoryName: category.name,
          type: category.type as 'income' | 'expense',
          budget: line.budget,
          actual: line.actual,
          // Actual minus budget: above zero is more received (income) or more spent (expense) than planned.
          variance,
          // Only spending can run over its budget.
          overBudget: category.type === 'expense' && variance > 0,
        };
      });

    return {
      tournament: {
        ...normalizeTournament(tournament),
        branchName: tournament.branchId
          ? (branches.get(tournament.branchId) ?? '')
          : null,
      },
      totals: {
        totalIncome: t.totalIncome,
        totalExpense: t.totalExpense,
        net: t.totalIncome - t.totalExpense,
        budgetIncome: t.budgetIncome,
        budgetExpense: t.budgetExpense,
        budgetNet: t.budgetIncome - t.budgetExpense,
        expenseRatio: spentRatio(t.totalExpense, t.budgetExpense),
        voucherCount: t.voucherCount,
      },
      categories: categoryRows,
      vouchers: await enrichTransactions(this.connection, vouchers),
    };
  }

  /** Whether a tournament exists, for replaying a write on it. */
  async exists(id: string) {
    const row = await this.connection.query
      .selectFrom('finTournaments')
      .select(['id'])
      .where('id', '=', id)
      .executeTakeFirst();
    return Boolean(row);
  }
}
