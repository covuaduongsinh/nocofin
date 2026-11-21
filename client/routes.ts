import databaseExplorerRoutes from './pages/settings/database-explorer/routes.js';
import { createAppClientConfig } from '@nocobase/app-client';
import { readAppClientRuntimeConfig } from '@nocobase/app-client/runtime';
import { includeNotificationTemplateRoutes } from './pages/settings/notification-routes.js';
import {
  Home,
  TrendingUp,
  ReceiptText,
  Landmark,
  Building2,
  Trophy,
} from 'lucide-react';
import settingsShellRoutes from './pages/settings/shell-routes.js';
import systemSettingsRoutes from './pages/settings/routes.js';
import {
  defineAppRoutes,
  type AppClientRouteContribution,
} from '@nocobase/app-client/plugins';

const appRoutes: AppClientRouteContribution = defineAppRoutes([
  {
    // Every signed-in user reaches the landing page. `authz: 'skip'` takes it out of page authorization entirely, so
    // no permission change can leave a user signed in with nowhere to land.
    authz: 'skip',
    auth: 'required',
    componentLoader: () => import('./pages/home/index.js'),
    name: 'home',
    navigation: { title: 'navigation.home', icon: Home, order: 1 },
    path: '/',
  },
  {
    // Declares no navigation, so the application decides where its entry goes (for example a sidebar item with an
    // unread badge). The plugin's API answers each person's own messages only, so the page needs no authorization of
    // its own.
    authz: 'skip',
    auth: 'required',
    componentLoader: () => import('./pages/inbox.js'),
    name: 'inbox',
    path: '/inbox',
  },
  {
    auth: 'guest',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/login.js'),
    name: 'login',
    path: '/login',
  },
  {
    auth: 'guest',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/register.js'),
    name: 'register',
    path: '/register',
  },
  {
    auth: 'guest',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/forgot-password.js'),
    name: 'forgot-password',
    path: '/forgot-password',
  },
  {
    auth: 'guest',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/reset-password.js'),
    name: 'reset-password',
    path: '/reset-password',
  },
  {
    // Where a command line's sign-in sends the person to approve it (`pages/auth/device.tsx`). Optional rather than
    // required so it renders outside the shell, like the sign-in pages; the page sends a guest to sign in and back.
    auth: 'optional',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/device.js'),
    name: 'device',
    path: '/device',
  },
]);

const financeRoutes: AppClientRouteContribution = defineAppRoutes([
  {
    name: 'financeOverview',
    path: '/finance',
    auth: 'required',
    authz: {
      resource: { type: 'page', id: 'finance.overview' },
      action: 'access',
    },
    navigation: {
      title: 'navigation.financeOverview',
      icon: TrendingUp,
      order: 10,
    },
    breadcrumb: { title: 'navigation.financeOverview' },
    componentLoader: () => import('./pages/finance/index.js'),
  },
  {
    name: 'financeTransactions',
    path: '/finance/transactions',
    auth: 'required',
    authz: {
      resource: { type: 'page', id: 'finance.transactions' },
      action: 'access',
    },
    navigation: {
      title: 'navigation.financeTransactions',
      icon: ReceiptText,
      order: 20,
    },
    breadcrumb: { title: 'navigation.financeTransactions' },
    componentLoader: () => import('./pages/finance/transactions.js'),
  },
  {
    name: 'financeAccounts',
    path: '/finance/accounts',
    auth: 'required',
    authz: {
      resource: { type: 'page', id: 'finance.accounts' },
      action: 'access',
    },
    navigation: {
      title: 'navigation.financeAccounts',
      icon: Landmark,
      order: 30,
    },
    breadcrumb: { title: 'navigation.financeAccounts' },
    componentLoader: () => import('./pages/finance/accounts.js'),
  },
  {
    name: 'financeBranches',
    path: '/finance/branches',
    auth: 'required',
    authz: {
      resource: { type: 'page', id: 'finance.branches' },
      action: 'access',
    },
    navigation: {
      title: 'navigation.financeBranches',
      icon: Building2,
      order: 40,
    },
    breadcrumb: { title: 'navigation.financeBranches' },
    componentLoader: () => import('./pages/finance/branches.js'),
  },
  {
    // Tournament finance (phase 3): each tournament's budget, receipts, payments and result.
    name: 'financeTournaments',
    path: '/finance/tournaments',
    auth: 'required',
    authz: {
      resource: { type: 'page', id: 'finance.tournaments' },
      action: 'access',
    },
    navigation: {
      title: 'navigation.financeTournaments',
      icon: Trophy,
      order: 50,
    },
    breadcrumb: { title: 'navigation.financeTournaments' },
    componentLoader: () => import('./pages/finance/tournaments/index.js'),
    children: [
      {
        // Static, so it wins over :tournamentId.
        name: 'financeTournamentCreate',
        path: 'new',
        presentation: { kind: 'dialog', title: 'finance.tournaments.create' },
        componentLoader: () =>
          import('./pages/finance/tournaments/tournament-form.js'),
      },
      {
        // The tournament's page covers the list, which stays mounted with its filter.
        name: 'financeTournament',
        path: ':tournamentId',
        breadcrumb: { title: 'finance.tournaments.detail' },
        presentation: { kind: 'child-page' },
        componentLoader: () => import('./pages/finance/tournaments/detail.js'),
        children: [
          {
            name: 'financeTournamentEdit',
            path: 'edit',
            presentation: {
              kind: 'dialog',
              title: 'finance.tournaments.edit',
            },
            componentLoader: () =>
              import('./pages/finance/tournaments/tournament-form.js'),
          },
          {
            name: 'financeTournamentBudget',
            path: 'budget',
            presentation: {
              kind: 'dialog',
              title: 'finance.tournaments.budgetForm.title',
            },
            componentLoader: () =>
              import('./pages/finance/tournaments/budget-form.js'),
          },
        ],
      },
    ],
  },
]);

// The System settings shell stays registered: it shows only the modules a viewer may open, and none until the
// application or its plugins contribute one. Business administration such as `./pages/settings/routes.js` joins it.
export function createApplicationRoutes(
  rawConfig: unknown = readAppClientRuntimeConfig(),
): readonly AppClientRouteContribution[] {
  const config = createAppClientConfig({ rawConfig });
  return includeNotificationTemplateRoutes(
    [
      appRoutes,
      financeRoutes,
      settingsShellRoutes,
      systemSettingsRoutes,
      databaseExplorerRoutes,
    ],
    config.get<boolean>('notificationTemplates.invitationConfigured') === true,
  );
}

const routes: readonly AppClientRouteContribution[] = createApplicationRoutes();

export default routes;
