// @vitest-environment node
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { createAppTest } from '@nocobase/app-testing/server';
import { expect } from 'vitest';

import { createStandaloneServer } from '../../server/standalone.js';
import {
  optionsWithTournaments,
  sameWireShape,
  tournamentReport,
  tournamentSummary,
} from '../fixtures/finance-tournaments.js';

const test = createAppTest({
  createServer: createStandaloneServer,
  connections: ['main'],
  config: {
    app: { publicOrigin: 'http://localhost' },
    auth: { secret: 'test-auth-secret-at-least-32-characters' },
  },
});

const createOperationKey = () => `${Date.now()}.${randomUUID()}`;

const send = (body: unknown, method = 'POST', key = createOperationKey()) => ({
  method,
  headers: {
    'content-type': 'application/json',
    origin: 'http://localhost',
    'idempotency-key': key,
  },
  body: JSON.stringify(body),
});

type Session = Awaited<ReturnType<typeof signIn>>;

async function createUser(admin: Session, username: string, role: string) {
  const res = await admin.fetch(
    '/users',
    send({
      name: username,
      username,
      email: `${username}@duongsinh.test`,
      password: 'Password123!',
      roleScopes: { app: [role] },
    }),
  );
  expect(res.status).toBe(201);
}

test('Tournament finance: permissions, budget against actual, settling and duplicate submits', async ({
  testApp,
  request,
}) => {
  // Anonymous callers are refused before anything else.
  expect((await request('/finance/tournaments')).status).toBe(401);

  const admin = await signIn(testApp, DEFAULT_ADMIN_CREDENTIALS);
  await createUser(admin, 'norole', 'member');
  await createUser(admin, 'director', 'finance-director');
  await createUser(admin, 'cashier', 'finance-cashier');
  const noRole = await signIn(testApp, {
    username: 'norole',
    password: 'Password123!',
  });
  const director = await signIn(testApp, {
    username: 'director',
    password: 'Password123!',
  });
  const cashier = await signIn(testApp, {
    username: 'cashier',
    password: 'Password123!',
  });

  // A member without a finance role may neither read nor create tournaments.
  expect((await noRole.fetch('/finance/tournaments')).status).toBe(403);
  expect(
    (
      await noRole.fetch(
        '/finance/tournaments',
        send({ name: 'X', startDate: '2026-12-01' }),
      )
    ).status,
  ).toBe(403);

  // The cashier may view but not manage tournaments.
  expect((await cashier.fetch('/finance/tournaments')).status).toBe(200);
  const cashierCreate = await cashier.fetch(
    '/finance/tournaments',
    send({ name: 'X', startDate: '2026-12-01' }),
  );
  expect(cashierCreate.status).toBe(403);
  expect((await cashierCreate.json()).error.reason).toBe(
    'FINANCE_TOURNAMENTS_MANAGE_DENIED',
  );

  const options = (
    await (await director.fetch('/finance/transactions/options')).json()
  ).data;
  // The seeded tournament categories exist, and the reused income categories are still there.
  const codes = options.categories.map((c: { code: string }) => c.code);
  for (const code of [
    'CHI-GIAI-THUONG',
    'CHI-TRONG-TAI',
    'CHI-DIA-DIEM-GIAI',
    'CHI-TRUYEN-THONG-GIAI',
    'THU-LE-PHI-GIAI',
    'THU-TAI-TRO',
  ])
    expect(codes).toContain(code);
  const category = (code: string) =>
    options.categories.find((c: { code: string }) => c.code === code);
  const fees = category('THU-LE-PHI-GIAI');
  const sponsorship = category('THU-TAI-TRO');
  const prizes = category('CHI-GIAI-THUONG');
  const referees = category('CHI-TRONG-TAI');
  const branchId = options.branches[0].id;
  const accountId = options.accounts[0].id;
  expect(options.tournaments).toEqual([]);

  // Create: the code is allocated from the start date's year. The same operation key sent twice (a double click)
  // creates one tournament and consumes one number.
  const createKey = createOperationKey();
  const tournamentInput = {
    name: 'Giải cờ vua Dương Sinh mở rộng',
    startDate: '2026-12-05',
    endDate: '2026-12-06',
    branchId,
    venue: 'Nhà văn hoá quận',
  };
  const first = await director.fetch(
    '/finance/tournaments',
    send(tournamentInput, 'POST', createKey),
  );
  expect(first.status).toBe(200);
  const tournament = (await first.json()).data;
  expect(tournament).toMatchObject({
    code: 'GD-2026-01',
    name: 'Giải cờ vua Dương Sinh mở rộng',
    startDate: '2026-12-05',
    endDate: '2026-12-06',
    branchId,
    venue: 'Nhà văn hoá quận',
    status: 'planning',
    note: null,
  });
  const replay = await director.fetch(
    '/finance/tournaments',
    send(tournamentInput, 'POST', createKey),
  );
  expect(replay.status).toBe(200);
  expect(replay.headers.get('idempotency-replayed')).toBe('true');
  expect((await replay.json()).data.id).toBe(tournament.id);
  // A changed request under the same key is refused, not applied.
  const conflict = await director.fetch(
    '/finance/tournaments',
    send({ ...tournamentInput, name: 'Khác' }, 'POST', createKey),
  );
  expect(conflict.status).toBeGreaterThanOrEqual(400);
  // A write without a key is refused.
  const unkeyed = await director.fetch('/finance/tournaments', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify(tournamentInput),
  });
  expect(unkeyed.status).toBe(400);

  const second = (
    await (
      await director.fetch(
        '/finance/tournaments',
        send({ name: 'Giải nhanh', startDate: '2026-12-20' }),
      )
    ).json()
  ).data;
  expect(second.code).toBe('GD-2026-02');
  expect(second).toMatchObject({ endDate: null, branchId: null });

  const badDates = await director.fetch(
    '/finance/tournaments',
    send({ name: 'Sai ngày', startDate: '2026-12-05', endDate: '2026-12-01' }),
  );
  expect(badDates.status).toBe(400);

  // Budget: replaces the whole budget; a category may appear once and must exist.
  const budgetPath = `/finance/tournaments/${tournament.id}/budgets`;
  const duplicateBudget = await director.fetch(
    budgetPath,
    send(
      {
        budgets: [
          { categoryId: prizes.id, amount: 1 },
          { categoryId: prizes.id, amount: 2 },
        ],
      },
      'PUT',
    ),
  );
  expect(duplicateBudget.status).toBe(400);
  expect(
    (
      await director.fetch(
        budgetPath,
        send({ budgets: [{ categoryId: 'missing', amount: 1 }] }, 'PUT'),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await cashier.fetch(
        budgetPath,
        send({ budgets: [{ categoryId: prizes.id, amount: 1 }] }, 'PUT'),
      )
    ).status,
  ).toBe(403);
  const budgetRes = await director.fetch(
    budgetPath,
    send(
      {
        budgets: [
          { categoryId: fees.id, amount: 6000000 },
          { categoryId: sponsorship.id, amount: 2000000 },
          { categoryId: prizes.id, amount: 3000000 },
          { categoryId: referees.id, amount: 1000000 },
        ],
      },
      'PUT',
    ),
  );
  expect(budgetRes.status).toBe(200);
  expect((await budgetRes.json()).data).toHaveLength(4);

  // Vouchers: the cashier records a receipt for the tournament with the existing voucher permission.
  const voucher = (body: Record<string, unknown>) => ({
    date: '2026-12-05',
    accountId,
    branchId,
    tournamentId: tournament.id,
    ...body,
  });
  const unknownTournament = await director.fetch(
    '/finance/transactions',
    send(
      voucher({
        type: 'income',
        amount: 1,
        categoryId: fees.id,
        tournamentId: 'missing-tournament',
      }),
    ),
  );
  expect(unknownTournament.status).toBe(400);
  expect((await unknownTournament.json()).error).toMatchObject({
    reason: 'FINANCE_VOUCHER_REFERENCE_INVALID',
    fieldViolations: [expect.objectContaining({ field: 'tournamentId' })],
  });

  // Double submit of one receipt: one voucher, one number.
  const receiptKey = createOperationKey();
  const receiptBody = voucher({
    type: 'income',
    amount: 4500000,
    categoryId: fees.id,
    counterparty: 'Kỳ thủ đăng ký',
  });
  const [receiptA, receiptB] = await Promise.all([
    cashier.fetch(
      '/finance/transactions',
      send(receiptBody, 'POST', receiptKey),
    ),
    cashier.fetch(
      '/finance/transactions',
      send(receiptBody, 'POST', receiptKey),
    ),
  ]);
  const receipts = await Promise.all([receiptA.json(), receiptB.json()]);
  const succeeded = receipts.filter((body) => body.data);
  expect(succeeded.length).toBeGreaterThanOrEqual(1);
  for (const body of succeeded) expect(body.data.id).toBe(succeeded[0].data.id);
  // Sent again after both settled, it is answered from the receipt.
  const receiptReplay = await cashier.fetch(
    '/finance/transactions',
    send(receiptBody, 'POST', receiptKey),
  );
  expect(receiptReplay.status).toBe(200);
  expect(receiptReplay.headers.get('idempotency-replayed')).toBe('true');
  const receipt = (await receiptReplay.json()).data;
  expect(receipt).toMatchObject({
    code: 'PT-2026-0001',
    amount: 4500000,
    tournamentId: tournament.id,
  });

  const payment = (
    await (
      await director.fetch(
        '/finance/transactions',
        send(
          voucher({ type: 'expense', amount: 3500000, categoryId: prizes.id }),
        ),
      )
    ).json()
  ).data;
  expect(payment.tournamentId).toBe(tournament.id);
  // A voucher of no tournament stays out of the report.
  await director.fetch(
    '/finance/transactions',
    send(
      voucher({
        type: 'expense',
        amount: 100000,
        categoryId: referees.id,
        tournamentId: null,
      }),
    ),
  );

  const filtered = (
    await (
      await director.fetch(
        `/finance/transactions?tournamentId=${tournament.id}`,
      )
    ).json()
  ).data;
  expect(filtered.total).toBe(2);
  expect(filtered.rows.map((r: { code: string }) => r.code).sort()).toEqual([
    'PC-2026-0001',
    'PT-2026-0001',
  ]);

  // The report: per-category budget against actual, totals and the vouchers.
  const report = (
    await (await cashier.fetch(`/finance/tournaments/${tournament.id}`)).json()
  ).data;
  expect(report.tournament).toMatchObject({
    id: tournament.id,
    code: 'GD-2026-01',
    startDate: '2026-12-05',
    endDate: '2026-12-06',
    status: 'planning',
    branchName: options.branches[0].name,
  });
  expect(report.totals).toEqual({
    totalIncome: 4500000,
    totalExpense: 3500000,
    net: 1000000,
    budgetIncome: 8000000,
    budgetExpense: 4000000,
    budgetNet: 4000000,
    expenseRatio: 88,
    voucherCount: 2,
  });
  expect(report.categories).toEqual([
    expect.objectContaining({
      categoryId: fees.id,
      type: 'income',
      budget: 6000000,
      actual: 4500000,
      variance: -1500000,
      overBudget: false,
    }),
    expect.objectContaining({
      categoryId: sponsorship.id,
      type: 'income',
      budget: 2000000,
      actual: 0,
      variance: -2000000,
      overBudget: false,
    }),
    expect.objectContaining({
      categoryId: prizes.id,
      categoryCode: 'CHI-GIAI-THUONG',
      categoryName: prizes.name,
      type: 'expense',
      budget: 3000000,
      actual: 3500000,
      variance: 500000,
      overBudget: true,
    }),
    expect.objectContaining({
      categoryId: referees.id,
      type: 'expense',
      budget: 1000000,
      actual: 0,
      variance: -1000000,
      overBudget: false,
    }),
  ]);
  expect(report.vouchers).toHaveLength(2);
  // The client fixtures (tests/fixtures/finance-tournaments.ts) have exactly this shape.
  expect(sameWireShape(report, tournamentReport)).toEqual([]);
  expect(report.vouchers[0]).toMatchObject({
    date: '2026-12-05',
    amount: expect.any(Number),
    tournamentId: tournament.id,
    tournamentCode: 'GD-2026-01',
    tournamentName: 'Giải cờ vua Dương Sinh mở rộng',
    categoryName: expect.any(String),
    accountName: expect.any(String),
  });

  const list = (await (await director.fetch('/finance/tournaments')).json())
    .data;
  expect(list.map((t: { code: string }) => t.code)).toEqual([
    'GD-2026-02',
    'GD-2026-01',
  ]);
  expect(list[1]).toMatchObject({
    totalIncome: 4500000,
    totalExpense: 3500000,
    net: 1000000,
    budgetIncome: 8000000,
    budgetExpense: 4000000,
    voucherCount: 2,
    branchName: options.branches[0].name,
  });
  expect(sameWireShape(list[1], tournamentSummary)).toEqual([]);
  const planning = (
    await (await director.fetch('/finance/tournaments?status=closed')).json()
  ).data;
  expect(planning).toEqual([]);

  // Open tournaments are offered to the voucher form.
  const openOptions = (await (await cashier.fetch('/finance/options')).json())
    .data;
  expect(
    openOptions.tournaments.map((t: { id: string }) => t.id).sort(),
  ).toEqual([tournament.id, second.id].sort());
  expect(sameWireShape(openOptions, optionsWithTournaments)).toEqual([]);

  // Settle (close) the tournament. Cashiers may not.
  expect(
    (
      await cashier.fetch(
        `/finance/tournaments/${tournament.id}`,
        send({ status: 'closed' }, 'PATCH'),
      )
    ).status,
  ).toBe(403);
  const closeRes = await director.fetch(
    `/finance/tournaments/${tournament.id}`,
    send({ status: 'closed' }, 'PATCH'),
  );
  expect(closeRes.status).toBe(200);
  expect((await closeRes.json()).data.status).toBe('closed');

  // A settled tournament takes no new voucher, no edit or deletion of its vouchers, and no budget or detail change.
  const rejectedVoucher = await cashier.fetch(
    '/finance/transactions',
    send(voucher({ type: 'income', amount: 1000, categoryId: fees.id })),
  );
  expect(rejectedVoucher.status).toBe(400);
  expect((await rejectedVoucher.json()).error).toMatchObject({
    reason: 'FINANCE_VOUCHER_REFERENCE_INVALID',
    fieldViolations: [expect.objectContaining({ field: 'tournamentId' })],
  });
  const rejectedEdit = await director.fetch(
    `/finance/transactions/${payment.id}`,
    send({ amount: 1 }, 'PATCH'),
  );
  expect(rejectedEdit.status).toBe(400);
  expect((await rejectedEdit.json()).error.reason).toBe(
    'FINANCE_TOURNAMENT_CLOSED',
  );
  const rejectedDelete = await director.fetch(
    `/finance/transactions/${payment.id}`,
    { method: 'DELETE', headers: { origin: 'http://localhost' } },
  );
  expect(rejectedDelete.status).toBe(400);
  const rejectedBudget = await director.fetch(
    budgetPath,
    send({ budgets: [] }, 'PUT'),
  );
  expect(rejectedBudget.status).toBe(400);
  expect((await rejectedBudget.json()).error.reason).toBe(
    'FINANCE_TOURNAMENT_CLOSED',
  );
  expect(
    (
      await director.fetch(
        `/finance/tournaments/${tournament.id}`,
        send({ name: 'Đổi tên' }, 'PATCH'),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await (await cashier.fetch('/finance/options')).json()
    ).data.tournaments.map((t: { id: string }) => t.id),
  ).toEqual([second.id]);

  // Reopening is allowed with manage, after which vouchers are accepted again.
  const reopen = await director.fetch(
    `/finance/tournaments/${tournament.id}`,
    send({ status: 'ongoing' }, 'PATCH'),
  );
  expect(reopen.status).toBe(200);
  expect(
    (
      await director.fetch(
        `/finance/transactions/${payment.id}`,
        send({ amount: 3000000 }, 'PATCH'),
      )
    ).status,
  ).toBe(200);
  const after = (
    await (await director.fetch(`/finance/tournaments/${tournament.id}`)).json()
  ).data;
  expect(after.totals).toMatchObject({ totalExpense: 3000000, net: 1500000 });
  expect(after.categories[2]).toMatchObject({
    actual: 3000000,
    variance: 0,
    overBudget: false,
  });
  // Budget lines of 0 are dropped.
  const trimmed = await director.fetch(
    budgetPath,
    send({ budgets: [{ categoryId: prizes.id, amount: 0 }] }, 'PUT'),
  );
  expect((await trimmed.json()).data).toEqual([]);
});
