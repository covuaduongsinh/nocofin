import {
  defineDatabasePermission,
  recordAccess,
} from '@nocobase/app-plugin-authorization/server';
import { defineCompositeResource } from '@nocobase/authorization/core';

// The finance permission model: what the product supports and what each operation may read and write. Portable on
// purpose (no database or container access), so the role seed reuses the same references.
//
// Phase 1 offers "all records" as the only data range: reports aggregate whole collections, and per-branch ranges need
// a person-to-branch assignment model that does not exist yet (see docs/plans).

export interface FinBranch {
  id: string;
  code: string;
  name: string;
  kind: string;
  active: boolean;
  note: string | null;
}
export interface FinAccount {
  id: string;
  code: string;
  name: string;
  kind: string;
  bankName: string | null;
  accountNumber: string | null;
  openingBalance: number | string;
  active: boolean;
  note: string | null;
}
export interface FinCategory {
  id: string;
  code: string;
  name: string;
  type: string;
  sort: number;
  active: boolean;
}
export interface FinTransaction {
  id: string;
  code: string;
  type: string;
  date: string;
  period: string;
  amount: number | string;
  categoryId: string;
  accountId: string;
  branchId: string | null;
  counterparty: string | null;
  description: string | null;
  /** The tournament the voucher belongs to (phase 3), if any. */
  tournamentId: string | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
export type TournamentStatus = 'planning' | 'ongoing' | 'closed';
export interface FinTournament {
  id: string;
  code: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date | null;
  branchId: string | null;
  venue: string | null;
  status: TournamentStatus;
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
export interface FinTournamentBudget {
  id: string;
  tournamentId: string;
  categoryId: string;
  amount: number | string;
}

// Titles are translation keys in the application's namespace (its package name); see client/locales.
const title = (key: string, _english: string) => ({
  key: `finance.permissions.${key}`,
  ns: 'nocofin',
});

const branchFields = ['id', 'code', 'name', 'kind', 'active', 'note'] as const;
const accountFields = [
  'id',
  'code',
  'name',
  'kind',
  'bankName',
  'accountNumber',
  'openingBalance',
  'active',
  'note',
] as const;
const categoryFields = [
  'id',
  'code',
  'name',
  'type',
  'sort',
  'active',
] as const;
const transactionFields = [
  'id',
  'code',
  'type',
  'date',
  'period',
  'amount',
  'categoryId',
  'accountId',
  'branchId',
  'counterparty',
  'description',
  'tournamentId',
  'createdById',
  'createdAt',
  'updatedAt',
] as const;
// What an edit may change: the voucher number and its type (the number's prefix), creator and creation time are fixed
// once issued.
const transactionEditable = [
  'date',
  'period',
  'amount',
  'categoryId',
  'accountId',
  'branchId',
  'counterparty',
  'description',
  'tournamentId',
  'updatedAt',
] as const;

const branchData = defineDatabasePermission((p) =>
  p
    .collection<FinBranch>('finBranches')
    .title(title('branches', 'Branches'))
    .read([...branchFields])
    .options(recordAccess.allRecords)
    .default(recordAccess.allRecords),
);
const accountData = defineDatabasePermission((p) =>
  p
    .collection<FinAccount>('finAccounts')
    .title(title('accounts', 'Fund accounts'))
    .read([...accountFields])
    .options(recordAccess.allRecords)
    .default(recordAccess.allRecords),
);
const categoryData = defineDatabasePermission((p) =>
  p
    .collection<FinCategory>('finCategories')
    .title(title('categories', 'Categories'))
    .read([...categoryFields])
    .options(recordAccess.allRecords)
    .default(recordAccess.allRecords),
);
const tournamentFields = [
  'id',
  'code',
  'name',
  'startDate',
  'endDate',
  'branchId',
  'venue',
  'status',
  'note',
  'createdAt',
  'updatedAt',
] as const;
// The code is allocated once; everything else, the status included, is edited through manage.
const tournamentEditable = [
  'name',
  'startDate',
  'endDate',
  'branchId',
  'venue',
  'status',
  'note',
  'updatedAt',
] as const;
const budgetFields = ['id', 'tournamentId', 'categoryId', 'amount'] as const;

const tournamentData = defineDatabasePermission((p) =>
  p
    .collection<FinTournament>('finTournaments')
    .title(title('tournaments', 'Tournaments'))
    .read([...tournamentFields])
    .options(recordAccess.allRecords)
    .default(recordAccess.allRecords),
);
const budgetData = defineDatabasePermission((p) =>
  p
    .collection<FinTournamentBudget>('finTournamentBudgets')
    .title(title('tournamentBudgets', 'Tournament budgets'))
    .read([...budgetFields])
    .options(recordAccess.allRecords)
    .default(recordAccess.allRecords),
);
const transactionData = defineDatabasePermission((p) =>
  p
    .collection<FinTransaction>('finTransactions')
    .title(title('transactions', 'Vouchers'))
    .read([...transactionFields])
    .options(recordAccess.allRecords)
    .default(recordAccess.allRecords),
);

export const transactions = defineCompositeResource(
  'finance.transactions',
  (r) =>
    r
      .title(title('transactions', 'Receipts and payments'))
      // Viewing a voucher shows the names of its category, account and branch.
      .action('view', (a) =>
        a
          .title(title('view', 'View'))
          .grant('finTransactions', transactionData)
          .grant('finCategories', categoryData)
          .grant('finAccounts', accountData)
          .grant('finBranches', branchData),
      )
      // A new voucher may only name an active category, account and branch, which the server reads to check.
      .action('create', (a) =>
        a
          .title(title('create', 'Create'))
          .grant(
            'finTransactions',
            transactionData.create([...transactionFields]),
          )
          .grant('finCategories', categoryData)
          .grant('finAccounts', accountData)
          .grant('finBranches', branchData),
      )
      .action('update', (a) =>
        a
          .title(title('update', 'Edit'))
          .grant(
            'finTransactions',
            transactionData.update([...transactionEditable]),
          )
          .grant('finCategories', categoryData)
          .grant('finAccounts', accountData)
          .grant('finBranches', branchData),
      )
      .action('delete', (a) =>
        a
          .title(title('delete', 'Delete'))
          .grant('finTransactions', transactionData.delete()),
      ),
);

export const accounts = defineCompositeResource('finance.accounts', (r) =>
  r
    .title(title('accounts', 'Fund accounts'))
    // The list shows each account's balance, which is computed from its vouchers.
    .action('view', (a) =>
      a
        .title(title('view', 'View'))
        .grant('finAccounts', accountData)
        .grant('finTransactions', transactionData),
    )
    .action('manage', (a) =>
      a
        .title(title('manage', 'Add and edit'))
        .grant(
          'finAccounts',
          accountData
            .create([...accountFields])
            .update(accountFields.filter((field) => field !== 'id')),
        ),
    ),
);

export const branches = defineCompositeResource('finance.branches', (r) =>
  r
    .title(title('branches', 'Branches'))
    .action('view', (a) =>
      a.title(title('view', 'View')).grant('finBranches', branchData),
    )
    .action('manage', (a) =>
      a
        .title(title('manage', 'Add and edit'))
        .grant(
          'finBranches',
          branchData
            .create([...branchFields])
            .update(branchFields.filter((field) => field !== 'id')),
        ),
    ),
);

export const reports = defineCompositeResource('finance.reports', (r) =>
  r
    .title(title('reports', 'Financial overview'))
    .action('view', (a) =>
      a
        .title(title('view', 'View'))
        .grant('finTransactions', transactionData)
        .grant('finCategories', categoryData)
        .grant('finAccounts', accountData)
        .grant('finBranches', branchData),
    ),
);

// Tournament finance (phase 3). Vouchers linked to a tournament are still created under finance.transactions; these
// actions cover the tournament itself, its budget and its report.
export const tournaments = defineCompositeResource('finance.tournaments', (r) =>
  r
    .title(title('tournaments', 'Tournaments'))
    // The report shows budget against the actual vouchers, with their category, account and branch names.
    .action('view', (a) =>
      a
        .title(title('view', 'View'))
        .grant('finTournaments', tournamentData)
        .grant('finTournamentBudgets', budgetData)
        .grant('finTransactions', transactionData)
        .grant('finCategories', categoryData)
        .grant('finAccounts', accountData)
        .grant('finBranches', branchData),
    )
    // Create and edit tournaments, replace their budget, settle (close) and reopen them.
    .action('manage', (a) =>
      a
        .title(title('manageTournaments', 'Create, budget and settle'))
        .grant(
          'finTournaments',
          tournamentData
            .create([...tournamentFields])
            .update([...tournamentEditable]),
        )
        .grant(
          'finTournamentBudgets',
          budgetData
            .create([...budgetFields])
            .update(['amount'])
            .delete(),
        )
        .grant('finCategories', categoryData)
        .grant('finBranches', branchData),
    ),
);

/** The settings item behind System settings → Income and expense categories. */
export const categoriesSetting = 'finance.categories';

export const financeCollections = [
  { name: 'finBranches', title: title('branches', 'Branches') },
  { name: 'finAccounts', title: title('accounts', 'Fund accounts') },
  { name: 'finCategories', title: title('categories', 'Categories') },
  { name: 'finTransactions', title: title('transactions', 'Vouchers') },
  { name: 'finTournaments', title: title('tournaments', 'Tournaments') },
  {
    name: 'finTournamentBudgets',
    title: title('tournamentBudgets', 'Tournament budgets'),
  },
] as const;
