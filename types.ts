export type Language = 'en' | 'ar' | 'ru';
export type Currency = 'USD' | 'SAR' | 'RUB' | 'AED' | 'EGP';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export type WalletType = 'spending' | 'savings';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO string YYYY-MM-DD
  vendor?: string;
  note?: string;
  type: TransactionType;
  wallet: WalletType;
  isRecurring?: boolean;
}

export type PlanType = 'austerity' | 'balanced' | 'comfort';

export interface BudgetPlan {
  type: PlanType;
  dailyLimit: number;
  monthlySavingsProjected: number;
  description_en: string;
  description_ar: string;
  description_ru: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  lastPaidDate?: string; // ISO Date string
}

export interface UserSettings {
  name: string;
  email?: string;
  photoURL?: string;
  apiKey: string;
  currency: Currency;
  language: Language;
  isOnboarded: boolean;
  isGuest?: boolean;
  
  // Financial Context
  // Spending Wallet Info
  spendingBankName: string;
  spendingBankColor: string;
  spendingTextColor: string;
  currentBalance: number; 
  
  // Savings Wallet Info
  savingsBankName: string;
  savingsBankColor: string;
  savingsTextColor: string;
  savingsBalance: number; 
  
  // Salary Logic
  lastSalaryDate?: string;
  lastSalaryAmount?: number;
  salaryInterval?: number; // Days
  nextSalaryDate?: string; // Calculated
  
  // Budgeting
  selectedPlan?: PlanType;
  dailyLimit?: number;
  recurringBills?: RecurringBill[];
}

export interface ExpenseCategory {
  id: string;
  name_en: string;
  name_ar: string;
  name_ru: string;
  icon: string;
  color: string;
}

export type ViewState = 'dashboard' | 'transactions' | 'add' | 'reports' | 'settings' | 'onboarding' | 'ai-advisor';