// @vitest-environment node
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { createAppTest } from '@nocobase/app-testing/server';
import { expect } from 'vitest';

import { createStandaloneServer } from '../../server/standalone.js';

const test = createAppTest({
  createServer: createStandaloneServer,
  connections: ['main'],
  config: {
    app: { publicOrigin: 'http://localhost' },
    auth: { secret: 'test-auth-secret-at-least-32-characters' },
  },
});

const createOperationKey = () => `${Date.now()}.${randomUUID()}`;

const json = (body: unknown, method = 'POST') => ({
  method,
  headers: {
    'content-type': 'application/json',
    origin: 'http://localhost',
    'idempotency-key': createOperationKey(),
  },
  body: JSON.stringify(body),
});

test('Finance API requires authentication and respects role permissions', async ({
  testApp,
  request,
}) => {
  // 1. Anonymous request is rejected with 401
  const anonRes = await request('/finance/overview');
  expect(anonRes.status).toBe(401);

  // 2. Sign in as admin
  const admin = await signIn(testApp, DEFAULT_ADMIN_CREDENTIALS);

  // Create an ordinary user with NO finance role
  const userNoRoleRes = await admin.fetch(
    '/users',
    json({
      name: 'User No Role',
      username: 'norole',
      email: 'norole@duongsinh.test',
      password: 'Password123!',
      roleScopes: { app: ['member'] },
    }),
  );
  expect(userNoRoleRes.status).toBe(201);

  const sessionNoRole = await signIn(testApp, {
    username: 'norole',
    password: 'Password123!',
  });

  // User without finance role is rejected with 403
  const forbiddenRes = await sessionNoRole.fetch('/finance/overview');
  expect(forbiddenRes.status).toBe(403);

  // 3. Create Thầy Tường (Giám đốc) with finance-director role
  const directorRes = await admin.fetch(
    '/users',
    json({
      name: 'Thầy Tường (Giám đốc)',
      username: 'thaytuong',
      email: 'thaytuong@duongsinh.test',
      password: 'Password123!',
      roleScopes: { app: ['finance-director'] },
    }),
  );
  expect(directorRes.status).toBe(201);

  const director = await signIn(testApp, {
    username: 'thaytuong',
    password: 'Password123!',
  });

  // 4. Test GET /finance/overview
  const overviewRes = await director.fetch('/finance/overview');
  expect(overviewRes.status).toBe(200);
  const overviewBody = await overviewRes.json();
  expect(overviewBody.data).toBeDefined();
  expect(overviewBody.data.branches).toBeDefined();
  expect(overviewBody.data.branches.length).toBeGreaterThanOrEqual(2);
  expect(overviewBody.data.accounts).toBeDefined();
  expect(overviewBody.data.accounts.length).toBeGreaterThanOrEqual(3);

  // 5. Test GET /finance/transactions/options
  const optionsRes = await director.fetch('/finance/transactions/options');
  expect(optionsRes.status).toBe(200);
  const options = (await optionsRes.json()).data;
  expect(options.branches.length).toBeGreaterThanOrEqual(2);
  expect(options.accounts.length).toBeGreaterThanOrEqual(3);
  expect(options.categories.length).toBeGreaterThanOrEqual(5);

  // The options are active-only and carry the fields the voucher form reads.
  expect(Object.keys(options.branches[0]).sort()).toEqual([
    'code',
    'id',
    'name',
  ]);
  expect(Object.keys(options.accounts[0]).sort()).toEqual([
    'accountNumber',
    'bankName',
    'code',
    'id',
    'kind',
    'name',
  ]);
  expect(Object.keys(options.categories[0]).sort()).toEqual([
    'code',
    'id',
    'name',
    'sort',
    'type',
  ]);
  expect(typeof options.categories[0].sort).toBe('number');
  expect(options.categories.some((c: any) => c.type === 'income')).toBe(true);
  expect(options.categories.some((c: any) => c.type === 'expense')).toBe(true);

  // The accounts list: `active` is a boolean (not 0/1) and balances are numbers on every dialect.
  const accountsBefore = (
    await (await director.fetch('/finance/accounts')).json()
  ).data;
  expect(accountsBefore.length).toBeGreaterThanOrEqual(3);
  for (const account of accountsBefore) {
    expect(account).toMatchObject({
      id: expect.any(String),
      code: expect.any(String),
      name: expect.any(String),
      kind: expect.stringMatching(/^(bank|cash|ewallet)$/),
      active: true,
      openingBalance: expect.any(Number),
      currentBalance: expect.any(Number),
      totalIncome: expect.any(Number),
      totalExpense: expect.any(Number),
    });
    expect(account).not.toHaveProperty('isActive');
  }

  const branchesList = (
    await (await director.fetch('/finance/branches')).json()
  ).data;
  for (const branch of branchesList) {
    expect(branch).toMatchObject({ active: true, kind: expect.any(String) });
    expect(branch).not.toHaveProperty('isActive');
  }

  const branchId = options.branches[0].id;
  const accountId = options.accounts[0].id;
  const balanceBefore = accountsBefore.find(
    (a: any) => a.id === accountId,
  ).currentBalance;
  const incomeCategory = options.categories.find(
    (c: any) => c.type === 'income',
  );
  const expenseCategory = options.categories.find(
    (c: any) => c.type === 'expense',
  );

  // A voucher naming a missing category, or a category of the other type, is a 400 naming the field — not a 500 from
  // the foreign key — and consumes no voucher number.
  for (const categoryId of ['missing-category', expenseCategory.id]) {
    const rejected = await director.fetch(
      '/finance/transactions',
      json({
        type: 'income',
        date: '2026-11-20',
        amount: 1000,
        categoryId,
        accountId,
        branchId,
      }),
    );
    expect(rejected.status).toBe(400);
    expect((await rejected.json()).error).toMatchObject({
      status: 'INVALID_ARGUMENT',
      reason: 'FINANCE_VOUCHER_REFERENCE_INVALID',
      fieldViolations: [expect.objectContaining({ field: 'categoryId' })],
    });
  }

  // 6. Test POST /finance/transactions (Income - Thu học phí)
  const createIncomeRes = await director.fetch(
    '/finance/transactions',
    json({
      type: 'income',
      date: '2026-11-20',
      amount: 1500000,
      categoryId: incomeCategory.id,
      accountId,
      branchId,
      counterparty: 'Phụ huynh em Nguyễn Văn An',
      description: 'Học phí khoá cờ vua K28 Cơ sở 1',
    }),
  );
  expect(createIncomeRes.status).toBe(200);
  const incomeTx = (await createIncomeRes.json()).data;
  expect(incomeTx.code).toBe('PT-2026-0001');
  expect(incomeTx.amount).toBe(1500000);

  // 7. Test POST /finance/transactions (Expense - Chi thuê mặt bằng)
  const createExpenseRes = await director.fetch(
    '/finance/transactions',
    json({
      type: 'expense',
      date: '2026-11-20',
      amount: 500000,
      categoryId: expenseCategory.id,
      accountId,
      branchId,
      counterparty: 'Chủ nhà Cơ sở 1',
      description: 'Tiền điện nước cơ sở 1 tháng 11',
    }),
  );
  expect(createExpenseRes.status).toBe(200);
  const expenseTx = (await createExpenseRes.json()).data;
  expect(expenseTx.code).toMatch(/^PC-2026-\d{4}$/);
  expect(expenseTx.amount).toBe(500000);

  // 8. Test GET /finance/transactions (List & Search)
  const listRes = await director.fetch('/finance/transactions?period=2026-11');
  expect(listRes.status).toBe(200);
  const listData = (await listRes.json()).data;
  expect(listData).toMatchObject({ total: 2, page: 1, pageSize: 20 });
  const listedIncome = listData.rows.find((r: any) => r.id === incomeTx.id);
  expect(listedIncome).toMatchObject({
    code: incomeTx.code,
    type: 'income',
    date: '2026-11-20',
    period: '2026-11',
    amount: 1500000,
    categoryId: incomeCategory.id,
    accountId,
    branchId,
    categoryName: incomeCategory.name,
    accountName: options.accounts[0].name,
    branchName: options.branches[0].name,
    counterparty: 'Phụ huynh em Nguyễn Văn An',
    description: 'Học phí khoá cờ vua K28 Cơ sở 1',
  });
  expect(listedIncome).not.toHaveProperty('transactionDate');

  // The account's balance moved by the two vouchers and the account stays active.
  const accountAfter = (
    await (await director.fetch('/finance/accounts')).json()
  ).data.find((a: any) => a.id === accountId);
  expect(accountAfter.active).toBe(true);
  expect(accountAfter.currentBalance).toBe(balanceBefore + 1500000 - 500000);

  // Test Search
  const searchRes = await director.fetch(
    '/finance/transactions?search=Nguyễn+Văn+An',
  );
  expect(searchRes.status).toBe(200);
  const searchData = (await searchRes.json()).data;
  expect(searchData.total).toBe(1);
  expect(searchData.rows[0].counterparty).toBe('Phụ huynh em Nguyễn Văn An');

  // 9. Test Overview after transactions
  const overviewAfter = await (
    await director.fetch('/finance/overview?period=2026-11')
  ).json();
  expect(overviewAfter.data.totalIncome).toBe(1500000);
  expect(overviewAfter.data.totalExpense).toBe(500000);
  expect(overviewAfter.data.netFlow).toBe(1000000);
  expect(
    overviewAfter.data.branches.find((b: any) => b.id === branchId),
  ).toMatchObject({
    active: true,
    totalIncome: 1500000,
    totalExpense: 500000,
    netFlow: 1000000,
  });
  expect(overviewAfter.data.incomeCategories).toEqual([
    {
      id: incomeCategory.id,
      code: incomeCategory.code,
      name: incomeCategory.name,
      amount: 1500000,
      percentage: 100,
    },
  ]);
  expect(overviewAfter.data.dailyFlow).toEqual([
    { date: '2026-11-20', income: 1500000, expense: 500000 },
  ]);
  expect(
    overviewAfter.data.accounts.find((a: any) => a.id === accountId),
  ).toMatchObject({ active: true, currentBalance: balanceBefore + 1000000 });

  // 10. Test PATCH /finance/transactions/:id
  const updateRes = await director.fetch(
    `/finance/transactions/${incomeTx.id}`,
    json({ amount: 1800000 }, 'PATCH'),
  );
  expect(updateRes.status).toBe(200);

  const missingRes = await director.fetch(
    '/finance/transactions/missing-voucher',
    json({ amount: 1 }, 'PATCH'),
  );
  expect(missingRes.status).toBe(404);

  // 11. Test DELETE /finance/transactions/:id
  const deleteRes = await director.fetch(
    `/finance/transactions/${expenseTx.id}`,
    {
      method: 'DELETE',
      headers: {
        origin: 'http://localhost',
      },
    },
  );
  expect(deleteRes.status).toBe(200);

  const listAfterDelete = await (
    await director.fetch('/finance/transactions?period=2026-11')
  ).json();
  expect(listAfterDelete.data.total).toBe(1);
});
