// src/app/models/expense.model.ts
export interface Expense {
  expenseId?: number;
  projectId: number;
  projectName?: string;
  submittedById: number;
  submittedByName?: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseRequest {
  projectId: number;
  submittedBy: number;
  category: string;
  amount: number;
  description?: string;
  date: string;
  status: ExpenseStatus;
  receiptUrl?: string;
}

export interface ExpenseResponse {
  expenseId: number;
  projectId: number;
  projectName: string;
  submittedById: number;
  submittedByName: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  status: ExpenseStatus;
  receiptUrl: string;
  createdAt: string;
  updatedAt: string;
}

export enum ExpenseStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID'
}

export interface ExpenseFilter {
  projectId?: number;
  userId?: number;
  category?: string;
  status?: ExpenseStatus;
  startDate?: string;
  endDate?: string;
}