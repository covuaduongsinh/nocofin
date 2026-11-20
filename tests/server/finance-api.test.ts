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

  const branchId = options.branches[0].id;
  const accountId = options.accounts[0].id;
  const incomeCategory = options.categories.find(
    (c: any) => c.type === 'income',
  );
  const expenseCategory = options.categories.find(
    (c: any) => c.type === 'expense',
  );

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
  expect(incomeTx.code).toMatch(/^PT-2026-\d{4}$/);
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
  const listRes = await director.fetch(
    '/finance/transactions?period=2026-11',
  );
  expect(listRes.status).toBe(200);
  const listData = (await listRes.json()).data;
  expect(listData.total).toBe(2);
  expect(listData.rows[0].categoryName).toBeDefined();
  expect(listData.rows[0].accountName).toBeDefined();

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

  // 10. Test PATCH /finance/transactions/:id
  const updateRes = await director.fetch(
    `/finance/transactions/${incomeTx.id}`,
    json({ amount: 1800000 }, 'PATCH'),
  );
  expect(updateRes.status).toBe(200);

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
