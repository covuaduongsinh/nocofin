// Wire fixtures for the tournament finance pages. tests/server/finance-tournaments-api.test.ts compares the shape of
// the real responses of a running application against these objects (field names, nesting and value types), so a
// client test using them cannot drift from what server/finance/tournaments.ts returns.
import type {
  FinanceOptionsData,
  FinanceTournamentReport,
  FinanceTournamentSummary,
} from '../../client/pages/finance/types.js';

export const tournamentSummary: FinanceTournamentSummary = {
  id: 'tour-1',
  code: 'GD-2026-01',
  name: 'Giải cờ vua Dương Sinh mở rộng',
  startDate: '2026-12-05',
  endDate: '2026-12-06',
  branchId: 'b1',
  venue: 'Nhà văn hoá quận',
  status: 'ongoing',
  note: null,
  createdAt: '2026-11-21T03:00:00.000Z',
  updatedAt: '2026-11-21T03:00:00.000Z',
  branchName: 'CS 1',
  totalIncome: 4500000,
  totalExpense: 3500000,
  net: 1000000,
  budgetIncome: 8000000,
  budgetExpense: 4000000,
  voucherCount: 2,
};

export const tournamentReport: FinanceTournamentReport = {
  tournament: {
    id: 'tour-1',
    code: 'GD-2026-01',
    name: 'Giải cờ vua Dương Sinh mở rộng',
    startDate: '2026-12-05',
    endDate: '2026-12-06',
    branchId: 'b1',
    venue: 'Nhà văn hoá quận',
    status: 'ongoing',
    note: null,
    createdAt: '2026-11-21T03:00:00.000Z',
    updatedAt: '2026-11-21T03:00:00.000Z',
    branchName: 'CS 1',
  },
  totals: {
    totalIncome: 4500000,
    totalExpense: 3500000,
    net: 1000000,
    budgetIncome: 8000000,
    budgetExpense: 4000000,
    budgetNet: 4000000,
    expenseRatio: 88,
    voucherCount: 2,
  },
  categories: [
    {
      categoryId: 'cat-fees',
      categoryCode: 'THU-LE-PHI-GIAI',
      categoryName: 'Lệ phí thi đấu giải cờ vua',
      type: 'income',
      budget: 6000000,
      actual: 4500000,
      variance: -1500000,
      overBudget: false,
    },
    {
      categoryId: 'cat-prizes',
      categoryCode: 'CHI-GIAI-THUONG',
      categoryName: 'Giải thưởng, cúp, huy chương',
      type: 'expense',
      budget: 3000000,
      actual: 3500000,
      variance: 500000,
      overBudget: true,
    },
    {
      categoryId: 'cat-referees',
      categoryCode: 'CHI-TRONG-TAI',
      categoryName: 'Thù lao trọng tài & ban tổ chức',
      type: 'expense',
      budget: 1000000,
      actual: 0,
      variance: -1000000,
      overBudget: false,
    },
  ],
  vouchers: [
    {
      id: 'v1',
      code: 'PT-2026-0001',
      type: 'income',
      date: '2026-12-05',
      period: '2026-12',
      amount: 4500000,
      categoryId: 'cat-fees',
      accountId: 'a1',
      branchId: 'b1',
      counterparty: 'Kỳ thủ đăng ký',
      description: null,
      tournamentId: 'tour-1',
      createdById: 'admin-id',
      createdAt: '2026-12-05T03:00:00.000Z',
      updatedAt: '2026-12-05T03:00:00.000Z',
      categoryName: 'Lệ phí thi đấu giải cờ vua',
      categoryCode: 'THU-LE-PHI-GIAI',
      accountName: 'MB Bank',
      accountCode: 'MB1',
      branchName: 'CS 1',
      branchCode: 'CS1',
      tournamentCode: 'GD-2026-01',
      tournamentName: 'Giải cờ vua Dương Sinh mở rộng',
    },
    {
      id: 'v2',
      code: 'PC-2026-0001',
      type: 'expense',
      date: '2026-12-05',
      period: '2026-12',
      amount: 3500000,
      categoryId: 'cat-prizes',
      accountId: 'a1',
      branchId: 'b1',
      counterparty: null,
      description: 'Cúp và huy chương',
      tournamentId: 'tour-1',
      createdById: 'admin-id',
      createdAt: '2026-12-05T04:00:00.000Z',
      updatedAt: '2026-12-05T04:00:00.000Z',
      categoryName: 'Giải thưởng, cúp, huy chương',
      categoryCode: 'CHI-GIAI-THUONG',
      accountName: 'MB Bank',
      accountCode: 'MB1',
      branchName: 'CS 1',
      branchCode: 'CS1',
      tournamentCode: 'GD-2026-01',
      tournamentName: 'Giải cờ vua Dương Sinh mở rộng',
    },
  ],
};

export const optionsWithTournaments: FinanceOptionsData = {
  branches: [{ id: 'b1', code: 'CS1', name: 'CS 1' }],
  accounts: [
    {
      id: 'a1',
      code: 'MB1',
      name: 'MB Bank',
      kind: 'bank',
      bankName: 'MB',
      accountNumber: '0123',
    },
  ],
  categories: [
    {
      id: 'cat-fees',
      code: 'THU-LE-PHI-GIAI',
      name: 'Lệ phí thi đấu giải cờ vua',
      type: 'income',
      sort: 60,
    },
    {
      id: 'cat-prizes',
      code: 'CHI-GIAI-THUONG',
      name: 'Giải thưởng, cúp, huy chương',
      type: 'expense',
      sort: 161,
    },
  ],
  tournaments: [
    {
      id: 'tour-1',
      code: 'GD-2026-01',
      name: 'Giải cờ vua Dương Sinh mở rộng',
      branchId: 'b1',
      status: 'ongoing',
    },
  ],
};

/**
 * The structure of a JSON value: object keys (sorted) with the shape of each value, the shape of an array's first
 * element, and the type of a scalar. `null` matches any type, since a nullable field is null in some records only.
 */
export function wireShape(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length ? [wireShape(value[0])] : [];
  if (typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          wireShape((value as Record<string, unknown>)[key]),
        ]),
    );
  return typeof value;
}

/** Compares two shapes, letting `null` (a nullable field without a value) stand for any type. */
export function sameWireShape(actual: unknown, expected: unknown): string[] {
  const problems: string[] = [];
  const visit = (a: unknown, e: unknown, path: string) => {
    if (a === null || e === null) return;
    if (Array.isArray(a) || Array.isArray(e)) {
      if (!Array.isArray(a) || !Array.isArray(e))
        problems.push(`${path}: array vs ${typeof a}`);
      else if (a.length && e.length) visit(a[0], e[0], `${path}[0]`);
      return;
    }
    if (typeof a === 'object' && typeof e === 'object') {
      const ak = Object.keys(a as object);
      const ek = Object.keys(e as object);
      for (const key of ek)
        if (!ak.includes(key))
          problems.push(`${path}.${key}: missing on the server`);
      for (const key of ak)
        if (!ek.includes(key))
          problems.push(`${path}.${key}: not in the fixture`);
      for (const key of ek.filter((k) => ak.includes(k)))
        visit(
          (a as Record<string, unknown>)[key],
          (e as Record<string, unknown>)[key],
          `${path}.${key}`,
        );
      return;
    }
    if (a !== e) problems.push(`${path}: ${String(a)} vs ${String(e)}`);
  };
  visit(wireShape(actual), wireShape(expected), '$');
  return problems;
}
