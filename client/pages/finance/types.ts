export type TransactionType = 'income' | 'expense';

export interface FinanceCategory {
  id: string;
  code: string;
  name: string;
  type: TransactionType;
  sortOrder: number;
  isActive: boolean;
}

export interface FinanceAccount {
  id: string;
  code: string;
  name: string;
  kind: 'bank' | 'cash' | 'ewallet';
  bankName?: string | null;
  accountNumber?: string | null;
  openingBalance: number;
  currentBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
  isActive: boolean;
  note?: string | null;
}

export interface FinanceBranch {
  id: string;
  code: string;
  name: string;
  kind: 'club' | 'school' | 'office';
  isActive: boolean;
  note?: string | null;
}

export interface FinanceTransaction {
  id: string;
  code: string;
  type: TransactionType;
  branchId: string;
  accountId: string;
  categoryId: string;
  amount: number;
  transactionDate: string;
  counterparty?: string | null;
  description?: string | null;
  referenceNo?: string | null;
  note?: string | null;
  branchName?: string;
  branchCode?: string;
  accountName?: string;
  accountCode?: string;
  categoryName?: string;
  categoryCode?: string;
  createdAt: string;
}

export interface FinanceOverviewData {
  period: string;
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  totalAvailableFunds: number;
  branches: Array<{
    id: string;
    code: string;
    name: string;
    income: number;
    expense: number;
    net: number;
  }>;
  accounts: Array<{
    id: string;
    code: string;
    name: string;
    kind: string;
    bankName?: string | null;
    accountNumber?: string | null;
    openingBalance: number;
    currentBalance: number;
    income: number;
    expense: number;
  }>;
  incomeCategories: Array<{
    name: string;
    code: string;
    total: number;
  }>;
  expenseCategories: Array<{
    name: string;
    code: string;
    total: number;
  }>;
  dailyFlow: Array<{
    date: string;
    income: number;
    expense: number;
    net: number;
  }>;
}

export interface FinanceOptionsData {
  branches: FinanceBranch[];
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
}
