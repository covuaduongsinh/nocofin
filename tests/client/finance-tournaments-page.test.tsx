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
import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router';

import FinanceTournamentsPage from '../../client/pages/finance/tournaments/index.js';
import FinanceTournamentDetailPage from '../../client/pages/finance/tournaments/detail.js';
import FinanceTransactionsPage from '../../client/pages/finance/transactions.js';
import type {
  FinanceTournamentReport,
  FinanceTransactionPage,
} from '../../client/pages/finance/types.js';
import enUS from '../../client/locales/en-US.js';
import packageMetadata from '../../package.json' with { type: 'json' };
import {
  optionsWithTournaments,
  tournamentReport,
  tournamentSummary,
} from '../fixtures/finance-tournaments.js';

// The fixtures are checked against a real application's responses in tests/server/finance-tournaments-api.test.ts.

const getSession = vi.fn(async () => ({
  data: {
    user: { id: 'admin-id', name: 'Super Admin', email: 'admin@nocobase.com' },
    session: { id: 'session-id' },
  },
  error: null,
}));

let permissions: AuthorizationSnapshot;
let report: FinanceTournamentReport;

const emptyPage: FinanceTransactionPage = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 20,
};

const api = vi.fn(({ method, path }: ApiCall) => {
  if (method === 'GET' && path === 'authorization/permissions')
    return { data: permissions };
  if (method === 'GET' && path === 'finance/tournaments')
    return { data: [tournamentSummary] };
  if (method === 'GET' && path === 'finance/tournaments/tour-1')
    return { data: report };
  if (method === 'GET' && path === 'finance/options')
    return { data: optionsWithTournaments };
  if (method === 'GET' && path === 'finance/transactions')
    return { data: emptyPage };
  if (method === 'POST' && path === 'finance/transactions')
    return { data: report.vouchers[1] };
  if (method === 'PATCH' && path === 'finance/tournaments/tour-1')
    return { data: { ...report.tournament, status: 'closed' } };
  return new Response(null, { status: 404 });
});

const calls = (method: string, path: string) =>
  api.mock.calls
    .map(([call]) => call)
    .filter((call) => call.method === method && call.path === path);

const render = (element: ReactElement, path: string, route: string) =>
  renderWithApp(
    <AuthenticationProvider>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </AuthenticationProvider>,
    {
      route,
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

const copy = enUS.finance.tournaments;

describe('Tournament finance pages', () => {
  beforeEach(() => {
    api.mockClear();
    report = structuredClone(tournamentReport);
    permissions = { unrestricted: true, permissions: [] };
  });

  it('lists tournaments as cards with their result, and filters by status', async () => {
    const user = userEvent.setup();
    await render(
      <FinanceTournamentsPage />,
      '/finance/tournaments/*',
      '/finance/tournaments',
    );

    const card = (await screen.findByText(tournamentSummary.name)).closest('a');
    expect(card).not.toBeNull();
    const inCard = within(card!);
    expect(inCard.getByText('GD-2026-01')).toBeInTheDocument();
    expect(inCard.getByText(copy.status.ongoing)).toBeInTheDocument();
    // Receipts, payments and the result come from totalIncome, totalExpense and net.
    expect(inCard.getByText(/^4\.500\.000/)).toBeInTheDocument();
    expect(inCard.getByText(/^3\.500\.000/)).toBeInTheDocument();
    expect(inCard.getByText(/^\+1\.000\.000/)).toBeInTheDocument();
    expect(card).toHaveAttribute('href', '/finance/tournaments/tour-1');
    expect(
      await screen.findByRole('button', { name: new RegExp(copy.add) }),
    ).toHaveAttribute('href', '/finance/tournaments/new');

    await user.click(screen.getByRole('combobox', { name: copy.statusLabel }));
    await user.click(
      await screen.findByRole('option', { name: copy.status.closed }),
    );
    await waitFor(() =>
      expect(
        api.mock.calls.some(
          ([call]) =>
            call.method === 'GET' &&
            call.path === 'finance/tournaments' &&
            call.query?.status === 'closed',
        ),
      ).toBe(true),
    );
  });

  it('shows budget against actual, highlights overspending and records a payment for the tournament once', async () => {
    const user = userEvent.setup();
    await render(
      <FinanceTournamentDetailPage />,
      '/finance/tournaments/:tournamentId/*',
      '/finance/tournaments/tour-1',
    );

    expect(
      await screen.findByRole('heading', { name: tournamentSummary.name }),
    ).toBeInTheDocument();
    // KPIs: the spent share of the expense budget.
    expect(screen.getByText('88%')).toBeInTheDocument();
    // The prizes line spent above its budget and says so; the referees line did not.
    const prizes = screen
      .getByText('Giải thưởng, cúp, huy chương', { selector: 'span' })
      .closest('tr');
    expect(prizes).toHaveAttribute('data-over-budget', 'true');
    expect(within(prizes!).getByText(copy.overBudget)).toBeInTheDocument();
    expect(within(prizes!).getByText(/^\+500\.000/)).toBeInTheDocument();
    const referees = screen
      .getByText('Thù lao trọng tài & ban tổ chức', { selector: 'span' })
      .closest('tr');
    expect(referees).not.toHaveAttribute('data-over-budget');
    // The tournament's vouchers.
    expect(screen.getByText('PT-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('PC-2026-0001')).toBeInTheDocument();

    await user.click(
      await screen.findByRole('button', { name: copy.createExpense }),
    );
    const dialog = await screen.findByRole('dialog');
    // The tournament is fixed to this one.
    expect(
      within(dialog).getByRole('combobox', {
        name: enUS.finance.voucherForm.tournament,
      }),
    ).toHaveTextContent('GD-2026-01');
    await user.type(within(dialog).getByPlaceholderText('0'), '200000');
    // A double click is one operation: one request.
    await user.dblClick(
      within(dialog).getByRole('button', {
        name: enUS.finance.transactions.save,
      }),
    );
    await waitFor(() =>
      expect(calls('POST', 'finance/transactions')).toHaveLength(1),
    );
    const post = calls('POST', 'finance/transactions')[0];
    expect(post.json).toEqual({
      type: 'expense',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      amount: 200000,
      categoryId: 'cat-prizes',
      accountId: 'a1',
      // The host branch and the tournament are prefilled.
      branchId: 'b1',
      tournamentId: 'tour-1',
      counterparty: null,
      description: null,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('settles the tournament after confirming', async () => {
    const user = userEvent.setup();
    await render(
      <FinanceTournamentDetailPage />,
      '/finance/tournaments/:tournamentId/*',
      '/finance/tournaments/tour-1',
    );
    await user.click(await screen.findByRole('button', { name: copy.close }));
    const confirm = await screen.findByRole('alertdialog');
    expect(
      within(confirm).getByText(copy.closeConfirmTitle),
    ).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: copy.close }));
    await waitFor(() =>
      expect(calls('PATCH', 'finance/tournaments/tour-1')).toHaveLength(1),
    );
    expect(calls('PATCH', 'finance/tournaments/tour-1')[0].json).toEqual({
      status: 'closed',
    });
  });

  it('makes a settled tournament read-only', async () => {
    report.tournament.status = 'closed';
    await render(
      <FinanceTournamentDetailPage />,
      '/finance/tournaments/:tournamentId/*',
      '/finance/tournaments/tour-1',
    );
    expect(await screen.findByText(copy.closedNotice)).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: copy.reopen }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: copy.createIncome }),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: copy.editBudget })).toBeNull();
  });

  it('offers open tournaments in the cash book voucher form', async () => {
    const user = userEvent.setup();
    await render(
      <FinanceTransactionsPage />,
      '/finance/transactions',
      '/finance/transactions',
    );
    await screen.findByText(enUS.finance.transactions.empty);
    await user.click(
      screen.getByRole('button', {
        name: enUS.finance.transactions.createIncome,
      }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('0'), '50000');
    await user.click(
      within(dialog).getByRole('combobox', {
        name: enUS.finance.voucherForm.tournament,
      }),
    );
    await user.click(
      await screen.findByRole('option', {
        name: 'GD-2026-01 · Giải cờ vua Dương Sinh mở rộng',
      }),
    );
    await user.click(
      within(dialog).getByRole('button', {
        name: enUS.finance.transactions.save,
      }),
    );
    await waitFor(() =>
      expect(calls('POST', 'finance/transactions')).toHaveLength(1),
    );
    expect(calls('POST', 'finance/transactions')[0].json).toMatchObject({
      type: 'income',
      amount: 50000,
      tournamentId: 'tour-1',
    });
  });
});
