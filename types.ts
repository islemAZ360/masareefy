export type Language = 'en' | 'ar' | 'ru';
export type Currency = 'USD' | 'SAR' | 'RUB' | 'AED';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO string
  vendor?: string;
  note?: string;
  type: TransactionType;
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
  currentBalance: number;
  lastSalaryDate?: string;
  lastSalaryAmount?: number;
  nextSalaryDate?: string;
  nextSalaryAmount?: number;
  salaryFrequency?: 'monthly' | 'bi-weekly' | 'weekly';
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