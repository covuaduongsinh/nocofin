import path from 'node:path';
import { describeMigration } from '@nocobase/app-testing/server';
import { expect } from 'vitest';

const now = new Date('2026-11-21T03:00:00.000Z');

describeMigration('202611210001_create_tournaments', {
  sources: [
    {
      packageName: 'finance-test',
      directory: path.resolve(
        import.meta.dirname,
        '../../database/main/migrations',
      ),
    },
  ],
  // A voucher recorded before the tournaments existed must survive the column being added and removed.
  before: async ({ connection }) => {
    await connection.query
      .insertInto('finCategories')
      .values({
        id: 'c1',
        code: 'CHI-01',
        name: 'Giải thưởng',
        type: 'expense',
        sort: 1,
        active: true,
      })
      .execute();
    await connection.query
      .insertInto('finAccounts')
      .values({
        id: 'a1',
        code: 'TM',
        name: 'Tiền mặt',
        kind: 'cash',
        openingBalance: 0,
        active: true,
      })
      .execute();
    await connection.query
      .insertInto('finTransactions')
      .values({
        id: 'old-voucher',
        code: 'PC-2026-0001',
        type: 'expense',
        date: '2026-11-01',
        period: '2026-11',
        amount: 100000,
        categoryId: 'c1',
        accountId: 'a1',
        createdById: 'u1',
        createdAt: now,
        updatedAt: now,
      })
      .execute();
  },
  up: async ({ connection, expectCollection }) => {
    await expectCollection('finTournaments').toExist();
    await expectCollection('finTournamentBudgets').toExist();
    await expectCollection('finTournaments').toHaveField('endDate', {
      nullable: true,
    });
    await expectCollection('finTournaments').toHaveForeignKey(
      ['branchId'],
      'finBranches',
    );
    await expectCollection('finTournamentBudgets').toHaveIndex(
      ['tournamentId', 'categoryId'],
      { unique: true },
    );
    await expectCollection('finTournamentBudgets').toHaveForeignKey(
      ['categoryId'],
      'finCategories',
    );
    await expectCollection('finTransactions').toHaveField('tournamentId', {
      nullable: true,
    });
    await expectCollection('finTransactions').toHaveIndex(['tournamentId']);
    await expectCollection('finTransactions').toHaveForeignKey(
      ['tournamentId'],
      'finTournaments',
    );

    // The voucher written before is still there, belonging to no tournament.
    const old = await connection.query
      .selectFrom('finTransactions')
      .select(['id', 'tournamentId'])
      .where('id', '=', 'old-voucher')
      .executeTakeFirst();
    expect(old).toEqual({ id: 'old-voucher', tournamentId: null });

    const tournament = {
      id: 't1',
      code: 'GD-2026-01',
      name: 'Giải cờ vua mùa đông',
      startDate: '2026-12-01',
      status: 'planning',
      createdAt: now,
      updatedAt: now,
    };
    await connection.query
      .insertInto('finTournaments')
      .values(tournament)
      .execute();
    // A tournament code identifies one tournament.
    await expect(
      connection.query
        .insertInto('finTournaments')
        .values({ ...tournament, id: 't2' })
        .execute(),
    ).rejects.toThrow();

    const budget = {
      id: 'b1',
      tournamentId: 't1',
      categoryId: 'c1',
      amount: 5,
    };
    await connection.query
      .insertInto('finTournamentBudgets')
      .values(budget)
      .execute();
    // One budget line per category of a tournament.
    await expect(
      connection.query
        .insertInto('finTournamentBudgets')
        .values({ ...budget, id: 'b2' })
        .execute(),
    ).rejects.toThrow();

    await connection.query
      .updateTable('finTransactions')
      .set({ tournamentId: 't1' })
      .where('id', '=', 'old-voucher')
      .execute();
    // Clean up so the rollback check compares the tables against what they were before.
    await connection.query
      .updateTable('finTransactions')
      .set({ tournamentId: null })
      .where('id', '=', 'old-voucher')
      .execute();
    await connection.query
      .deleteFrom('finTournamentBudgets')
      .where('tournamentId', '=', 't1')
      .execute();
    await connection.query
      .deleteFrom('finTournaments')
      .where('id', '=', 't1')
      .execute();
  },
  down: async ({ connection, expectCollection }) => {
    await expectCollection('finTournaments').not.toExist();
    await expectCollection('finTournamentBudgets').not.toExist();
    await expectCollection('finTransactions').not.toHaveField('tournamentId');
    const old = await connection.query
      .selectFrom('finTransactions')
      .select(['id', 'amount'])
      .where('id', '=', 'old-voucher')
      .executeTakeFirst();
    expect(Number(old?.amount)).toBe(100000);
  },
});
