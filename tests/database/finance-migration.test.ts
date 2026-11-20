import path from 'node:path';
import { describeMigration } from '@nocobase/app-testing/server';
import { expect } from 'vitest';

const collections = [
  'finBranches',
  'finAccounts',
  'finCategories',
  'finTransactions',
  'finCounters',
] as const;

describeMigration('202611200001_create_finance', {
  sources: [
    {
      packageName: 'finance-test',
      directory: path.resolve(
        import.meta.dirname,
        '../../database/main/migrations',
      ),
    },
  ],
  up: async ({ connection, expectCollection }) => {
    for (const name of collections) await expectCollection(name).toExist();
    expect(
      (await expectCollection('finTransactions').toExist()).primaryKey,
    ).toEqual(['id']);
    await expectCollection('finTransactions').toHaveField('amount', {
      nullable: false,
    });
    await expectCollection('finTransactions').toHaveField('branchId', {
      nullable: true,
    });
    const category = {
      id: 'c1',
      code: 'THU-01',
      name: 'Học phí',
      type: 'income',
      sort: 1,
      active: true,
    };
    await connection.query.insertInto('finCategories').values(category).execute();
    // A category code identifies one category.
    await expect(
      connection.query
        .insertInto('finCategories')
        .values({ ...category, id: 'c2' })
        .execute(),
    ).rejects.toThrow();
  },
  down: async ({ expectCollection }) => {
    for (const name of collections) await expectCollection(name).not.toExist();
  },
});
