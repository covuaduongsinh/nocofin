import {
  authenticationToken,
  type AuthEnv,
} from '@nocobase/app-plugin-authentication';
import {
  authorizationToken,
  type AuthorizationEnv,
} from '@nocobase/app-plugin-authorization';
import type { Application } from '@nocobase/app-server/application';
import {
  ApiError,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  defineApiRoutes,
  describeRoute,
  executeIdempotentMutation,
  type AppApiRouteContribution,
} from '@nocobase/app-server/router';
import { databaseManagerToken, type DatabaseConnection } from '@nocobase/db';
import { Hono, type Context } from 'hono';
import { z } from 'zod';

export type FinanceRouteEnv = {
  Variables: AuthEnv['Variables'] & AuthorizationEnv['Variables'];
};

import { categoriesSetting } from '../finance/resources.js';
import { FinanceService } from '../finance/service.js';
import {
  TournamentService,
  tournamentStatuses,
} from '../finance/tournaments.js';

// Zod schemas for input validation
const OverviewQuerySchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  branchId: z.string().optional(),
});

const ListTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  branchId: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  search: z.string().optional(),
  tournamentId: z.string().optional(),
});

const CreateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  branchId: z.string().nullable().optional(),
  counterparty: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  tournamentId: z.string().nullable().optional(),
});

const UpdateTransactionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  amount: z.coerce.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  branchId: z.string().nullable().optional(),
  counterparty: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  tournamentId: z.string().nullable().optional(),
});

const CreateAccountSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  kind: z.enum(['bank', 'cash', 'ewallet']),
  bankName: z.string().max(120).nullable().optional(),
  accountNumber: z.string().max(64).nullable().optional(),
  openingBalance: z.coerce.number().optional(),
  active: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  kind: z.enum(['bank', 'cash', 'ewallet']).optional(),
  bankName: z.string().max(120).nullable().optional(),
  accountNumber: z.string().max(64).nullable().optional(),
  openingBalance: z.coerce.number().optional(),
  active: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

const CreateBranchSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  kind: z.string().min(1).max(16),
  active: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

const UpdateBranchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  kind: z.string().min(1).max(16).optional(),
  active: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

const CreateCategorySchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  type: z.enum(['income', 'expense']),
  sort: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  type: z.enum(['income', 'expense']).optional(),
  sort: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const ListTournamentsQuerySchema = z.object({
  status: z.enum(tournamentStatuses).optional(),
});

const CreateTournamentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  startDate: calendarDate,
  endDate: calendarDate.nullable().optional(),
  branchId: z.string().nullable().optional(),
  venue: z.string().max(200).nullable().optional(),
  status: z.enum(tournamentStatuses).optional(),
  note: z.string().max(1000).nullable().optional(),
});

const UpdateTournamentSchema = CreateTournamentSchema.partial();

const SaveBudgetsSchema = z.object({
  budgets: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        amount: z.coerce.number().int().min(0),
      }),
    )
    .max(200),
});

// Every finance write takes the operation key the client's submission controller sends (docs: references/
// submission.md). The receipt and the business write share one transaction, so a double click, Enter plus click or a
// retry after a lost response answers the first result instead of writing again.
const IdempotencyHeaderSchema = z.object({
  'idempotency-key': z.string().min(1),
});

export const financeRoutes: AppApiRouteContribution<Application> =
  defineApiRoutes((app) => {
    const router = new Hono();
    const routes = new Hono<FinanceRouteEnv>();

    const auth = app.container.resolve(authenticationToken);
    const authorization = app.container.resolve(authorizationToken);
    const db = app.container.resolve(databaseManagerToken);
    const connection = db.connection();
    const service = new FinanceService(connection);
    const tournamentService = new TournamentService(connection);

    // Security: All finance routes require authentication and authorization context
    routes.use('*', auth.required(), authorization.middleware());

    const assertCan = async (
      c: Context<FinanceRouteEnv>,
      resource: { type: 'composite' | 'settings'; id: string },
      action: string,
      reason: string,
    ) => {
      const allowed = await c.get('authz').can({ resource, action });
      if (!allowed) {
        throw new ApiError({
          status: 'PERMISSION_DENIED',
          reason,
          domain: 'finance',
          message: `Action ${action} on ${resource.id} is not permitted.`,
        });
      }
    };

    // auth.required() has run, so a session is present; the check keeps the type honest.
    const userIdOf = (c: Context<FinanceRouteEnv>) => {
      const id = c.get('auth')?.user.id;
      if (!id)
        throw new ApiError({
          status: 'UNAUTHENTICATED',
          reason: 'FINANCE_SESSION_REQUIRED',
          domain: 'finance',
          message: 'Sign in to change finance records.',
        });
      return id;
    };

    type Resource = { type: 'composite' | 'settings'; id: string };
    const guard =
      (
        c: Context<FinanceRouteEnv>,
        resource: Resource,
        action: string,
        reason: string,
      ) =>
      () =>
        assertCan(c, resource, action, reason);

    /**
     * Runs a write once per operation key: the permission is checked on every attempt, replays answer the stored
     * result with `Idempotency-Replayed: true`, and `execute` must write only through the transaction it is given.
     */
    const mutate = async <T>(
      c: Context<FinanceRouteEnv>,
      options: {
        operation: string;
        input: unknown;
        authorize: () => Promise<void>;
        authorizeReplay: () => Promise<void>;
        execute: (transaction: DatabaseConnection) => Promise<T>;
      },
    ) => {
      const key = c.req.header('idempotency-key');
      if (!key)
        throw new ApiError({
          status: 'INVALID_ARGUMENT',
          reason: 'IDEMPOTENCY_KEY_REQUIRED',
          domain: 'finance',
          message: 'Finance writes require an Idempotency-Key header.',
        });
      const result = await executeIdempotentMutation({
        connection,
        key,
        principal: `${app.appName}:${userIdOf(c)}`,
        operation: `finance/${options.operation}`,
        input: options.input,
        authorize: options.authorize,
        authorizeReplay: options.authorizeReplay,
        execute: options.execute,
      });
      c.header('Idempotency-Replayed', String(result.replayed));
      return c.json({ data: result.data });
    };

    // 1. Overview Reports
    routes.get(
      '/overview',
      describeRoute({
        tags: ['Finance'],
        summary: 'Get financial overview and KPIs',
        operationId: 'getFinanceOverview',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('query', OverviewQuerySchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.reports' },
          'view',
          'FINANCE_REPORTS_DENIED',
        );
        const query = c.req.valid('query');
        const data = await service.getOverview(query);
        return c.json({ data });
      },
    );

    // 2. Transactions
    routes.get(
      '/transactions',
      describeRoute({
        tags: ['Finance'],
        summary: 'List transactions with filters and pagination',
        operationId: 'listFinanceTransactions',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('query', ListTransactionsQuerySchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.transactions' },
          'view',
          'FINANCE_TRANSACTIONS_VIEW_DENIED',
        );
        const query = c.req.valid('query');
        const data = await service.listTransactions(query);
        return c.json({ data });
      },
    );

    routes.get(
      '/transactions/options',
      describeRoute({
        tags: ['Finance'],
        summary: 'Get options for transaction form',
        operationId: 'getFinanceTransactionOptions',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.transactions' },
          'view',
          'FINANCE_TRANSACTIONS_VIEW_DENIED',
        );
        const data = await service.getOptions();
        return c.json({ data });
      },
    );

    routes.get(
      '/options',
      describeRoute({
        tags: ['Finance'],
        summary: 'Get finance options for branches, accounts and categories',
        operationId: 'getFinanceOptions',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.transactions' },
          'view',
          'FINANCE_TRANSACTIONS_VIEW_DENIED',
        );
        const data = await service.getOptions();
        return c.json({ data });
      },
    );

    routes.post(
      '/transactions',
      describeRoute({
        tags: ['Finance'],
        summary: 'Create a receipt or payment voucher',
        operationId: 'createFinanceTransaction',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', CreateTransactionSchema),
      async (c) => {
        const resource = {
          type: 'composite',
          id: 'finance.transactions',
        } as const;
        const userId = userIdOf(c);
        const body = c.req.valid('json');
        return mutate(c, {
          operation: 'transactions/create',
          input: body,
          authorize: guard(
            c,
            resource,
            'create',
            'FINANCE_TRANSACTIONS_CREATE_DENIED',
          ),
          authorizeReplay: guard(
            c,
            resource,
            'view',
            'FINANCE_TRANSACTIONS_VIEW_DENIED',
          ),
          execute: (trx) => service.createTransaction(body, userId, trx),
        });
      },
    );

    routes.patch(
      '/transactions/:id',
      describeRoute({
        tags: ['Finance'],
        summary: 'Update a transaction voucher',
        operationId: 'updateFinanceTransaction',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('param', z.object({ id: z.string() })),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', UpdateTransactionSchema),
      async (c) => {
        const resource = {
          type: 'composite',
          id: 'finance.transactions',
        } as const;
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        return mutate(c, {
          operation: `transactions/${id}/update`,
          input: body,
          authorize: guard(
            c,
            resource,
            'update',
            'FINANCE_TRANSACTIONS_UPDATE_DENIED',
          ),
          authorizeReplay: guard(
            c,
            resource,
            'view',
            'FINANCE_TRANSACTIONS_VIEW_DENIED',
          ),
          execute: (trx) => service.updateTransaction(id, body, trx),
        });
      },
    );

    routes.delete(
      '/transactions/:id',
      describeRoute({
        tags: ['Finance'],
        summary: 'Delete a transaction voucher',
        operationId: 'deleteFinanceTransaction',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('param', z.object({ id: z.string() })),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.transactions' },
          'delete',
          'FINANCE_TRANSACTIONS_DELETE_DENIED',
        );
        const { id } = c.req.valid('param');
        const data = await service.deleteTransaction(id);
        return c.json({ data });
      },
    );

    // 3. Accounts
    routes.get(
      '/accounts',
      describeRoute({
        tags: ['Finance'],
        summary: 'List fund accounts with computed balances',
        operationId: 'listFinanceAccounts',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.accounts' },
          'view',
          'FINANCE_ACCOUNTS_VIEW_DENIED',
        );
        const data = await service.listAccounts();
        return c.json({ data });
      },
    );

    routes.post(
      '/accounts',
      describeRoute({
        tags: ['Finance'],
        summary: 'Create a fund account',
        operationId: 'createFinanceAccount',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', CreateAccountSchema),
      async (c) => {
        const resource = { type: 'composite', id: 'finance.accounts' } as const;
        const body = c.req.valid('json');
        return mutate(c, {
          operation: 'accounts/create',
          input: body,
          authorize: guard(
            c,
            resource,
            'manage',
            'FINANCE_ACCOUNTS_MANAGE_DENIED',
          ),
          authorizeReplay: guard(
            c,
            resource,
            'view',
            'FINANCE_ACCOUNTS_VIEW_DENIED',
          ),
          execute: (trx) => service.createAccount(body, trx),
        });
      },
    );

    routes.patch(
      '/accounts/:id',
      describeRoute({
        tags: ['Finance'],
        summary: 'Update a fund account',
        operationId: 'updateFinanceAccount',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('param', z.object({ id: z.string() })),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', UpdateAccountSchema),
      async (c) => {
        const resource = { type: 'composite', id: 'finance.accounts' } as const;
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        return mutate(c, {
          operation: `accounts/${id}/update`,
          input: body,
          authorize: guard(
            c,
            resource,
            'manage',
            'FINANCE_ACCOUNTS_MANAGE_DENIED',
          ),
          authorizeReplay: guard(
            c,
            resource,
            'view',
            'FINANCE_ACCOUNTS_VIEW_DENIED',
          ),
          execute: (trx) => service.updateAccount(id, body, trx),
        });
      },
    );

    // 4. Branches
    routes.get(
      '/branches',
      describeRoute({
        tags: ['Finance'],
        summary: 'List branches',
        operationId: 'listFinanceBranches',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.branches' },
          'view',
          'FINANCE_BRANCHES_VIEW_DENIED',
        );
        const data = await service.listBranches();
        return c.json({ data });
      },
    );

    routes.post(
      '/branches',
      describeRoute({
        tags: ['Finance'],
        summary: 'Create a branch',
        operationId: 'createFinanceBranch',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', CreateBranchSchema),
      async (c) => {
        const resource = { type: 'composite', id: 'finance.branches' } as const;
        const body = c.req.valid('json');
        return mutate(c, {
          operation: 'branches/create',
          input: body,
          authorize: guard(
            c,
            resource,
            'manage',
            'FINANCE_BRANCHES_MANAGE_DENIED',
          ),
          authorizeReplay: guard(
            c,
            resource,
            'view',
            'FINANCE_BRANCHES_VIEW_DENIED',
          ),
          execute: (trx) => service.createBranch(body, trx),
        });
      },
    );

    routes.patch(
      '/branches/:id',
      describeRoute({
        tags: ['Finance'],
        summary: 'Update a branch',
        operationId: 'updateFinanceBranch',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('param', z.object({ id: z.string() })),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', UpdateBranchSchema),
      async (c) => {
        const resource = { type: 'composite', id: 'finance.branches' } as const;
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        return mutate(c, {
          operation: `branches/${id}/update`,
          input: body,
          authorize: guard(
            c,
            resource,
            'manage',
            'FINANCE_BRANCHES_MANAGE_DENIED',
          ),
          authorizeReplay: guard(
            c,
            resource,
            'view',
            'FINANCE_BRANCHES_VIEW_DENIED',
          ),
          execute: (trx) => service.updateBranch(id, body, trx),
        });
      },
    );

    // 5. Categories (Settings)
    routes.get(
      '/categories',
      describeRoute({
        tags: ['Finance'],
        summary: 'List income and expense categories',
        operationId: 'listFinanceCategories',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator(
        'query',
        z.object({ type: z.enum(['income', 'expense']).optional() }),
      ),
      async (c) => {
        await assertCan(
          c,
          { type: 'settings', id: categoriesSetting },
          'read',
          'FINANCE_CATEGORIES_READ_DENIED',
        );
        const { type } = c.req.valid('query');
        const data = await service.listCategories(type);
        return c.json({ data });
      },
    );

    routes.post(
      '/categories',
      describeRoute({
        tags: ['Finance'],
        summary: 'Create an income or expense category',
        operationId: 'createFinanceCategory',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', CreateCategorySchema),
      async (c) => {
        const resource = { type: 'settings', id: categoriesSetting } as const;
        const body = c.req.valid('json');
        return mutate(c, {
          operation: 'categories/create',
          input: body,
          authorize: guard(
            c,
            resource,
            'create',
            'FINANCE_CATEGORIES_CREATE_DENIED',
          ),
          authorizeReplay: guard(
            c,
            resource,
            'read',
            'FINANCE_CATEGORIES_READ_DENIED',
          ),
          execute: (trx) => service.createCategory(body, trx),
        });
      },
    );

    routes.patch(
      '/categories/:id',
      describeRoute({
        tags: ['Finance'],
        summary: 'Update an income or expense category',
        operationId: 'updateFinanceCategory',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('param', z.object({ id: z.string() })),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', UpdateCategorySchema),
      async (c) => {
        const resource = { type: 'settings', id: categoriesSetting } as const;
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        return mutate(c, {
          operation: `categories/${id}/update`,
          input: body,
          authorize: guard(
            c,
            resource,
            'update',
            'FINANCE_CATEGORIES_UPDATE_DENIED',
          ),
          authorizeReplay: guard(
            c,
            resource,
            'read',
            'FINANCE_CATEGORIES_READ_DENIED',
          ),
          execute: (trx) => service.updateCategory(id, body, trx),
        });
      },
    );

    // 6. Tournaments (phase 3)
    const tournamentsResource = {
      type: 'composite',
      id: 'finance.tournaments',
    } as const;
    const canViewTournaments = (c: Context<FinanceRouteEnv>) =>
      guard(c, tournamentsResource, 'view', 'FINANCE_TOURNAMENTS_VIEW_DENIED');
    const canManageTournaments = (c: Context<FinanceRouteEnv>) =>
      guard(
        c,
        tournamentsResource,
        'manage',
        'FINANCE_TOURNAMENTS_MANAGE_DENIED',
      );

    routes.get(
      '/tournaments',
      describeRoute({
        tags: ['Finance'],
        summary: 'List tournaments with their receipts, payments and result',
        operationId: 'listFinanceTournaments',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('query', ListTournamentsQuerySchema),
      async (c) => {
        await canViewTournaments(c)();
        const data = await tournamentService.listTournaments(
          c.req.valid('query'),
        );
        return c.json({ data });
      },
    );

    routes.post(
      '/tournaments',
      describeRoute({
        tags: ['Finance'],
        summary: 'Create a tournament (its code GD-YYYY-NN is allocated)',
        operationId: 'createFinanceTournament',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', CreateTournamentSchema),
      async (c) => {
        const body = c.req.valid('json');
        return mutate(c, {
          operation: 'tournaments/create',
          input: body,
          authorize: canManageTournaments(c),
          authorizeReplay: canViewTournaments(c),
          execute: (trx) => tournamentService.createTournament(body, trx),
        });
      },
    );

    routes.get(
      '/tournaments/:id',
      describeRoute({
        tags: ['Finance'],
        summary:
          'Tournament report: details, budget against actual per category, totals and vouchers',
        operationId: 'getFinanceTournament',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('param', z.object({ id: z.string() })),
      async (c) => {
        await canViewTournaments(c)();
        const { id } = c.req.valid('param');
        const data = await tournamentService.getReport(id);
        return c.json({ data });
      },
    );

    routes.patch(
      '/tournaments/:id',
      describeRoute({
        tags: ['Finance'],
        summary: 'Update a tournament, change its status, settle or reopen it',
        operationId: 'updateFinanceTournament',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('param', z.object({ id: z.string() })),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', UpdateTournamentSchema),
      async (c) => {
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        return mutate(c, {
          operation: `tournaments/${id}/update`,
          input: body,
          authorize: canManageTournaments(c),
          authorizeReplay: canViewTournaments(c),
          execute: (trx) => tournamentService.updateTournament(id, body, trx),
        });
      },
    );

    routes.put(
      '/tournaments/:id/budgets',
      describeRoute({
        tags: ['Finance'],
        summary: 'Replace the whole budget of a tournament',
        operationId: 'saveFinanceTournamentBudgets',
        responses: { 200: dataResponse(z.unknown()), ...apiErrorResponses },
      }),
      apiValidator('param', z.object({ id: z.string() })),
      apiValidator('header', IdempotencyHeaderSchema),
      apiValidator('json', SaveBudgetsSchema),
      async (c) => {
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        return mutate(c, {
          operation: `tournaments/${id}/budgets`,
          input: body,
          authorize: canManageTournaments(c),
          authorizeReplay: canViewTournaments(c),
          execute: (trx) =>
            tournamentService.saveBudgets(id, body.budgets, trx),
        });
      },
    );

    router.route('/finance', routes);
    return router;
  });

export default financeRoutes;
