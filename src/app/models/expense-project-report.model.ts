export interface ExpenseProjectReport {
  projectId: number;
  projectName?: string;
  totalExpenses: number;
  expenseCount: number;
  expensesByCategory: { [key: string]: number };
  expensesByStatus: { [key: string]: number };
}

export enum ExpenseStatus {
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW'
}

export interface Expense {
  expenseId: number;
  amount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  projectId: number;
  submittedBy: number;
  category: string;
  description: string;
  receiptUrl: string;
  status: ExpenseStatus;
}