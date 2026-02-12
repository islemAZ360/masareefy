export type Language = 'en' | 'ar' | 'ru';
export type Currency = 'USD' | 'SAR' | 'RUB' | 'AED' | 'EGP';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export type WalletType = 'spending' | 'savings';

// --- View State Definition (Fixed) ---
export type ViewState =
  | 'dashboard'
  | 'transactions'
  | 'add'
  | 'reports'
  | 'settings'
  | 'onboarding'
  | 'ai-advisor'
  | 'simulator';

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

// --- New Features Types ---

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string;
  color: string;
  icon: string;
}

export interface DebtRecord {
  id: string;
  person: string;
  amount: number;
  type: 'lent' | 'borrowed';
  date: string;
  dueDate?: string;
  isPaid: boolean;
  note?: string;
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
  salaryInterval?: number;
  nextSalaryDate?: string;

  // Budgeting
  selectedPlan?: PlanType;
  dailyLimit?: number;
  recurringBills?: RecurringBill[];

  // Advanced Features
  savingsGoals?: SavingsGoal[];
  debts?: DebtRecord[];

  // System
  isAIMode: boolean;
}

export interface ExpenseCategory {
  id: string;
  name_en: string;
  name_ar: string;
  name_ru: string;
  icon: string;
  color: string;
}

// --- Titan Simulator Types ---

export interface TimelinePoint {
  date: string;
  balance: number;
  event?: string;
}

export interface TitanScenario {
  id: 'collapse' | 'warrior' | 'wealth';
  name: string;
  description: string;
  color: string;
  timeline: TimelinePoint[];
  finalBalance: number;
}

export interface RiskAlert {
  billName: string;
  date: string;
  severity: 'high' | 'critical';
  message: string;
}

export interface LifeEnergy {
  hoursOfWork: number;
  daysOfLife: number;
  sacrifice: string;
}

export interface TitanAnalysis {
  scenarios: TitanScenario[];
  risks: RiskAlert[];
  lifeEnergy: LifeEnergy;
  aiVerdict: string;
}