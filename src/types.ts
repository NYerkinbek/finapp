export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
  color: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  color: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  toWalletId?: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  inputMethod: 'manual' | 'receipt' | 'voice' | 'notification';
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  period: 'monthly' | 'weekly';
  month: string;
}

export interface PlannedExpense {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  walletId: string;
  dueDate: string; // YYYY-MM-DD
  repeat: 'once' | 'monthly' | 'weekly' | 'yearly';
  isPaid: boolean;
}
