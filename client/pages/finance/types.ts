// The wire shapes of the /api/finance endpoints. They mirror what server/finance/service.ts returns (and the columns of
// database/main/migrations/202611200001_create_finance.ts); tests/server/finance-api.test.ts asserts the same field
// names against a real application, so a rename on either side must change both.

export type TransactionType = 'income' | 'expense';

export interface FinanceCategory {
  id: string;
  code: string;
  name: string;
  type: TransactionType;
  sort: number;
  active: boolean;
}

export interface FinanceAccount {
  id: string;
  code: string;
  name: string;
  kind: 'bank' | 'cash' | 'ewallet';
  bankName: string | null;
  accountNumber: string | null;
  openingBalance: number;
  /** Opening balance plus all receipts minus all payments recorded on the account. */
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  active: boolean;
  note: string | null;
}

export interface FinanceBranch {
  id: string;
  code: string;
  name: string;
  kind: 'club' | 'school' | 'office';
  active: boolean;
  note: string | null;
}

export interface FinanceTransaction {
  id: string;
  code: string;
  type: TransactionType;
  /** The voucher's business date, YYYY-MM-DD. */
  date: string;
  /** The voucher's month, YYYY-MM. */
  period: string;
  amount: number;
  categoryId: string;
  accountId: string;
  /** Null for a company-wide voucher not attributed to a branch. */
  branchId: string | null;
  counterparty: string | null;
  description: string | null;
  /** The tournament the voucher belongs to, if any (GET finance/tournaments/:id lists them). */
  tournamentId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  categoryName: string;
  categoryCode: string;
  accountName: string;
  accountCode: string;
  branchName: string;
  branchCode: string;
  /** Empty when the voucher belongs to no tournament. */
  tournamentCode: string;
  tournamentName: string;
}

/** GET finance/transactions */
export interface FinanceTransactionPage {
  rows: FinanceTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FinanceCategoryAmount {
  id: string;
  code: string;
  name: string;
  amount: number;
  /** Whole-number share of the period's income (or expense) total. */
  percentage: number;
}

/** GET finance/overview */
export interface FinanceOverviewData {
  period: string;
  branchId: string | null;
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  totalAvailableFunds: number;
  branches: Array<
    FinanceBranch & {
      totalIncome: number;
      totalExpense: number;
      netFlow: number;
    }
  >;
  accounts: FinanceAccount[];
  incomeCategories: FinanceCategoryAmount[];
  expenseCategories: FinanceCategoryAmount[];
  dailyFlow: Array<{
    date: string;
    income: number;
    expense: number;
  }>;
}

/** GET finance/options: only active records, which is why they carry no `active` flag. */
export interface FinanceOptionsData {
  branches: Array<Pick<FinanceBranch, 'id' | 'code' | 'name'>>;
  accounts: Array<
    Pick<
      FinanceAccount,
      'id' | 'code' | 'name' | 'kind' | 'bankName' | 'accountNumber'
    >
  >;
  categories: Array<
    Pick<FinanceCategory, 'id' | 'code' | 'name' | 'type' | 'sort'>
  >;
  /** Tournaments a voucher may still be linked to: every one that is not settled. */
  tournaments: Array<
    Pick<FinanceTournament, 'id' | 'code' | 'name' | 'branchId' | 'status'>
  >;
}

// Tournament finance (phase 3): server/finance/tournaments.ts; tests/server/finance-tournaments-api.test.ts asserts
// these shapes against a real application.

export type TournamentStatus = 'planning' | 'ongoing' | 'closed';

export interface FinanceTournament {
  id: string;
  /** GD-YYYY-NN */
  code: string;
  name: string;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string | null;
  branchId: string | null;
  venue: string | null;
  status: TournamentStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET finance/tournaments */
export interface FinanceTournamentSummary extends FinanceTournament {
  /** Null when no branch hosts it. */
  branchName: string | null;
  totalIncome: number;
  totalExpense: number;
  /** totalIncome - totalExpense */
  net: number;
  budgetIncome: number;
  budgetExpense: number;
  voucherCount: number;
}

export interface FinanceTournamentCategoryLine {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  type: TransactionType;
  budget: number;
  actual: number;
  /** actual - budget */
  variance: number;
  /** An expense line spent above its budget. */
  overBudget: boolean;
}

/** GET finance/tournaments/:id */
export interface FinanceTournamentReport {
  tournament: FinanceTournament & { branchName: string | null };
  totals: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    budgetIncome: number;
    budgetExpense: number;
    budgetNet: number;
    /** Whole percentage of the expense budget spent; null without an expense budget. */
    expenseRatio: number | null;
    voucherCount: number;
  };
  /** Every category with a budget or a voucher: income first, then expense, in dictionary order. */
  categories: FinanceTournamentCategoryLine[];
  vouchers: FinanceTransaction[];
}
