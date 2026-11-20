import { encodeAuthorizationTitle } from '@nocobase/authorization/core';
import { defineSeed } from '@nocobase/db';

export default defineSeed({
  name: '202611200002_seed_finance_roles',
  transaction: true,
  async run({ query }) {
    const directorGrants = [
      {
        resource: { type: 'page', id: 'finance.overview' },
        actions: [{ action: 'access' }],
      },
      {
        resource: { type: 'page', id: 'finance.transactions' },
        actions: [{ action: 'access' }],
      },
      {
        resource: { type: 'page', id: 'finance.accounts' },
        actions: [{ action: 'access' }],
      },
      {
        resource: { type: 'page', id: 'finance.branches' },
        actions: [{ action: 'access' }],
      },
      {
        resource: { type: 'settings', id: 'finance.categories' },
        actions: [
          { action: 'read' },
          { action: 'create' },
          { action: 'update' },
        ],
      },
      {
        resource: { type: 'composite', id: 'finance.transactions' },
        actions: [
          {
            action: 'view',
            policy: {
              type: 'composite',
              scopes: {
                finTransactions: 'allRecords',
                finCategories: 'allRecords',
                finAccounts: 'allRecords',
                finBranches: 'allRecords',
              },
            },
          },
          {
            action: 'create',
            policy: {
              type: 'composite',
              scopes: {
                finTransactions: 'allRecords',
                finCategories: 'allRecords',
                finAccounts: 'allRecords',
                finBranches: 'allRecords',
              },
            },
          },
          {
            action: 'update',
            policy: {
              type: 'composite',
              scopes: {
                finTransactions: 'allRecords',
                finCategories: 'allRecords',
                finAccounts: 'allRecords',
                finBranches: 'allRecords',
              },
            },
          },
          {
            action: 'delete',
            policy: {
              type: 'composite',
              scopes: {
                finTransactions: 'allRecords',
              },
            },
          },
        ],
      },
      {
        resource: { type: 'composite', id: 'finance.accounts' },
        actions: [
          {
            action: 'view',
            policy: {
              type: 'composite',
              scopes: {
                finAccounts: 'allRecords',
                finTransactions: 'allRecords',
              },
            },
          },
          {
            action: 'manage',
            policy: {
              type: 'composite',
              scopes: {
                finAccounts: 'allRecords',
              },
            },
          },
        ],
      },
      {
        resource: { type: 'composite', id: 'finance.branches' },
        actions: [
          {
            action: 'view',
            policy: {
              type: 'composite',
              scopes: {
                finBranches: 'allRecords',
              },
            },
          },
          {
            action: 'manage',
            policy: {
              type: 'composite',
              scopes: {
                finBranches: 'allRecords',
              },
            },
          },
        ],
      },
      {
        resource: { type: 'composite', id: 'finance.reports' },
        actions: [
          {
            action: 'view',
            policy: {
              type: 'composite',
              scopes: {
                finTransactions: 'allRecords',
                finCategories: 'allRecords',
                finAccounts: 'allRecords',
                finBranches: 'allRecords',
              },
            },
          },
        ],
      },
    ];

    const accountantGrants = [...directorGrants];

    const cashierGrants = [
      {
        resource: { type: 'page', id: 'finance.transactions' },
        actions: [{ action: 'access' }],
      },
      {
        resource: { type: 'composite', id: 'finance.transactions' },
        actions: [
          {
            action: 'view',
            policy: {
              type: 'composite',
              scopes: {
                finTransactions: 'allRecords',
                finCategories: 'allRecords',
                finAccounts: 'allRecords',
                finBranches: 'allRecords',
              },
            },
          },
          {
            action: 'create',
            policy: {
              type: 'composite',
              scopes: {
                finTransactions: 'allRecords',
                finCategories: 'allRecords',
                finAccounts: 'allRecords',
                finBranches: 'allRecords',
              },
            },
          },
        ],
      },
      {
        resource: { type: 'composite', id: 'finance.accounts' },
        actions: [
          {
            action: 'view',
            policy: {
              type: 'composite',
              scopes: {
                finAccounts: 'allRecords',
                finTransactions: 'allRecords',
              },
            },
          },
        ],
      },
    ];

    const roles = [
      {
        key: 'finance-director',
        title: 'Giám đốc tài chính (Thầy Tường)',
        grants: directorGrants,
      },
      {
        key: 'finance-accountant',
        title: 'Kế toán',
        grants: accountantGrants,
      },
      {
        key: 'finance-cashier',
        title: 'Thủ quỹ',
        grants: cashierGrants,
      },
    ];

    const now = new Date();

    for (const r of roles) {
      const existing = await query
        .selectFrom('authorizationPermissionSets')
        .select('id')
        .where('key', '=', r.key)
        .executeTakeFirst();
      if (!existing) {
        await query
          .insertInto('authorizationPermissionSets')
          .values({
            id: r.key,
            key: r.key,
            title: encodeAuthorizationTitle(r.title),
            grants: JSON.stringify(r.grants),
            createdAt: now,
            updatedAt: now,
            revision: 'initial',
          })
          .execute();
      }
    }
  },
});
