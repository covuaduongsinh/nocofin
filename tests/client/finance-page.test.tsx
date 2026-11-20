import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  apiClientToken,
} from '@nocobase/app-client';
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
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';

import FinanceOverviewPage from '../../client/pages/finance/index.js';
import FinanceTransactionsPage from '../../client/pages/finance/transactions.js';
import FinanceAccountsPage from '../../client/pages/finance/accounts.js';
import FinanceBranchesPage from '../../client/pages/finance/branches.js';
import FinanceCategoriesSettingsPage from '../../client/pages/settings/finance-categories.js';
import packageMetadata from '../../package.json' with { type: 'json' };
import enUS from '../../client/locales/en-US.js';

const getSession = vi.fn(async () => ({
  data: {
    user: { id: 'admin-id', name: 'Super Admin', email: 'admin@nocobase.com' },
    session: { id: 'session-id' },
  },
  error: null,
}));

let permissions: AuthorizationSnapshot;
const api = vi.fn(({ method, path }: ApiCall) => {
  if (method === 'GET' && path === 'authorization/permissions')
    return { data: permissions };
  if (method === 'GET' && path.startsWith('finance/overview')) {
    return {
      data: {
        period: '2026-11',
        totalIncome: 10000000,
        totalExpense: 4000000,
        netFlow: 6000000,
        totalAvailableFunds: 50000000,
        branches: [],
        accounts: [],
        incomeCategories: [],
        expenseCategories: [],
        dailyFlow: [],
      },
    };
  }
  if (method === 'GET' && (path === 'finance/options' || path === 'finance/transactions/options')) {
    return {
      data: {
        branches: [{ id: 'b1', name: 'CS 1', code: 'CS1', kind: 'club', isActive: true }],
        accounts: [{ id: 'a1', name: 'MB Bank', code: 'MB1', kind: 'bank', isActive: true }],
        categories: [{ id: 'c1', name: 'Học phí', code: 'HP', type: 'income', isActive: true }],
      },
    };
  }
  if (method === 'GET' && path.startsWith('finance/transactions')) {
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };
  }
  if (method === 'GET' && path.startsWith('finance/accounts')) {
    return {
      data: [{ id: 'a1', name: 'MB Bank', code: 'MB1', kind: 'bank', balance: 50000000, isActive: true }],
    };
  }
  if (method === 'GET' && path.startsWith('finance/branches')) {
    return {
      data: [{ id: 'b1', name: 'CS 1', code: 'CS1', kind: 'club', isActive: true }],
    };
  }
  if (method === 'GET' && path.startsWith('finance/categories')) {
    return {
      data: [{ id: 'c1', name: 'Học phí', code: 'HP', type: 'income', isActive: true }],
    };
  }
  return new Response(null, { status: 404 });
});

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

    expect(await screen.findByText(enUS.finance.overview.title)).toBeInTheDocument();
  });

  it('renders FinanceTransactionsPage', async () => {
    await renderWithApp(
      <AuthenticationProvider>
        <Routes>
          <Route path='/finance/transactions' element={<FinanceTransactionsPage />} />
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

    expect(await screen.findByText(enUS.finance.transactions.title)).toBeInTheDocument();
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

    expect(await screen.findByText(enUS.finance.accounts.title)).toBeInTheDocument();
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

    expect(await screen.findByText(enUS.finance.branches.title)).toBeInTheDocument();
  });

  it('renders FinanceCategoriesSettingsPage', async () => {
    await renderWithApp(
      <AuthenticationProvider>
        <Routes>
          <Route path='/settings/finance-categories' element={<FinanceCategoriesSettingsPage />} />
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

    expect(await screen.findByText(enUS.finance.categories.title)).toBeInTheDocument();
  });
});
