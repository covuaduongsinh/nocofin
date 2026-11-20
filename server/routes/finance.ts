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
  type AppApiRouteContribution,
} from '@nocobase/app-server/router';
import { databaseManagerToken } from '@nocobase/db';
import { Hono, type Context } from 'hono';
import { z } from 'zod';

export type FinanceRouteEnv = {
  Variables: AuthEnv['Variables'] & AuthorizationEnv['Variables'];
};

import { categoriesSetting } from '../finance/resources.js';
import { FinanceService } from '../finance/service.js';

// Zod schemas for input validation
const OverviewQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  branchId: z.string().optional(),
});

const ListTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  branchId: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  search: z.string().optional(),
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
});

const UpdateTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.coerce.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  branchId: z.string().nullable().optional(),
  counterparty: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
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

export const financeRoutes: AppApiRouteContribution<Application> =
  defineApiRoutes((app) => {
    const router = new Hono();
    const routes = new Hono<FinanceRouteEnv>();

    const auth = app.container.resolve(authenticationToken);
    const authorization = app.container.resolve(authorizationToken);
    const db = app.container.resolve(databaseManagerToken);
    const service = new FinanceService(db.connection());

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
      apiValidator('json', CreateTransactionSchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.transactions' },
          'create',
          'FINANCE_TRANSACTIONS_CREATE_DENIED',
        );
        const session = c.get('auth');
        const userId = session?.user?.id ?? 'anonymous';
        const body = c.req.valid('json');
        const data = await service.createTransaction(body, userId);
        return c.json({ data });
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
      apiValidator('json', UpdateTransactionSchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.transactions' },
          'update',
          'FINANCE_TRANSACTIONS_UPDATE_DENIED',
        );
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const data = await service.updateTransaction(id, body);
        return c.json({ data });
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
      apiValidator('json', CreateAccountSchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.accounts' },
          'manage',
          'FINANCE_ACCOUNTS_MANAGE_DENIED',
        );
        const body = c.req.valid('json');
        const data = await service.createAccount(body);
        return c.json({ data });
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
      apiValidator('json', UpdateAccountSchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.accounts' },
          'manage',
          'FINANCE_ACCOUNTS_MANAGE_DENIED',
        );
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const data = await service.updateAccount(id, body);
        return c.json({ data });
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
      apiValidator('json', CreateBranchSchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.branches' },
          'manage',
          'FINANCE_BRANCHES_MANAGE_DENIED',
        );
        const body = c.req.valid('json');
        const data = await service.createBranch(body);
        return c.json({ data });
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
      apiValidator('json', UpdateBranchSchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'composite', id: 'finance.branches' },
          'manage',
          'FINANCE_BRANCHES_MANAGE_DENIED',
        );
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const data = await service.updateBranch(id, body);
        return c.json({ data });
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
      apiValidator('json', CreateCategorySchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'settings', id: categoriesSetting },
          'create',
          'FINANCE_CATEGORIES_CREATE_DENIED',
        );
        const body = c.req.valid('json');
        const data = await service.createCategory(body);
        return c.json({ data });
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
      apiValidator('json', UpdateCategorySchema),
      async (c) => {
        await assertCan(
          c,
          { type: 'settings', id: categoriesSetting },
          'update',
          'FINANCE_CATEGORIES_UPDATE_DENIED',
        );
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const data = await service.updateCategory(id, body);
        return c.json({ data });
      },
    );

    router.route('/finance', routes);
    return router;
  });

export default financeRoutes;
