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
  createdById: string;
  createdAt: string;
  updatedAt: string;
  categoryName: string;
  categoryCode: string;
  accountName: string;
  accountCode: string;
  branchName: string;
  branchCode: string;
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
}
