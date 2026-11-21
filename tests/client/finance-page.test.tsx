import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClientToken } from '@nocobase/app-client';
import {
  AuthenticationProvider,
  authenticationClientToken,
} from '@nocobase/app-plugin-authentication/client';
import {
  AuthorizationClient,
  authorizationClientToken,
  type AuthorizationSnapshot,
} from '@nocobase/app-plugin-authorization/client';
import {
  answerApi,
  renderWithApp,
  type ApiCall,
} from '@nocobase/app-testing/client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';

import FinanceOverviewPage from '../../client/pages/finance/index.js';
import FinanceTransactionsPage from '../../client/pages/finance/transactions.js';
import FinanceAccountsPage from '../../client/pages/finance/accounts.js';
import FinanceBranchesPage from '../../client/pages/finance/branches.js';
import FinanceCategoriesSettingsPage from '../../client/pages/settings/finance-categories.js';
import packageMetadata from '../../package.json' with { type: 'json' };
import enUS from '../../client/locales/en-US.js';
import type {
  FinanceAccount,
  FinanceBranch,
  FinanceCategory,
  FinanceOptionsData,
  FinanceOverviewData,
  FinanceTransaction,
  FinanceTransactionPage,
} from '../../client/pages/finance/types.js';

const getSession = vi.fn(async () => ({
  data: {
    user: { id: 'admin-id', name: 'Super Admin', email: 'admin@nocobase.com' },
    session: { id: 'session-id' },
  },
  error: null,
}));

let permissions: AuthorizationSnapshot;

// Fixtures use the exact wire shape of server/finance/service.ts (tests/server/finance-api.test.ts asserts the same
// field names against a real application). Typed against the client contract so a drift fails type checking.
const branch: FinanceBranch = {
  id: 'b1',
  code: 'CS1',
  name: 'CS 1',
  kind: 'club',
  active: true,
  note: null,
};
const account: FinanceAccount = {
  id: 'a1',
  code: 'MB1',
  name: 'MB Bank',
  kind: 'bank',
  bankName: 'MB',
  accountNumber: '0123',
  openingBalance: 40000000,
  totalIncome: 15000000,
  totalExpense: 5000000,
  currentBalance: 50000000,
  active: true,
  note: null,
};
const category: FinanceCategory = {
  id: 'c1',
  code: 'HP',
  name: 'Học phí',
  type: 'income',
  sort: 10,
  active: true,
};
const transaction: FinanceTransaction = {
  id: 't1',
  code: 'PT-2026-0001',
  type: 'income',
  date: '2026-11-20',
  period: '2026-11',
  amount: 1500000,
  categoryId: 'c1',
  accountId: 'a1',
  branchId: 'b1',
  counterparty: 'Phụ huynh em An',
  description: 'Học phí K28',
  createdById: 'admin-id',
  createdAt: '2026-11-20T03:00:00.000Z',
  updatedAt: '2026-11-20T03:00:00.000Z',
  categoryName: 'Học phí',
  categoryCode: 'HP',
  accountName: 'MB Bank',
  accountCode: 'MB1',
  branchName: 'CS 1',
  branchCode: 'CS1',
};
const transactionPage: FinanceTransactionPage = {
  rows: [transaction],
  total: 1,
  page: 1,
  pageSize: 20,
};
const options: FinanceOptionsData = {
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
    { id: 'c1', code: 'HP', name: 'Học phí', type: 'income', sort: 10 },
  ],
};
const overview: FinanceOverviewData = {
  period: '2026-11',
  branchId: null,
  totalIncome: 10000000,
  totalExpense: 4000000,
  netFlow: 6000000,
  totalAvailableFunds: 50000000,
  branches: [
    {
      ...branch,
      totalIncome: 7000000,
      totalExpense: 3000000,
      netFlow: 4000000,
    },
  ],
  accounts: [account],
  incomeCategories: [
    {
      id: 'c1',
      code: 'HP',
      name: 'Học phí',
      amount: 10000000,
      percentage: 100,
    },
  ],
  expenseCategories: [],
  dailyFlow: [{ date: '2026-11-20', income: 10000000, expense: 4000000 }],
};

const api = vi.fn(({ method, path }: ApiCall) => {
  if (method === 'GET' && path === 'authorization/permissions')
    return { data: permissions };
  if (method === 'POST' && path === 'finance/transactions') {
    return { data: transaction };
  }
  if (method === 'GET' && path.startsWith('finance/overview')) {
    return { data: overview };
  }
  if (
    method === 'GET' &&
    (path === 'finance/options' || path === 'finance/transactions/options')
  ) {
    return { data: options };
  }
  if (method === 'GET' && path.startsWith('finance/transactions')) {
    return { data: transactionPage };
  }
  if (method === 'GET' && path.startsWith('finance/accounts')) {
    return {
      data: [
        account,
        { ...account, id: 'a2', code: 'OLD', name: 'Quỹ cũ', active: false },
      ],
    };
  }
  if (method === 'GET' && path.startsWith('finance/branches')) {
    return { data: [branch] };
  }
  if (method === 'GET' && path.startsWith('finance/categories')) {
    return { data: [category] };
  }
  return new Response(null, { status: 404 });
});

const queriesOf = (path: string) =>
  api.mock.calls
    .map(([call]) => call)
    .filter((call) => call.method === 'GET' && call.path === path)
    .map((call) => call.query ?? {});

describe('Finance pages', () => {
  beforeEach(() => {
    api.mockClear();
    getSession.mockClear();
    permissions = {
      unrestricted: true,
      permissions: [],
    };
  });

  it('renders FinanceOverviewPage', async () => {
    await renderWithApp(
      <AuthenticationProvider>
        <Routes>
          <Route path='/finance' element={<FinanceOverviewPage />} />
        </Routes>
      </AuthenticationProvider>,
      {
        route: '/finance',
        namespace: packageMetadata.name,
        namespaces: { [packageMetadata.name]: enUS },
        fetch: answerApi(api),
        services: (app) => {
          app.container.instance(authenticationClientToken, { getSession });
          app.container.singleton(
            authorizationClientToken,
            (resolver) =>
              new AuthorizationClient(resolver.resolve(apiClientToken)),
          );
        },
      },
    );

    expect(
      await screen.findByText(enUS.finance.overview.title),
    ).toBeInTheDocument();
    // The overview filters by `period`, the parameter the server validates.
    expect(queriesOf('finance/overview')).toContainEqual({
      period: expect.stringMatching(/^\d{4}-\d{2}$/),
    });
    // Branch figures come from totalIncome/totalExpense/netFlow, category figures from amount/percentage, and the daily
    // net is derived from income minus expense.
    expect(await screen.findByText(/Ròng:\s*4\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText(/10\.000\.000\s*₫ \(100%\)/)).toBeInTheDocument();
    expect(screen.getByText('20/11/2026')).toBeInTheDocument();
    expect(screen.getAllByText(/6\.000\.000/).length).toBeGreaterThanOrEqual(2);
  });

  it('renders FinanceTransactionsPage', async () => {
    await renderWithApp(
      <AuthenticationProvider>
        <Routes>
          <Route
            path='/finance/transactions'
            element={<FinanceTransactionsPage />}
          />
        </Routes>
      </AuthenticationProvider>,
      {
        route: '/finance/transactions',
        namespace: packageMetadata.name,
        namespaces: { [packageMetadata.name]: enUS },
        fetch: answerApi(api),
        services: (app) => {
          app.container.instance(authenticationClientToken, { getSession });
          app.container.singleton(
            authorizationClientToken,
            (resolver) =>
              new AuthorizationClient(resolver.resolve(apiClientToken)),
          );
        },
      },
    );

    expect(
      await screen.findByText(enUS.finance.transactions.title),
    ).toBeInTheDocument();
    // The list reads the { rows, total } envelope and the server's field names.
    const row = (await screen.findByText('PT-2026-0001')).closest('tr');
    expect(row).not.toBeNull();
    const cells = within(row!);
    expect(cells.getByText('20/11/2026')).toBeInTheDocument();
    expect(cells.getByText('Học phí')).toBeInTheDocument();
    expect(cells.getByText('MB Bank')).toBeInTheDocument();
    expect(cells.getByText('CS 1')).toBeInTheDocument();
    const listQueries = queriesOf('finance/transactions');
    expect(listQueries).toContainEqual(
      expect.objectContaining({
        period: expect.stringMatching(/^\d{4}-\d{2}$/),
      }),
    );
    for (const query of listQueries) expect(query).not.toHaveProperty('month');
  });

  it('renders FinanceAccountsPage', async () => {
    await renderWithApp(
      <AuthenticationProvider>
        <Routes>
          <Route path='/finance/accounts' element={<FinanceAccountsPage />} />
        </Routes>
      </AuthenticationProvider>,
      {
        route: '/finance/accounts',
        namespace: packageMetadata.name,
        namespaces: { [packageMetadata.name]: enUS },
        fetch: answerApi(api),
        services: (app) => {
          app.container.instance(authenticationClientToken, { getSession });
          app.container.singleton(
            authorizationClientToken,
            (resolver) =>
              new AuthorizationClient(resolver.resolve(apiClientToken)),
          );
        },
      },
    );

    expect(
      await screen.findByText(enUS.finance.accounts.title),
    ).toBeInTheDocument();
    // `active` drives the status badge: one active and one inactive account.
    const activeRow = (await screen.findByText('MB1')).closest('tr');
    expect(
      within(activeRow!).getByText(enUS.finance.accounts.active),
    ).toBeInTheDocument();
    const inactiveRow = screen.getByText('OLD').closest('tr');
    expect(
      within(inactiveRow!).getByText(enUS.finance.accounts.inactive),
    ).toBeInTheDocument();
  });

  it('renders FinanceBranchesPage', async () => {
    await renderWithApp(
      <AuthenticationProvider>
        <Routes>
          <Route path='/finance/branches' element={<FinanceBranchesPage />} />
        </Routes>
      </AuthenticationProvider>,
      {
        route: '/finance/branches',
        namespace: packageMetadata.name,
        namespaces: { [packageMetadata.name]: enUS },
        fetch: answerApi(api),
        services: (app) => {
          app.container.instance(authenticationClientToken, { getSession });
          app.container.singleton(
            authorizationClientToken,
            (resolver) =>
              new AuthorizationClient(resolver.resolve(apiClientToken)),
          );
        },
      },
    );

    expect(
      await screen.findByText(enUS.finance.branches.title),
    ).toBeInTheDocument();
    const branchRow = (await screen.findByText('CS1')).closest('tr');
    expect(
      within(branchRow!).getByText(enUS.finance.branches.active),
    ).toBeInTheDocument();
  });

  it('renders FinanceCategoriesSettingsPage', async () => {
    await renderWithApp(
      <AuthenticationProvider>
        <Routes>
          <Route
            path='/settings/finance-categories'
            element={<FinanceCategoriesSettingsPage />}
          />
        </Routes>
      </AuthenticationProvider>,
      {
        route: '/settings/finance-categories',
        namespace: packageMetadata.name,
        namespaces: { [packageMetadata.name]: enUS },
        fetch: answerApi(api),
        services: (app) => {
          app.container.instance(authenticationClientToken, { getSession });
          app.container.singleton(
            authorizationClientToken,
            (resolver) =>
              new AuthorizationClient(resolver.resolve(apiClientToken)),
          );
        },
      },
    );

    expect(
      await screen.findByText(enUS.finance.categories.title),
    ).toBeInTheDocument();
    const categoryRow = (await screen.findByText('HP')).closest('tr');
    expect(within(categoryRow!).getByText('10')).toBeInTheDocument();
    expect(
      within(categoryRow!).getByText(enUS.finance.categories.active),
    ).toBeInTheDocument();
  });
  it('creates a voucher with the fields the server validates', async () => {
    const user = userEvent.setup();
    await renderWithApp(
      <AuthenticationProvider>
        <Routes>
          <Route
            path='/finance/transactions'
            element={<FinanceTransactionsPage />}
          />
        </Routes>
      </AuthenticationProvider>,
      {
        route: '/finance/transactions',
        namespace: packageMetadata.name,
        namespaces: { [packageMetadata.name]: enUS },
        fetch: answerApi(api),
        services: (app) => {
          app.container.instance(authenticationClientToken, { getSession });
          app.container.singleton(
            authorizationClientToken,
            (resolver) =>
              new AuthorizationClient(resolver.resolve(apiClientToken)),
          );
        },
      },
    );

    await screen.findByText('PT-2026-0001');
    await user.click(
      screen.getByRole('button', {
        name: enUS.finance.transactions.createIncome,
      }),
    );
    const dialog = await screen.findByRole('dialog');
    // The options carry no `active` flag (they are active-only), and the form still preselects them.
    await user.type(within(dialog).getByPlaceholderText('0'), '1500000');
    await user.click(
      within(dialog).getByRole('button', {
        name: enUS.finance.transactions.save,
      }),
    );

    await waitFor(() =>
      expect(
        api.mock.calls.some(
          ([call]) =>
            call.method === 'POST' && call.path === 'finance/transactions',
        ),
      ).toBe(true),
    );
    const post = api.mock.calls.find(
      ([call]) =>
        call.method === 'POST' && call.path === 'finance/transactions',
    )![0];
    expect(post.json).toEqual({
      type: 'income',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      amount: 1500000,
      categoryId: 'c1',
      accountId: 'a1',
      branchId: 'b1',
      counterparty: null,
      description: null,
    });
  });
});
