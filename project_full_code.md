# Project Code Dump
Generated: 15/1/2026, 06:00:24

## 🌳 Project Structure
```text
├── components
  ├── AIAdvisor.tsx
  ├── BudgetPlans.tsx
  ├── Dashboard.tsx
  ├── Onboarding.tsx
  ├── RecurringBills.tsx
  ├── Reports.tsx
  └── TransactionItem.tsx
├── services
  ├── firebase.ts
  └── geminiService.ts
├── .env.local
├── App.tsx
├── constants.tsx
├── declarations.d.ts
├── index.html
├── index.tsx
├── metadata.json
├── package.json
├── README.md
├── tsconfig.json
├── types.ts
└── vite.config.ts
```

## 📄 File Contents

### File: `components\AIAdvisor.tsx`
```tsx
import React, { useState } from 'react';
import { Transaction, UserSettings } from '../types';
import { getDeepFinancialAnalysis } from '../services/geminiService';
import { BrainCircuit, Loader2, X, Download, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TRANSLATIONS } from '../constants';

interface Props {
  user: UserSettings;
  transactions: Transaction[];
  onClose: () => void;
}

export const AIAdvisor: React.FC<Props> = ({ user, transactions, onClose }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = TRANSLATIONS[user.language];

  const generateReport = async () => {
    // Guest check
    if (user.isGuest || !user.apiKey) {
        return;
    }

    setLoading(true);
    try {
      const result = await getDeepFinancialAnalysis(
        transactions,
        user.currentBalance,
        user.currency,
        user.language,
        user.apiKey
      );
      setReport(result);
    } catch (e) {
      setReport("Failed to generate report. Please check your API key and connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Masareefy_Report_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger generation on mount if not exists and not guest
  React.useEffect(() => {
    if (!report && !user.isGuest) generateReport();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-10">
      <div className="max-w-2xl mx-auto mt-10 mb-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-sber-green rounded-2xl flex items-center justify-center shadow-lg shadow-sber-green/20">
                <BrainCircuit className="text-white w-6 h-6" />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-white">
                 {user.language === 'ar' ? 'المستشار المالي الذكي' : user.language === 'ru' ? 'Финансовый советник' : 'AI Financial Advisor'}
               </h2>
               <p className="text-xs text-gray-400">Powered by Gemini</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {user.isGuest ? (
             <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                    <Lock className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Feature Locked</h3>
                <p className="text-gray-400 max-w-sm">
                    {user.language === 'ar' 
                     ? 'المستشار المالي الذكي يحتاج إلى مفتاح API. يرجى إضافته من الإعدادات.' 
                     : 'The AI Advisor requires a valid Gemini API Key. Please add one in Settings to unlock this feature.'}
                </p>
                <button 
                  onClick={onClose}
                  className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-700"
                >
                  Close
                </button>
             </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <Loader2 className="w-16 h-16 text-sber-green animate-spin" />
            <p className="text-gray-400 animate-pulse text-center max-w-xs">
              {user.language === 'ar' 
                ? 'جاري تحليل نفقاتك، وكشف الأخطاء، وإعداد خطة احترافية...' 
                : 'Analyzing your spending patterns, finding mistakes, and generating a professional report...'}
            </p>
          </div>
        ) : (
          <div className="bg-sber-card border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <div className={`prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-sber-green max-w-none ${user.language === 'ar' ? 'text-right' : 'text-left'}`} dir={user.language === 'ar' ? 'rtl' : 'ltr'}>
                <ReactMarkdown
                   components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-sber-green mb-4 border-b border-zinc-700 pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-8 mb-4 flex items-center gap-2 before:content-['•'] before:text-sber-green" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 text-gray-300 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800" {...props} />,
                      li: ({node, ...props}) => <li className="marker:text-sber-green" {...props} />,
                      strong: ({node, ...props}) => <strong className="text-sber-green font-bold bg-sber-green/10 px-1 rounded" {...props} />,
                   }}
                >
                  {report || ''}
                </ReactMarkdown>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button 
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl border border-zinc-700"
              >
                  <Download className="w-5 h-5" />
                  {t.download_report}
              </button>
              <button 
                  onClick={onClose}
                  className="flex-1 bg-sber-green hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-sber-green/20"
              >
                  {t.close_report}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```
---

### File: `components\BudgetPlans.tsx`
```tsx
import React from 'react';
import { UserSettings, BudgetPlan, PlanType } from '../types';
import { Shield, Scale, Coffee, CheckCircle } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface Props {
  user: UserSettings;
  onSelectPlan: (plan: BudgetPlan) => void;
}

export const BudgetPlans: React.FC<Props> = ({ user, onSelectPlan }) => {
  const t = TRANSLATIONS[user.language];

  // Logic to calculate budget
  // 1. Calculate days remaining in month (or until next salary)
  const today = new Date();
  const nextSalary = user.nextSalaryDate ? new Date(user.nextSalaryDate) : new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const diffTime = Math.abs(nextSalary.getTime() - today.getTime());
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  // 2. Base Daily Budget = Current Balance / Days
  const baseDaily = (user.currentBalance > 0 ? user.currentBalance : 0) / daysRemaining;

  const plans: BudgetPlan[] = [
    {
      type: 'austerity',
      dailyLimit: Math.floor(baseDaily * 0.6), // 60% of base
      monthlySavingsProjected: Math.floor(baseDaily * 0.4 * daysRemaining),
      description_en: 'Strict savings mode. Essentials only.',
      description_ar: 'وضع توفير صارم. للضروريات فقط.',
      description_ru: 'Строгий режим экономии. Только необходимое.',
    },
    {
      type: 'balanced',
      dailyLimit: Math.floor(baseDaily * 0.85), // 85% of base
      monthlySavingsProjected: Math.floor(baseDaily * 0.15 * daysRemaining),
      description_en: 'Smart balance between life and savings.',
      description_ar: 'توازن ذكي بين الحياة والادخار.',
      description_ru: 'Разумный баланс между жизнью и сбережениями.',
    },
    {
      type: 'comfort',
      dailyLimit: Math.floor(baseDaily * 1.0), // 100% of base
      monthlySavingsProjected: 0,
      description_en: 'Spend your full available budget comfortably.',
      description_ar: 'صرف الميزانية المتاحة بالكامل براحة.',
      description_ru: 'Комфортно тратьте весь доступный бюджет.',
    }
  ];

  const getIcon = (type: PlanType) => {
    switch(type) {
      case 'austerity': return <Shield className="w-8 h-8 text-yellow-500" />;
      case 'balanced': return <Scale className="w-8 h-8 text-sber-green" />;
      case 'comfort': return <Coffee className="w-8 h-8 text-blue-400" />;
    }
  };

  const getTitle = (type: PlanType) => {
    if (user.language === 'ar') {
      return type === 'austerity' ? 'التقشف' : type === 'balanced' ? 'التوازن' : 'الراحة';
    }
    if (user.language === 'ru') {
        return type === 'austerity' ? 'Аскетизм' : type === 'balanced' ? 'Баланс' : 'Комфорт';
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold px-2">{user.language === 'ar' ? 'خطط الميزانية المقترحة' : user.language === 'ru' ? 'Рекомендуемые планы' : 'Suggested Budget Plans'}</h3>
      <div className="grid grid-cols-1 gap-4">
        {plans.map((plan) => {
          const isSelected = user.selectedPlan === plan.type;
          return (
            <button
              key={plan.type}
              onClick={() => onSelectPlan(plan)}
              className={`relative p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 text-left ${
                isSelected 
                  ? 'bg-sber-green/10 border-sber-green shadow-[0_0_20px_rgba(33,160,56,0.3)]' 
                  : 'bg-sber-card border-zinc-800 hover:border-zinc-600'
              }`}
            >
              {isSelected && <div className="absolute top-3 right-3"><CheckCircle className="text-sber-green w-5 h-5" /></div>}
              
              <div className="bg-black/40 p-3 rounded-full">
                {getIcon(plan.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-lg">{getTitle(plan.type)}</h4>
                  <span className="font-mono font-bold text-white text-lg">{plan.dailyLimit} <span className="text-xs text-gray-400">{user.currency}/day</span></span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  {user.language === 'ar' ? plan.description_ar : user.language === 'ru' ? plan.description_ru : plan.description_en}
                </p>
                {plan.monthlySavingsProjected > 0 && (
                   <div className="inline-block bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full font-bold">
                      {user.language === 'ar' ? 'توفير متوقع: ' : 'Save: '} +{plan.monthlySavingsProjected}
                   </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
```
---

### File: `components\Dashboard.tsx`
```tsx
import React from 'react';
import { UserSettings, Transaction, TransactionType, BudgetPlan } from '../types';
import { TRANSLATIONS } from '../constants';
import { Wallet, ArrowUpRight, BrainCircuit, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { TransactionItem } from './TransactionItem';
import { BudgetPlans } from './BudgetPlans';
import { RecurringBills } from './RecurringBills';

interface Props {
  user: UserSettings;
  transactions: Transaction[];
  onSelectPlan: (plan: BudgetPlan) => void;
  onOpenAI: () => void;
  onChangeView: (view: any) => void;
  onPayBill: (billId: string, date: string, deduct: boolean) => void;
  onAddBill: (name: string, amount: number) => void;
  onDeleteBill: (id: string) => void;
}

export const Dashboard: React.FC<Props> = ({ user, transactions, onSelectPlan, onOpenAI, onChangeView, onPayBill, onAddBill, onDeleteBill }) => {
  const t = TRANSLATIONS[user.language];

  const transactionsAfterSnapshot = transactions.filter(t => !t.id.startsWith('init-'));
  const incomeDiff = transactionsAfterSnapshot.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + Number(t.amount), 0);
  const expenseDiff = transactionsAfterSnapshot.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + Number(t.amount), 0);
  
  const displayBalance = (user.currentBalance || 0) + incomeDiff - expenseDiff;

  // Plan Progress Calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySpent = transactions
    .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(todayStr))
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const dailyLimit = user.dailyLimit || 0;
  const progressPercent = dailyLimit > 0 ? Math.min((todaySpent / dailyLimit) * 100, 100) : 0;
  const isOverBudget = todaySpent > dailyLimit;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {user.isGuest && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex items-center gap-3">
              <Lock className="text-yellow-500 w-5 h-5" />
              <p className="text-xs text-yellow-500 font-medium">
                  {t.guest_warning}
              </p>
          </div>
      )}

      {/* Balance Card - Premium Design */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 border border-white/10 shadow-[0_20px_50px_-12px_rgba(33,160,56,0.3)] group hover:scale-[1.01] transition-transform duration-300">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-[#0F0F11] z-0"></div>
        {/* Subtle Noise Texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-sber-green/30 rounded-full blur-[80px] opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-900/40 rounded-full blur-[80px] opacity-40"></div>

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-white/5 p-2 rounded-full backdrop-blur-sm border border-white/5">
                         <Wallet className="w-4 h-4 text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-medium text-xs tracking-widest uppercase">{t.balance}</p>
                </div>
                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-sber-green animate-pulse"></div>
                    <span className="text-[9px] text-gray-300 font-bold tracking-widest">LIVE</span>
                </div>
            </div>

            <h1 className="text-5xl font-bold text-white mb-8 tracking-tighter tabular-nums">
            {displayBalance.toLocaleString()} <span className="text-2xl font-light text-sber-green opacity-80">{user.currency}</span>
            </h1>
            
            {/* Active Plan Daily Tracker */}
            {user.selectedPlan && (
            <div className="mb-6 bg-white/5 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5">
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <span className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wide">
                            {user.language === 'ar' ? 'مصروف اليوم' : 'Daily Allowance'}
                        </span>
                        <div className="flex items-baseline gap-2">
                             <span className={`text-2xl font-bold tabular-nums ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                                {todaySpent.toLocaleString()}
                            </span>
                            <span className="text-sm text-gray-500 font-medium">/ {dailyLimit}</span>
                        </div>
                    </div>
                    <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg tracking-wider border ${isOverBudget ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-sber-green/10 text-sber-green border-sber-green/20'}`}>
                        {isOverBudget ? 'OVER LIMIT' : 'ON TRACK'}
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-700 ease-out rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-sber-green'}`} 
                        style={{ width: `${progressPercent}%` }} 
                    />
                </div>
            </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-[1.2rem] border border-white/5 flex items-center gap-3 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-sber-green/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-sber-green" />
                    </div>
                    <div>
                         <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">{t.income}</p>
                         <p className="font-bold text-white tabular-nums text-sm">+{transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white/5 p-4 rounded-[1.2rem] border border-white/5 flex items-center gap-3 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                         <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">{t.expense}</p>
                         <p className="font-bold text-white tabular-nums text-sm">-{transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* AI Advisor Banner */}
      <button 
        onClick={onOpenAI}
        className="w-full group bg-gradient-to-r from-sber-green/10 to-transparent p-[1px] rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform duration-300 active:scale-95"
      >
         <div className="bg-[#1C1C1E] rounded-[1.4rem] p-5 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sber-green/10 blur-[50px] rounded-full"></div>
            
            <div className="flex items-center gap-4 relative z-10">
                <div className="bg-gradient-to-br from-sber-green to-emerald-700 p-3.5 rounded-2xl shadow-lg shadow-sber-green/20 group-hover:rotate-6 transition-transform duration-300">
                    <BrainCircuit className="text-white w-6 h-6" />
                </div>
                <div className="text-left">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        {user.language === 'ar' ? 'تحليل مالي عميق' : 'Deep Financial Analysis'}
                        <span className="bg-sber-green text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">AI</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        {user.language === 'ar' ? 'احصل على تقرير احترافي' : 'Get a professional Gemini report'}
                    </p>
                </div>
            </div>
            <div className="bg-zinc-800 p-2 rounded-full group-hover:bg-zinc-700 transition-colors relative z-10">
                 <ArrowUpRight className="text-gray-400 w-5 h-5 group-hover:text-white" />
            </div>
         </div>
      </button>

      {/* Recurring Bills */}
      <RecurringBills user={user} onPayBill={onPayBill} onAddBill={onAddBill} onDeleteBill={onDeleteBill} />

      {/* Budget Plans Selector */}
      <BudgetPlans user={user} onSelectPlan={onSelectPlan} />

      {/* Recent Txs */}
      <div>
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-bold text-white">{t.recent_transactions}</h2>
          <button onClick={() => onChangeView('transactions')} className="text-sber-green text-xs font-bold uppercase tracking-wider hover:underline">{t.transactions}</button>
        </div>
        <div className="space-y-2">
          {transactions.slice(0, 4).map(tx => (
            <TransactionItem key={tx.id} transaction={tx} currency={user.currency} language={user.language} />
          ))}
        </div>
      </div>
    </div>
  );
};
```
---

### File: `components\Onboarding.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { UserSettings, Currency, Language, RecurringBill, Transaction, TransactionType } from '../types';
import { TRANSLATIONS } from '../constants';
import { validateApiKey, analyzeOnboardingData, OnboardingAnalysisResult } from '../services/geminiService';
import { signInWithGoogle, auth } from '../services/firebase';
import { Wallet, Check, ImageIcon, DollarSign, Upload, Zap, ArrowRight, Plus, Trash2, UserCircle2, Lock, ChevronLeft, Globe, Key, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  user: UserSettings;
  setUser: React.Dispatch<React.SetStateAction<UserSettings>>;
  onComplete: (result: OnboardingAnalysisResult, nextSalaryDate: string, nextSalaryAmount: number, bills: RecurringBill[]) => void;
}

// Helper: Calendar Grid
const CalendarGrid = ({ 
    selectedDate, 
    onSelectDate 
  }: { 
    selectedDate: string, 
    onSelectDate: (d: string) => void 
  }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
  
    // Next month preview
    const nextMonthDays = 35 - days.length;
    for(let i=1; i<= nextMonthDays; i++) days.push(`N-${i}`);
  
    return (
      <div className="bg-sber-card p-4 rounded-xl border border-zinc-800">
         <div className="text-center font-bold mb-4 text-white">
           {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
         </div>
         <div className="grid grid-cols-7 gap-1 text-center">
           {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-xs text-gray-500 mb-2">{d}</div>)}
           {days.map((day, idx) => {
             if (!day) return <div key={idx}></div>;
             if (typeof day === 'string') return <div key={idx} className="text-gray-700 text-sm py-2">{day.split('-')[1]}</div>;
             
             const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
             const isSelected = selectedDate === dateStr;
             
             return (
               <button 
                 key={idx}
                 onClick={() => onSelectDate(dateStr)}
                 className={`text-sm py-2 rounded-full transition-colors ${isSelected ? 'bg-sber-green text-white font-bold' : 'text-gray-300 hover:bg-zinc-800'}`}
               >
                 {day}
               </button>
             )
           })}
         </div>
      </div>
    );
  };

export const Onboarding: React.FC<Props> = ({ user, setUser, onComplete }) => {
  const t = TRANSLATIONS[user.language];
  // 0: Auth Selection, 1: Profile Details, 2: Bal, 3: Sal, 4: Exp, 5: Bills, 6: Analyze, 7: Plan
  const [step, setStep] = useState(0); 
  const [isValidating, setIsValidating] = useState(false);
  
  // API Key Validation State
  const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [salaryFile, setSalaryFile] = useState<File | null>(null);
  const [expenseFiles, setExpenseFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<OnboardingAnalysisResult | null>(null);
  
  // Recurring Bills State
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');

  // Planning State
  const [plannedNextSalaryDate, setPlannedNextSalaryDate] = useState<string>('');
  const [plannedNextSalaryAmount, setPlannedNextSalaryAmount] = useState<number>(0);

  // Update text direction when language changes
  useEffect(() => {
    document.documentElement.dir = user.language === 'ar' ? 'rtl' : 'ltr';
  }, [user.language]);

  // Pre-fill API Key from Env if available
  useEffect(() => {
    if (process.env.API_KEY && !user.apiKey) {
      setUser(prev => ({ ...prev, apiKey: process.env.API_KEY || '' }));
    }
  }, []);

  // --- Actions ---

  const toggleLanguage = () => {
    const nextLang = user.language === 'en' ? 'ar' : user.language === 'ar' ? 'ru' : 'en';
    setUser(prev => ({ ...prev, language: nextLang }));
  };

  const handleGoogleSignIn = async () => {
    // Check if auth is initialized before attempting sign-in
    if (!auth) {
        alert("Google Sign-In is unavailable because Firebase is not configured.");
        return;
    }
    
    try {
        const googleUser = await signInWithGoogle();
        if (googleUser) {
            setUser(prev => ({
                ...prev,
                name: googleUser.displayName || prev.name,
                email: googleUser.email || undefined,
                photoURL: googleUser.photoURL || undefined,
                isGuest: false
            }));
            setStep(1); // Move to Profile Setup
        }
    } catch (e) {
        console.error("Google Sign in failed", e);
        alert("Google Sign In failed. Please check your internet or configuration.");
    }
  };

  const handleGuestSelect = () => {
    // Treat "Guest" as manual setup user (Not strictly isGuest=true to allow AI features if key provided)
    setUser(prev => ({ ...prev, isGuest: false, name: '' })); 
    setStep(1); // Move to Profile Setup
  };

  const checkApiKey = async () => {
    if (!user.apiKey.trim()) return;
    setKeyStatus('validating');
    try {
        const isValid = await validateApiKey(user.apiKey.trim());
        setKeyStatus(isValid ? 'valid' : 'invalid');
    } catch (e) {
        setKeyStatus('invalid');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user.name.trim()) return alert(t.enter_name);
    if (!user.apiKey.trim()) return alert(t.enter_key);
    
    // If already validated, proceed
    if (keyStatus === 'valid') {
        setStep(2);
        return;
    }
    
    setIsValidating(true);
    try {
      const isValid = await validateApiKey(user.apiKey.trim());
      if (isValid) {
        setUser(u => ({ ...u, apiKey: u.apiKey.trim() }));
        setStep(2); // Move to Balance Upload
      } else {
        setKeyStatus('invalid');
        alert(t.invalid_key_error);
      }
    } catch { 
        alert("Error connecting to API"); 
    } finally { 
        setIsValidating(false); 
    }
  };

  const handleAddBill = () => {
    if (newBillName && newBillAmount) {
      setRecurringBills([...recurringBills, {
        id: Date.now().toString(),
        name: newBillName,
        amount: Number(newBillAmount)
      }]);
      setNewBillName('');
      setNewBillAmount('');
    }
  };

  const handleStartAnalysis = async () => {
    setStep(6);
    try {
      const result = await analyzeOnboardingData(
        balanceFile,
        salaryFile,
        expenseFiles,
        user.apiKey,
        user.language
      );
      setAnalysisResult(result);
      setPlannedNextSalaryAmount(result.lastSalary.amount);
      
      const lastDate = new Date(result.lastSalary.date);
      let nextDate = new Date(lastDate);
      if (result.salaryFrequencyInferred === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (result.salaryFrequencyInferred === 'bi-weekly') nextDate.setDate(nextDate.getDate() + 14);
      else nextDate.setDate(nextDate.getDate() + 7);
      
      setPlannedNextSalaryDate(nextDate.toISOString().split('T')[0]);
      setStep(7);
    } catch (e) {
      console.error(e);
      alert("Failed to analyze images.");
      setStep(2);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
        
        {/* Language Switcher - Always Visible */}
        <div className="absolute top-6 right-6 z-50">
            <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 hover:border-sber-green transition-all shadow-lg active:scale-95"
            >
                <Globe className="w-4 h-4 text-sber-green" />
                <span className="text-sm font-bold uppercase">{user.language}</span>
            </button>
        </div>

        {/* Step Indicator */}
        {step > 0 && (
            <div className="absolute top-10 left-0 right-0 flex justify-center gap-2">
            {[1,2,3,4,5,6,7].map(s => (
                <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s <= step ? 'w-8 bg-sber-green' : 'w-4 bg-gray-800'}`} />
            ))}
            </div>
        )}

        {/* Step 0: Auth Selection (Landing) */}
        {step === 0 && (
          <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500 relative">
            <div className="w-24 h-24 bg-gradient-to-tr from-sber-green to-emerald-600 rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-sber-green/20">
              <Wallet className="text-white w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight">{t.welcome}</h1>
            <p className="text-gray-400 mb-10 text-lg">{t.setup_title}</p>
            
            <div className="space-y-4">
                 {/* Google Sign In */}
                 <button 
                    onClick={handleGoogleSignIn}
                    className="w-full bg-white text-black font-bold p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] transform hover:-translate-y-0.5"
                 >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                    <span className="text-base">{t.sign_in_google}</span>
                 </button>

                 {/* Guest Mode / Manual Entry */}
                 <button 
                    onClick={handleGuestSelect}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-3 transition-all border border-zinc-800 hover:border-zinc-700"
                 >
                    <UserCircle2 className="w-6 h-6 text-gray-400" />
                    <span className="text-base">{t.guest_mode}</span>
                 </button>
            </div>
            {/* Removed the bottom 'Or continue manually...' text as requested */}
          </div>
        )}

        {/* Step 1: Profile Setup */}
        {step === 1 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
             <div className="flex justify-start mb-6">
                 <button onClick={() => setStep(0)} className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-zinc-800">
                     <ChevronLeft size={20} />
                 </button>
             </div>
             
             <h2 className="text-3xl font-bold mb-2 text-left">{t.enter_name}</h2>
             <p className="text-gray-400 mb-8 text-left text-sm">Please provide your details and API key to continue.</p>
             
             <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="text-left group">
                  <label className="text-xs text-gray-500 ml-1 mb-2 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">{t.enter_name}</label>
                  <input type="text" className="w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 focus:border-sber-green focus:outline-none text-white transition-all placeholder-zinc-700" placeholder="e.g. John Doe" value={user.name} onChange={e => setUser({...user, name: e.target.value})} required />
              </div>

              {/* API Key Input - Always Visible now */}
              <div className="text-left group">
                <label className="text-xs text-gray-500 ml-1 mb-2 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">{t.enter_key}</label>
                <div className="relative">
                    <input 
                        type="password" 
                        className={`w-full bg-zinc-900/50 p-4 pr-14 rounded-2xl border focus:outline-none text-white transition-all placeholder-zinc-700 ${
                            keyStatus === 'valid' ? 'border-sber-green focus:border-sber-green' : 
                            keyStatus === 'invalid' ? 'border-red-500 focus:border-red-500' : 
                            'border-zinc-800 focus:border-sber-green'
                        }`} 
                        placeholder="AI Studio Key" 
                        value={user.apiKey} 
                        onChange={e => {
                            setUser({...user, apiKey: e.target.value});
                            setKeyStatus('idle');
                        }} 
                        disabled={isValidating}
                        required
                    />
                    {/* Validation Button inside Input */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {keyStatus === 'validating' ? (
                             <div className="w-8 h-8 flex items-center justify-center">
                                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             </div>
                        ) : (
                            <button 
                                type="button"
                                onClick={checkApiKey}
                                title="Verify API Key"
                                disabled={!user.apiKey}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                    keyStatus === 'valid' ? 'bg-sber-green text-white' : 
                                    keyStatus === 'invalid' ? 'bg-red-500 text-white' : 
                                    'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
                                }`}
                            >
                                {keyStatus === 'valid' ? <CheckCircle2 size={18} /> : 
                                 keyStatus === 'invalid' ? <XCircle size={18} /> : 
                                 <Key size={18} />}
                            </button>
                        )}
                    </div>
                </div>
                {keyStatus === 'valid' && <p className="text-xs text-sber-green mt-1 ml-1">Key verified successfully</p>}
                {keyStatus === 'invalid' && <p className="text-xs text-red-500 mt-1 ml-1">Invalid API Key</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left group">
                    <label className="text-xs text-gray-500 ml-1 mb-2 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">{t.select_currency}</label>
                    <select className="w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 focus:border-sber-green focus:outline-none text-white appearance-none transition-all" value={user.currency} onChange={e => setUser({...user, currency: e.target.value as Currency})}>
                        <option value="USD">USD ($)</option>
                        <option value="SAR">SAR (﷼)</option>
                        <option value="RUB">RUB (₽)</option>
                    </select>
                </div>
                <div className="text-left group">
                    <label className="text-xs text-gray-500 ml-1 mb-2 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">Language</label>
                    <select className="w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 focus:border-sber-green focus:outline-none text-white appearance-none transition-all" value={user.language} onChange={e => setUser({...user, language: e.target.value as Language})}>
                        <option value="en">English</option>
                        <option value="ar">العربية</option>
                        <option value="ru">Русский</option>
                    </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-sber-green hover:bg-green-600 font-bold p-4 rounded-2xl mt-8 flex justify-center gap-2 items-center shadow-lg shadow-sber-green/20 transition-all active:scale-95" disabled={isValidating}>
                {isValidating ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white/50 border-t-white rounded-full"/>
                ) : (
                    <>
                       {t.start} <ArrowRight size={20} />
                    </>
                )}
              </button>
             </form>
          </div>
        )}

        {/* Step 2: Balance */}
        {step === 2 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold mb-2">{t.step_balance}</h2>
            <p className="text-gray-400 mb-8 text-sm">{t.step_balance_desc}</p>
            <div className={`h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors ${balanceFile ? 'border-sber-green bg-sber-green/10' : 'border-zinc-700 hover:border-gray-500'}`} onClick={() => document.getElementById('balanceInput')?.click()}>
              {balanceFile ? (
                <>
                  <Check className="w-12 h-12 text-sber-green mb-2" />
                  <span className="text-sm font-semibold">{balanceFile.name}</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-400">{t.upload_image}</span>
                </>
              )}
              <input id="balanceInput" type="file" accept="image/*" className="hidden" onChange={(e) => setBalanceFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(3)} className="w-full bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl mt-8 font-bold flex items-center justify-center gap-2" disabled={!balanceFile}>
              Next <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 3: Salary */}
        {step === 3 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold mb-2">{t.step_salary}</h2>
            <p className="text-gray-400 mb-8 text-sm">{t.step_salary_desc}</p>
            <div className={`h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors ${salaryFile ? 'border-sber-green bg-sber-green/10' : 'border-zinc-700 hover:border-gray-500'}`} onClick={() => document.getElementById('salaryInput')?.click()}>
              {salaryFile ? (
                <>
                  <Check className="w-12 h-12 text-sber-green mb-2" />
                  <span className="text-sm font-semibold">{salaryFile.name}</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-12 h-12 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-400">{t.upload_image}</span>
                </>
              )}
              <input id="salaryInput" type="file" accept="image/*" className="hidden" onChange={(e) => setSalaryFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl mt-8 font-bold flex items-center justify-center gap-2" disabled={!salaryFile}>
              Next <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 4: Expenses */}
        {step === 4 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold mb-2">{t.step_expenses}</h2>
            <p className="text-gray-400 mb-8 text-sm">{t.step_expenses_desc}</p>
            <div className={`h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors ${expenseFiles.length > 0 ? 'border-sber-green bg-sber-green/10' : 'border-zinc-700 hover:border-gray-500'}`} onClick={() => document.getElementById('expensesInput')?.click()}>
               <div className="grid grid-cols-3 gap-2 p-4">
                 {expenseFiles.slice(0, 6).map((f, i) => (
                   <div key={i} className="w-16 h-16 bg-black/50 rounded-lg flex items-center justify-center border border-zinc-700">
                     <span className="text-[10px] truncate w-full px-1">{f.name.slice(0,5)}..</span>
                   </div>
                 ))}
                 {expenseFiles.length === 0 && (
                    <div className="col-span-3 flex flex-col items-center">
                       <Upload className="w-12 h-12 text-gray-500 mb-2" />
                       <span className="text-sm text-gray-400">{t.upload_images}</span>
                    </div>
                 )}
               </div>
               <input id="expensesInput" type="file" accept="image/*" multiple className="hidden" onChange={(e) => setExpenseFiles(Array.from(e.target.files || []))} />
            </div>
            <p className="mt-2 text-xs text-gray-500">{expenseFiles.length} images selected</p>
            <button onClick={() => setStep(5)} className="w-full bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl mt-8 font-bold flex items-center justify-center gap-2">
              Next <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 5: Fixed Bills (Recurring) */}
        {step === 5 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
             <h2 className="text-2xl font-bold mb-2">{t.step_recurring}</h2>
             <p className="text-gray-400 mb-6 text-sm">{t.step_recurring_desc}</p>
             
             <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {recurringBills.map((bill) => (
                   <div key={bill.id} className="flex justify-between items-center bg-sber-card p-3 rounded-xl border border-zinc-800">
                      <div className="text-left">
                         <div className="font-bold">{bill.name}</div>
                         <div className="text-xs text-gray-400">{bill.amount} {user.currency}</div>
                      </div>
                      <button onClick={() => setRecurringBills(recurringBills.filter(b => b.id !== bill.id))}>
                         <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                   </div>
                ))}
             </div>

             <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6">
                <input 
                   type="text" 
                   placeholder={t.bill_name} 
                   value={newBillName}
                   onChange={e => setNewBillName(e.target.value)}
                   className="w-full bg-black p-3 rounded-lg mb-2 text-sm border border-zinc-700"
                />
                <div className="flex gap-2">
                   <input 
                      type="number" 
                      placeholder={t.bill_amount}
                      value={newBillAmount}
                      onChange={e => setNewBillAmount(e.target.value)}
                      className="w-full bg-black p-3 rounded-lg text-sm border border-zinc-700"
                   />
                   <button onClick={handleAddBill} className="bg-sber-green p-3 rounded-lg">
                      <Plus className="text-white" />
                   </button>
                </div>
             </div>

             <button onClick={handleStartAnalysis} className="w-full bg-sber-green hover:bg-green-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-sber-green/20">
               Analyze All Data <Zap size={18} />
             </button>
          </div>
        )}

        {/* Step 6: Analysis Loading */}
        {step === 6 && (
           <div className="flex flex-col items-center justify-center animate-in fade-in duration-500">
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-sber-green rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Zap className="w-10 h-10 text-sber-green animate-pulse" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">{t.analyzing_all}</h2>
              <p className="text-gray-500 text-sm max-w-xs">Connecting to Gemini AI to extract your balance, income patterns, and recent spending...</p>
           </div>
        )}

        {/* Step 7: Calendar & Review */}
        {step === 7 && analysisResult && (
           <div className="w-full max-w-md animate-in slide-in-from-bottom duration-500 pb-10">
              <h2 className="text-2xl font-bold mb-1">{t.step_review}</h2>
              <p className="text-gray-400 mb-6 text-sm">We found the following data. Please confirm.</p>
              
              <div className="space-y-4">
                 <div className="bg-sber-card p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">{t.step_balance}</span>
                    <span className="text-xl font-bold text-white">{analysisResult.currentBalance.toLocaleString()} {user.currency}</span>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm text-gray-400 ml-1 block text-left">{t.next_salary_date}</label>
                    <CalendarGrid selectedDate={plannedNextSalaryDate} onSelectDate={setPlannedNextSalaryDate} />
                 </div>

                 <div className="bg-sber-card p-4 rounded-xl border border-zinc-800">
                    <div className="flex justify-between mb-2">
                       <label className="text-sm text-gray-400">{t.expected_amount}</label>
                       <span className="text-xs text-gray-500">Last: {analysisResult.lastSalary.amount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-sber-green font-bold text-xl">{user.currency}</span>
                       <input 
                         type="number" 
                         value={plannedNextSalaryAmount} 
                         onChange={(e) => setPlannedNextSalaryAmount(Number(e.target.value))}
                         className="bg-transparent text-2xl font-bold text-white w-full focus:outline-none"
                       />
                    </div>
                 </div>

                 <button onClick={() => onComplete(analysisResult, plannedNextSalaryDate, plannedNextSalaryAmount, recurringBills)} className="w-full bg-sber-green hover:bg-green-600 p-4 rounded-xl mt-4 font-bold shadow-lg shadow-sber-green/20">
                    {t.confirm_setup}
                 </button>
              </div>
           </div>
        )}
    </div>
  );
};
```
---

### File: `components\RecurringBills.tsx`
```tsx
import React, { useState } from 'react';
import { RecurringBill, UserSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { Check, Calendar, X, Plus, Trash2 } from 'lucide-react';

interface Props {
  user: UserSettings;
  onPayBill: (billId: string, date: string, deduct: boolean) => void;
  onAddBill: (name: string, amount: number) => void;
  onDeleteBill: (id: string) => void;
}

export const RecurringBills: React.FC<Props> = ({ user, onPayBill, onAddBill, onDeleteBill }) => {
  const t = TRANSLATIONS[user.language];
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);
  
  // Add Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Payment Modal State
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [deduct, setDeduct] = useState(true);

  const bills = user.recurringBills || [];
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const handleSaveNewBill = () => {
    if (newName && newAmount) {
        onAddBill(newName, parseFloat(newAmount));
        setNewName('');
        setNewAmount('');
        setIsAdding(false);
    }
  };

  const confirmPayment = () => {
    if (selectedBill) {
      onPayBill(selectedBill.id, payDate, deduct);
      setSelectedBill(null);
    }
  };

  return (
    <div className="bg-[#1C1C1E] rounded-[2rem] p-6 border border-white/5 shadow-xl relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-sber-green/5 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sber-green" />
            {t.fixed_bills}
        </h3>
        <button 
            onClick={() => setIsAdding(true)}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-sber-green hover:bg-sber-green hover:text-white transition-all border border-white/5 shadow-sm"
        >
            <Plus size={18} />
        </button>
      </div>

      <div className="space-y-3 relative z-10">
        {bills.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm bg-black/20 rounded-2xl border border-dashed border-zinc-800">
                No fixed bills added yet.
            </div>
        )}

        {bills.map(bill => {
          const isPaid = bill.lastPaidDate && bill.lastPaidDate.startsWith(currentMonth);
          return (
            <div 
              key={bill.id}
              className={`group/item flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                isPaid 
                ? 'bg-sber-green/5 border-sber-green/20 opacity-70' 
                : 'bg-black/20 border-white/5 hover:border-zinc-600 hover:bg-black/40'
              }`}
              onClick={() => !isPaid && setSelectedBill(bill)}
            >
              <div className="flex items-center gap-4 flex-1">
                 <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${isPaid ? 'bg-sber-green border-sber-green shadow-[0_0_10px_rgba(33,160,56,0.3)]' : 'border-zinc-700 bg-white/5 group-hover/item:border-sber-green'}`}>
                    {isPaid && <Check className="w-4 h-4 text-white" />}
                 </div>
                 <div>
                    <p className={`font-bold text-sm transition-colors ${isPaid ? 'line-through text-gray-500' : 'text-white group-hover/item:text-gray-200'}`}>{bill.name}</p>
                    {isPaid ? (
                        <p className="text-[10px] text-sber-green font-medium">Paid {bill.lastPaidDate}</p>
                    ) : (
                        <p className="text-[10px] text-gray-500">Tap to mark paid</p>
                    )}
                 </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold text-sm ${isPaid ? 'text-gray-500' : 'text-white'}`}>
                      {bill.amount.toLocaleString()} <span className="text-[10px] font-sans text-gray-500">{user.currency}</span>
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteBill(bill.id); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
                  >
                      <Trash2 size={16} />
                  </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {selectedBill && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Darker overlay to prevent bleed-through */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedBill(null)} />
            
            <div className="relative bg-[#1C1C1E] border border-white/10 w-full max-w-sm rounded-[2rem] p-6 animate-in zoom-in-95 duration-200 shadow-2xl">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-white">{t.confirm_payment}</h3>
                  <button onClick={() => setSelectedBill(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                      <X size={20} />
                  </button>
               </div>
               
               <div className="mb-8 text-center bg-black/20 rounded-3xl p-6 border border-white/5">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">{t.bill_name}</p>
                  <p className="text-3xl font-bold text-white mb-3">{selectedBill.name}</p>
                  <div className="inline-block bg-sber-green/10 text-sber-green border border-sber-green/20 px-4 py-1.5 rounded-full font-mono font-bold text-lg">
                    {selectedBill.amount.toLocaleString()} {user.currency}
                  </div>
               </div>

               <div className="space-y-4">
                  <div>
                     <label className="text-xs text-gray-400 ml-2 mb-2 block font-bold uppercase tracking-wider">{t.payment_date}</label>
                     <input 
                        type="date" 
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:outline-none transition-colors"
                     />
                  </div>

                  <label className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-white/10 cursor-pointer hover:border-zinc-600 transition-colors">
                     <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${deduct ? 'bg-sber-green border-sber-green' : 'border-zinc-600'}`}>
                        {deduct && <Check className="w-4 h-4 text-white" />}
                     </div>
                     <input type="checkbox" checked={deduct} onChange={e => setDeduct(e.target.checked)} className="hidden" />
                     <span className="text-sm font-medium text-gray-200">{t.deduct_balance}</span>
                  </label>

                  <button 
                     onClick={confirmPayment}
                     className="w-full bg-sber-green hover:bg-green-600 py-4 rounded-2xl font-bold text-white shadow-lg shadow-sber-green/20 transition-all active:scale-95 mt-2"
                  >
                     {t.confirm}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Add Bill Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsAdding(false)} />
            
            <div className="relative bg-[#1C1C1E] border border-white/10 w-full max-w-sm rounded-[2rem] p-6 animate-in zoom-in-95 duration-200 shadow-2xl">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-white">{t.add_bill}</h3>
                  <button onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                      <X size={20} />
                  </button>
               </div>
               
               <div className="space-y-5">
                  <div>
                     <label className="text-xs text-gray-400 ml-2 mb-2 block font-bold uppercase tracking-wider">{t.bill_name}</label>
                     <input 
                        type="text"
                        placeholder="e.g. Netflix"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:outline-none transition-colors"
                     />
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 ml-2 mb-2 block font-bold uppercase tracking-wider">{t.bill_amount}</label>
                     <div className="relative">
                        <input 
                            type="number"
                            placeholder="0.00"
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value)}
                            className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:outline-none transition-colors"
                        />
                        <span className="absolute right-4 top-4 text-gray-500 font-bold text-sm pointer-events-none">{user.currency}</span>
                     </div>
                  </div>

                  <button 
                     onClick={handleSaveNewBill}
                     disabled={!newName || !newAmount}
                     className="w-full bg-sber-green hover:bg-green-600 py-4 rounded-2xl font-bold text-white shadow-lg shadow-sber-green/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                     {t.save}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
```
---

### File: `components\Reports.tsx`
```tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, CartesianGrid } from 'recharts';
import { Transaction, Language } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { FileWarning, PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  language: Language;
}

export const Reports: React.FC<Props> = ({ transactions, language }) => {
  const t = TRANSLATIONS[language];

  // Group by category (Expenses Only)
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  const dataMap = expenses.reduce((acc, curr) => {
    const amount = Number(curr.amount);
    const catKey = (curr.category || 'unknown').toLowerCase();
    acc[catKey] = (acc[catKey] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(dataMap).map(catId => {
    const category = CATEGORIES.find(c => c.id.toLowerCase() === catId.toLowerCase());
    const displayName = category 
      ? (language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en) 
      : catId.charAt(0).toUpperCase() + catId.slice(1);

    return {
      name: displayName,
      value: dataMap[catId],
      color: category ? category.color : '#6b7280'
    };
  }).sort((a, b) => b.value - a.value);

  // Last 7 days data for Bar Chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const barData = last7Days.map(dateStr => {
    const dayTotal = expenses
      .filter(t => t.date.startsWith(dateStr))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const dateObj = new Date(dateStr);
    return {
      name: new Intl.DateTimeFormat(language, { weekday: 'short' }).format(dateObj),
      amount: dayTotal
    };
  });

  const hasData = expenses.length > 0;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      <div className="px-2">
        <h2 className="text-3xl font-bold text-white mb-1">{t.reports}</h2>
        <p className="text-gray-400 text-sm">{language === 'ar' ? 'نظرة عامة على إنفاقك' : 'Overview of your spending'}</p>
      </div>
      
      {/* Pie Chart Card */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] shadow-xl border border-white/5 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-sber-green" />
                {t.expense} / {t.category}
             </h3>
             <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">Last 30 Days</span>
        </div>

        {hasData ? (
            <>
                <div className="h-[300px] w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={pieData}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={6}
                        >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => value.toLocaleString()}
                        />
                    </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Centered Total */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total</span>
                        <span className="text-3xl font-bold text-white tracking-tighter">
                            {totalExpenses.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                    {pieData.slice(0, 6).map((entry, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: entry.color, color: entry.color }} />
                                <span className="text-xs text-gray-300 font-medium truncate max-w-[80px]">{entry.name}</span>
                            </div>
                            <span className="text-xs font-bold text-white">{((entry.value / totalExpenses) * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </>
        ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-500 gap-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <FileWarning className="w-8 h-8 text-zinc-600" />
                </div>
                <p>No expense data found.</p>
            </div>
        )}
      </div>

      {/* Bar Chart Card */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] shadow-xl border border-white/5">
         <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sber-green" />
                Weekly Trend
            </h3>
         </div>
         
         {hasData ? (
             <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#21A038" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#21A038" stopOpacity={0.4}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#333" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#52525b" 
                        tick={{fill: '#71717a', fontSize: 10, fontWeight: 500}} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                    />
                    <YAxis 
                        stroke="#52525b" 
                        tick={{fill: '#71717a', fontSize: 10}} 
                        tickLine={false} 
                        axisLine={false}
                        tickCount={5}
                    />
                    <Tooltip 
                        cursor={{fill: '#ffffff', opacity: 0.05, radius: 8}}
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                        formatter={(value: number) => [value.toLocaleString(), 'Spent']}
                        itemStyle={{ color: '#21A038' }}
                    />
                    <Bar 
                        dataKey="amount" 
                        fill="url(#barGradient)" 
                        radius={[6, 6, 6, 6]} 
                        barSize={24}
                        minPointSize={2}
                    />
                    </BarChart>
                </ResponsiveContainer>
             </div>
         ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
                <p>No activity this week.</p>
            </div>
         )}
      </div>
    </div>
  );
};
```
---

### File: `components\TransactionItem.tsx`
```tsx
import React from 'react';
import { Transaction, Currency, ExpenseCategory } from '../types';
import { CATEGORIES } from '../constants';
import * as Icons from 'lucide-react';

interface Props {
  transaction: Transaction;
  currency: Currency;
  language: 'en' | 'ar' | 'ru';
}

export const TransactionItem: React.FC<Props> = ({ transaction, currency, language }) => {
  const category = CATEGORIES.find(c => c.id === transaction.category) || CATEGORIES[4]; // Default to Utilities
  // Safer icon resolution with fallback
  const IconComponent = (Icons as any)[category.icon] || Icons.HelpCircle || Icons.AlertCircle || Icons.Circle;

  const isExpense = transaction.type === 'expense';
  
  // Format Date
  const dateObj = new Date(transaction.date);
  const dateStr = new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(dateObj);

  return (
    <div className="flex items-center justify-between p-4 mb-3 bg-sber-card rounded-2xl hover:bg-sber-gray transition-colors">
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
          style={{ backgroundColor: category.color }}
        >
          {IconComponent ? <IconComponent size={20} /> : <div className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="font-semibold text-white text-base">
            {transaction.vendor || (language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en)}
          </h3>
          <p className="text-xs text-gray-400">{dateStr} • {transaction.note || ''}</p>
        </div>
      </div>
      <div className={`font-bold text-base ${isExpense ? 'text-white' : 'text-sber-green'}`}>
        {isExpense ? '-' : '+'}{transaction.amount.toLocaleString()} <span className="text-xs font-normal text-gray-400">{currency}</span>
      </div>
    </div>
  );
};
```
---

### File: `services\firebase.ts`
```ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-FhLE24RSU8GRHE9oWZvm_tkQ4tgIWiQ",
  authDomain: "masareefy-1b4ff.firebaseapp.com",
  projectId: "masareefy-1b4ff",
  storageBucket: "masareefy-1b4ff.firebasestorage.app",
  messagingSenderId: "811782757711",
  appId: "1:811782757711:web:f1d7eb37ee60faa404393a",
  measurementId: "G-JPQRNMHV4P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

export { auth };
```
---

### File: `services\geminiService.ts`
```ts
import { GoogleGenAI } from "@google/genai";
import { Transaction, TransactionType } from "../types";

export interface ReceiptAnalysisResult {
  amount: number;
  date: string;
  vendor: string;
  category: string;
  type: TransactionType;
}

export interface OnboardingAnalysisResult {
  currentBalance: number;
  lastSalary: {
    amount: number;
    date: string;
  };
  transactions: {
    amount: number;
    date: string;
    vendor: string;
    category: string;
    type: 'expense' | 'income';
  }[];
  salaryFrequencyInferred: 'monthly' | 'weekly' | 'bi-weekly';
}

const fileToGenerativePart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- New Feature: Deep Financial Analysis ---
export const getDeepFinancialAnalysis = async (
  transactions: Transaction[],
  balance: number,
  currency: string,
  language: string,
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });

  const expenses = transactions.filter(t => t.type === 'expense');
  const income = transactions.filter(t => t.type === 'income');

  // Prepare a summary for the prompt (to avoid token limits if many txs)
  const summary = {
    currentBalance: balance,
    currency,
    totalExpenses: expenses.reduce((sum, t) => sum + t.amount, 0),
    totalIncome: income.reduce((sum, t) => sum + t.amount, 0),
    transactionCount: transactions.length,
    recentTransactions: transactions.slice(0, 20).map(t => ({
      date: t.date,
      amount: t.amount,
      category: t.category,
      vendor: t.vendor,
      type: t.type
    }))
  };

  const prompt = `
    Act as a professional senior financial advisor. I am providing you with my financial data summary.
    
    Data:
    ${JSON.stringify(summary, null, 2)}

    Your task is to generate a professional, strict, and constructive report.
    
    Structure of the report (Use Markdown):
    1. **Executive Summary**: Brief health check of my finances.
    2. **Spending Patterns & Mistakes**: Identify 3 specific mistakes I am making based on the categories and vendors. Be direct.
    3. **Cash Flow Analysis**: Analyze my income vs expense ratio.
    4. **Actionable Recommendations**: Give me 3 concrete steps to save money immediately.

    Tone: Professional, slightly strict but helpful.
    Language: ${language === 'ar' ? 'Arabic' : language === 'ru' ? 'Russian' : 'English'}.
  `;

  try {
    // Attempt Primary Model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    });
    return response.text || "Could not generate report.";
  } catch (primaryError) {
    console.warn("Primary model (gemini-3-flash-preview) failed. Switching to fallback (gemini-2.5-flash).", primaryError);
    try {
      // Attempt Fallback Model
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
      });
      return response.text || "Could not generate report from fallback.";
    } catch (fallbackError) {
      console.error("Deep Analysis Error (Both models failed):", fallbackError);
      throw fallbackError;
    }
  }
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    // Primary
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: 'Test' }] },
    });
    return true;
  } catch (primaryError) {
    console.warn("API Key Validation: Primary model failed, trying fallback.", primaryError);
    try {
      // Fallback
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: 'Test' }] },
      });
      return true;
    } catch (fallbackError) {
      console.error("API Key Validation Error (Both models failed):", fallbackError);
      return false;
    }
  }
};

export const analyzeOnboardingData = async (
  balanceFile: File | null,
  salaryFile: File | null,
  expenseFiles: File[],
  apiKey: string,
  language: string
): Promise<OnboardingAnalysisResult> => {
  
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];
  
  let promptContext = `
    You are a financial AI assistant. I am providing you with several images to set up my financial profile.
    1. The FIRST image provided is my CURRENT BANK BALANCE screenshot. Extract the total available balance.
    2. The SECOND image provided is my LAST SALARY SLIP/NOTIFICATION. Extract the amount and the date it was received.
    3. The REMAINING images are RECEIPTS/EXPENSES. Extract the details for each transaction.
    Based on the salary date and expenses, infer if I am paid monthly, weekly, or bi-weekly.
    Language context: ${language}.
    IMPORTANT: Return the result strictly as valid JSON. Do not use Markdown formatting.
    The categories must be strictly one of: food, groceries, transport, housing, utilities, health, education, travel, gifts.
    The JSON structure must be:
    {
      "currentBalance": number,
      "lastSalary": { "amount": number, "date": "YYYY-MM-DD" },
      "transactions": [{ "amount": number, "date": "YYYY-MM-DD", "vendor": string, "category": string, "type": "expense" | "income" }],
      "salaryFrequencyInferred": "monthly" | "weekly" | "bi-weekly"
    }
  `;

  if (balanceFile) {
    parts.push(await fileToGenerativePart(balanceFile));
    promptContext += " (Image 1: Balance)";
  }
  if (salaryFile) {
    parts.push(await fileToGenerativePart(salaryFile));
    promptContext += " (Image 2: Salary)";
  }
  for (const file of expenseFiles) {
    parts.push(await fileToGenerativePart(file));
  }

  parts.push({ text: promptContext });

  try {
    // Primary
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    const text = response.text;
    if (!text) throw new Error("No response from primary model");
    const jsonString = cleanJson(text);
    const result = JSON.parse(jsonString) as OnboardingAnalysisResult;
    result.transactions = result.transactions.map(t => ({ ...t, category: t.category.toLowerCase() }));
    return result;
  } catch (primaryError) {
    console.warn("Onboarding Analysis: Primary model failed, trying fallback (gemini-2.5-flash).", primaryError);
    try {
       // Fallback
       const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
      });
      const text = response.text;
      if (!text) throw new Error("No response from fallback model");
      const jsonString = cleanJson(text);
      const result = JSON.parse(jsonString) as OnboardingAnalysisResult;
      result.transactions = result.transactions.map(t => ({ ...t, category: t.category.toLowerCase() }));
      return result;
    } catch (fallbackError) {
       console.error("Onboarding Analysis Error (Both models failed):", fallbackError);
       throw fallbackError;
    }
  }
};

export const analyzeReceipt = async (
  file: File, 
  apiKey: string,
  language: string
): Promise<ReceiptAnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(file);

  const prompt = `
    Analyze this receipt image. 
    Extract the total amount, the date (YYYY-MM-DD format), the vendor/merchant name, and categorize the expense.
    Determine if it is an INCOME or EXPENSE.
    The category should be one of: food, groceries, transport, housing, utilities, health, education, travel, gifts. If unsure, use 'utilities'.
    Language context is ${language}.
    IMPORTANT: Return the result strictly as valid JSON.
    {
      "amount": number,
      "date": "YYYY-MM-DD",
      "vendor": string,
      "category": string,
      "type": "income" | "expense"
    }
  `;

  try {
    // Primary
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    const text = response.text;
    if (!text) throw new Error("No response from primary AI");
    const jsonString = cleanJson(text);
    const result = JSON.parse(jsonString) as ReceiptAnalysisResult;
    if (result.category) { result.category = result.category.toLowerCase(); }
    return result;
  } catch (primaryError) {
    console.warn("Receipt Analysis: Primary model failed, trying fallback (gemini-2.5-flash).", primaryError);
    try {
      // Fallback
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
      });
      const text = response.text;
      if (!text) throw new Error("No response from fallback AI");
      const jsonString = cleanJson(text);
      const result = JSON.parse(jsonString) as ReceiptAnalysisResult;
      if (result.category) { result.category = result.category.toLowerCase(); }
      return result;
    } catch (fallbackError) {
      console.error("Gemini Analysis Error (Both models failed):", fallbackError);
      throw fallbackError;
    }
  }
};
```
---

### File: `.env.local`
```local
GEMINI_API_KEY=PLACEHOLDER_API_KEY

```
---

### File: `App.tsx`
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Home, Plus, PieChart as PieIcon, Settings, List, Camera, Upload, LogOut, Globe, Image as ImageIcon, Key, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { UserSettings, Transaction, ViewState, Language, Currency, TransactionType, BudgetPlan, RecurringBill } from './types';
import { CATEGORIES, TRANSLATIONS } from './constants';
import { analyzeReceipt, OnboardingAnalysisResult, validateApiKey } from './services/geminiService';
import { logoutUser, auth } from './services/firebase';
import { TransactionItem } from './components/TransactionItem';
import { Reports } from './components/Reports';
import { Dashboard } from './components/Dashboard';
import { Onboarding } from './components/Onboarding';
import { AIAdvisor } from './components/AIAdvisor';

const App = () => {
  // --- State ---
  const [user, setUser] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('masareefy_user');
      return saved ? JSON.parse(saved) : {
        name: '',
        apiKey: '',
        currency: 'USD',
        language: 'en',
        isOnboarded: false,
        isGuest: false,
        currentBalance: 0
      };
    } catch (e) {
      console.error("Failed to parse user settings, resetting.", e);
      return {
        name: '',
        apiKey: '',
        currency: 'USD',
        language: 'en',
        isOnboarded: false,
        isGuest: false,
        currentBalance: 0
      };
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('masareefy_txs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse transactions, resetting.", e);
      return [];
    }
  });

  const [currentView, setCurrentView] = useState<ViewState>(user.isOnboarded ? 'dashboard' : 'onboarding');
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
  const [tempTx, setTempTx] = useState<Partial<Transaction>>({ type: TransactionType.EXPENSE });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [editingKey, setEditingKey] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('masareefy_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('masareefy_txs', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    document.documentElement.dir = user.language === 'ar' ? 'rtl' : 'ltr';
  }, [user.language]);

  const t = TRANSLATIONS[user.language];

  // --- Logic ---
  const handleOnboardingComplete = (result: OnboardingAnalysisResult, nextSalaryDate: string, nextSalaryAmount: number, bills: RecurringBill[]) => {
    const newTransactions = result.transactions.map((tx, idx) => ({
      id: `init-${idx}`,
      amount: tx.amount,
      date: tx.date,
      vendor: tx.vendor,
      category: tx.category,
      type: tx.type === 'expense' ? TransactionType.EXPENSE : TransactionType.INCOME,
      note: 'Imported during setup'
    }));

    newTransactions.push({
      id: 'init-salary',
      amount: result.lastSalary.amount,
      date: result.lastSalary.date,
      vendor: 'Employer',
      category: 'salary',
      type: TransactionType.INCOME,
      note: 'Last Salary Slip'
    });

    setTransactions(newTransactions);
    setUser(u => ({
      ...u,
      isOnboarded: true,
      currentBalance: result.currentBalance,
      lastSalaryAmount: result.lastSalary.amount,
      lastSalaryDate: result.lastSalary.date,
      salaryFrequency: result.salaryFrequencyInferred,
      nextSalaryAmount: nextSalaryAmount,
      nextSalaryDate: nextSalaryDate,
      recurringBills: bills
    }));
    setCurrentView('dashboard');
  };

  const handlePlanSelection = (plan: BudgetPlan) => {
    setUser(u => ({ ...u, selectedPlan: plan.type, dailyLimit: plan.dailyLimit }));
    alert(`You selected the ${plan.type.toUpperCase()} plan. Daily Limit: ${plan.dailyLimit} ${user.currency}`);
  };

  // --- Recurring Bills Logic ---
  const handlePayBill = (billId: string, date: string, deduct: boolean) => {
    const bill = user.recurringBills?.find(b => b.id === billId);
    if (!bill) return;

    // 1. Update User Settings (mark lastPaidDate)
    const updatedBills = user.recurringBills?.map(b => 
       b.id === billId ? { ...b, lastPaidDate: date } : b
    );
    setUser(u => ({ ...u, recurringBills: updatedBills }));

    // 2. Create Transaction if deduct is true
    if (deduct) {
       const newTx: Transaction = {
          id: `bill-${Date.now()}`,
          amount: bill.amount,
          date: date,
          category: 'utilities',
          vendor: bill.name,
          note: 'Fixed Monthly Bill',
          type: TransactionType.EXPENSE,
          isRecurring: true
       };
       setTransactions(prev => [newTx, ...prev]);
    }
  };

  const handleAddBill = (name: string, amount: number) => {
    const newBill: RecurringBill = {
        id: Date.now().toString(),
        name,
        amount
    };
    setUser(prev => ({
        ...prev,
        recurringBills: [...(prev.recurringBills || []), newBill]
    }));
  };

  const handleDeleteBill = (id: string) => {
    if (confirm('Are you sure you want to delete this bill?')) {
        setUser(prev => ({
            ...prev,
            recurringBills: (prev.recurringBills || []).filter(b => b.id !== id)
        }));
    }
  };

  // --- API & Transactions ---
  const handleUpdateApiKey = async () => {
    if (!editingKey.trim()) return;
    setIsValidatingKey(true);
    const isValid = await validateApiKey(editingKey.trim());
    if (isValid) {
      setUser(u => ({ ...u, apiKey: editingKey.trim(), isGuest: false }));
      alert(t.key_valid_saved);
      setEditingKey('');
    } else {
      alert(t.key_invalid);
    }
    setIsValidatingKey(false);
  };

  const handleLogout = async () => {
      await logoutUser();
      localStorage.removeItem('masareefy_user');
      localStorage.removeItem('masareefy_txs');
      window.location.reload();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user.isGuest || !user.apiKey) {
        alert("This feature is disabled in Guest Mode. Please add an API Key in Settings.");
        return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzeLoading(true);
    try {
      const result = await analyzeReceipt(file, user.apiKey, user.language);
      setTempTx({
        amount: result.amount,
        date: result.date,
        vendor: result.vendor,
        category: result.category || 'utilities',
        type: result.type as TransactionType || TransactionType.EXPENSE,
        note: 'Scanned Receipt'
      });
    } catch (err) { alert("Analysis failed."); } 
    finally { setIsAnalyzeLoading(false); }
  };

  const saveTransaction = () => {
    if (!tempTx.amount || !tempTx.date) return;
    
    // Check Spending against Plan (if expense and matches today)
    const todayStr = new Date().toISOString().split('T')[0];
    if (tempTx.type === TransactionType.EXPENSE && user.dailyLimit && tempTx.date === todayStr) {
      const todaySpent = transactions
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(todayStr))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const newTotal = todaySpent + Number(tempTx.amount);
      
      if (newTotal > user.dailyLimit) {
        alert(`WARNING: This transaction pushes you over your daily limit of ${user.dailyLimit}! Overdraft: ${newTotal - user.dailyLimit}`);
      } else {
        const remaining = user.dailyLimit - newTotal;
        alert(`Great job! You are still under budget. Remaining for today: ${remaining}`);
      }
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      amount: Number(tempTx.amount),
      date: tempTx.date,
      category: tempTx.category || 'utilities',
      vendor: tempTx.vendor || 'Unknown',
      note: tempTx.note || '',
      type: tempTx.type || TransactionType.EXPENSE,
      isRecurring: false
    };
    setTransactions(prev => [newTx, ...prev]);
    setTempTx({ type: TransactionType.EXPENSE });
    setCurrentView('dashboard');
  };

  const getGroupedTransactions = () => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: Record<string, Transaction[]> = {};
    sorted.forEach(tx => {
      const dateKey = tx.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    return Object.keys(groups).map(date => ({ date, items: groups[date] }));
  };

  if (currentView === 'onboarding') {
    return <Onboarding user={user} setUser={setUser} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans selection:bg-sber-green/30">
      
      {/* Premium Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-sber-green/5 rounded-full blur-[150px] opacity-40 animate-pulse"></div>
          <div className="absolute top-[40%] right-[-20%] w-[60vw] h-[60vw] bg-emerald-900/10 rounded-full blur-[120px] opacity-30"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-blue-900/5 rounded-full blur-[120px] opacity-20"></div>
      </div>

      {/* Glass Header */}
      <div className="sticky top-0 z-40 bg-[#050505]/70 backdrop-blur-xl border-b border-white/5 shadow-sm">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-xl shadow-lg shadow-sber-green/10 object-cover border border-white/10" />
            ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sber-green to-emerald-800 flex items-center justify-center text-sm font-bold shadow-lg shadow-sber-green/10">
                {user.name.charAt(0) || 'U'}
                </div>
            )}
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{t.welcome}</p>
              <div className="flex items-center gap-2">
                 <p className="font-bold text-sm tracking-wide">{user.name}</p>
                 {user.isGuest && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded font-bold border border-yellow-500/30">GUEST</span>}
              </div>
            </div>
          </div>
          <button 
              onClick={() => setUser(u => ({...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en'}))}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
          >
            <Globe className="text-sber-green w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area with Transition Key */}
      <main className="relative z-10 max-w-md mx-auto pb-32">
        <div key={currentView} className="animate-enter px-6 pt-6">
          {currentView === 'dashboard' && (
            <Dashboard 
              user={user} 
              transactions={transactions} 
              onSelectPlan={handlePlanSelection} 
              onOpenAI={() => setCurrentView('ai-advisor')}
              onChangeView={setCurrentView}
              onPayBill={handlePayBill}
              onAddBill={handleAddBill}
              onDeleteBill={handleDeleteBill}
            />
          )}

          {currentView === 'ai-advisor' && (
            <AIAdvisor user={user} transactions={transactions} onClose={() => setCurrentView('dashboard')} />
          )}

          {currentView === 'transactions' && (
            <div className="pb-10">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <List className="w-6 h-6 text-sber-green" />
                {t.transactions}
              </h2>
              {getGroupedTransactions().map(group => {
                const date = new Date(group.date);
                return (
                  <div key={group.date} className="mb-6">
                    <div className="sticky top-20 z-30 bg-[#050505]/80 backdrop-blur-xl py-2 mb-2 border-b border-white/5 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white tracking-tight">
                        {date.getDate()}
                      </span>
                      <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                        {date.toLocaleDateString(user.language, { month: 'short', weekday: 'short' })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map(tx => (
                        <TransactionItem key={tx.id} transaction={tx} currency={user.currency} language={user.language} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentView === 'reports' && (
            <Reports transactions={transactions} language={user.language} />
          )}

          {currentView === 'add' && (
            <div className="pb-10">
              <h2 className="text-2xl font-bold mb-8 text-center">{tempTx.amount ? 'Review Transaction' : t.add}</h2>
              
              {isAnalyzeLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-zinc-900/30 rounded-[2.5rem] border border-white/5 animate-pulse">
                  <div className="w-20 h-20 border-4 border-sber-green border-t-transparent rounded-full animate-spin mb-6"></div>
                  <p className="text-sber-green font-medium text-lg">{t.analyzing}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Amount Display */}
                  <div className="flex justify-center py-8">
                    <div className="text-center relative">
                      <span className="text-zinc-600 text-3xl absolute -left-10 top-2 font-light">{user.currency}</span>
                      <input 
                          type="number" 
                          value={tempTx.amount || ''}
                          onChange={e => setTempTx({...tempTx, amount: parseFloat(e.target.value)})}
                          placeholder="0"
                          className="bg-transparent text-7xl font-bold text-white text-center w-full focus:outline-none placeholder-zinc-800 tracking-tighter"
                          autoFocus
                      />
                    </div>
                  </div>

                  {!tempTx.amount && (
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`bg-zinc-900/40 backdrop-blur-md p-6 rounded-[2rem] flex flex-col items-center gap-3 border border-zinc-800/50 hover:border-sber-green hover:bg-sber-green/5 transition-all group active:scale-95 ${user.isGuest ? 'opacity-50' : ''}`}
                      >
                          <div className="bg-black/50 p-4 rounded-full group-hover:scale-110 transition-transform">
                              {user.isGuest ? <Lock className="w-8 h-8 text-gray-500" /> : <Camera className="w-8 h-8 text-sber-green" />}
                          </div>
                          <span className="font-semibold text-sm text-gray-300 group-hover:text-white">{t.scan_receipt}</span>
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`bg-zinc-900/40 backdrop-blur-md p-6 rounded-[2rem] flex flex-col items-center gap-3 border border-zinc-800/50 hover:border-white/20 hover:bg-white/5 transition-all group active:scale-95 ${user.isGuest ? 'opacity-50' : ''}`}
                      >
                          <div className="bg-black/50 p-4 rounded-full group-hover:scale-110 transition-transform">
                             {user.isGuest ? <Lock className="w-8 h-8 text-gray-500" /> : <ImageIcon className="w-8 h-8 text-white" />}
                          </div>
                          <span className="font-semibold text-sm text-gray-300 group-hover:text-white">{t.upload_image}</span>
                      </button>
                      <input 
                          type="file" 
                          accept="image/*" 
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileUpload}
                      />
                    </div>
                  )}

                  <div className="bg-zinc-900/40 backdrop-blur-xl p-5 rounded-[2rem] space-y-5 border border-white/5">
                    <div className="flex bg-black/50 p-1.5 rounded-2xl">
                        <button 
                          onClick={() => setTempTx({...tempTx, type: TransactionType.EXPENSE})}
                          className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${tempTx.type === 'expense' ? 'bg-zinc-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          {t.expense}
                        </button>
                        <button 
                          onClick={() => setTempTx({...tempTx, type: TransactionType.INCOME})}
                          className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${tempTx.type === 'income' ? 'bg-zinc-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          {t.income}
                        </button>
                    </div>
                    <div className="space-y-4 px-2">
                          <div className="group">
                              <label className="text-[10px] text-gray-500 ml-2 mb-1.5 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">{t.date}</label>
                              <input 
                                  type="date" 
                                  value={tempTx.date || new Date().toISOString().split('T')[0]}
                                  onChange={e => setTempTx({...tempTx, date: e.target.value})}
                                  className="w-full bg-black/50 text-white p-4 rounded-2xl border border-zinc-800/50 focus:border-sber-green focus:outline-none transition-all"
                              />
                          </div>
                          <div className="group">
                              <label className="text-[10px] text-gray-500 ml-2 mb-1.5 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">{t.vendor}</label>
                              <input 
                                  type="text"
                                  placeholder="e.g. Starbucks"
                                  value={tempTx.vendor || ''}
                                  onChange={e => setTempTx({...tempTx, vendor: e.target.value})}
                                  className="w-full bg-black/50 text-white p-4 rounded-2xl border border-zinc-800/50 focus:border-sber-green focus:outline-none transition-all"
                              />
                          </div>
                          <div className="group">
                              <label className="text-[10px] text-gray-500 ml-2 mb-1.5 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">{t.category}</label>
                              <select 
                                  value={tempTx.category || ''}
                                  onChange={e => setTempTx({...tempTx, category: e.target.value})}
                                  className="w-full bg-black/50 text-white p-4 rounded-2xl border border-zinc-800/50 focus:border-sber-green focus:outline-none appearance-none transition-all"
                              >
                                  <option value="" disabled>Select Category</option>
                                  {CATEGORIES.map(cat => (
                                  <option key={cat.id} value={cat.id}>
                                      {user.language === 'ar' ? cat.name_ar : user.language === 'ru' ? cat.name_ru : cat.name_en}
                                  </option>
                                  ))}
                              </select>
                          </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => { setTempTx({ type: TransactionType.EXPENSE }); setCurrentView('dashboard'); }}
                      className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold border border-zinc-800 hover:bg-zinc-800 transition-colors active:scale-95"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      onClick={saveTransaction}
                      className="flex-1 bg-sber-green text-white py-4 rounded-2xl font-bold shadow-lg shadow-sber-green/20 hover:bg-green-600 transition-colors active:scale-95"
                    >
                      {t.save}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {currentView === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6 text-sber-green" />
                {t.settings}
              </h2>
              
              <div className="bg-zinc-900/50 backdrop-blur-xl rounded-[2rem] p-6 space-y-4 border border-white/10">
                <div className="flex justify-between items-center p-2 border-b border-white/5 pb-4">
                  <span className="font-medium text-gray-200">{t.select_currency}</span>
                  <span className="text-sber-green font-mono bg-sber-green/10 px-3 py-1 rounded-lg border border-sber-green/20">{user.currency}</span>
                </div>
                <div className="flex justify-between items-center p-2 pt-2">
                  <span className="font-medium text-gray-200">Language</span>
                  <span className="text-white uppercase font-bold tracking-wide">{user.language}</span>
                </div>
              </div>

              {/* API Key Management */}
              <div className="bg-zinc-900/50 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10">
                <h3 className="font-bold mb-2 flex items-center gap-2 text-white">
                    <Key className="w-5 h-5 text-sber-green" />
                    {t.manage_api_key}
                </h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                    {user.isGuest ? "Add your API Key to unlock AI features." : t.change_key_desc}
                </p>
                
                <div className="flex flex-col gap-3">
                    <input 
                      type="password" 
                      placeholder="New API Key" 
                      value={editingKey}
                      onChange={(e) => setEditingKey(e.target.value)}
                      className="bg-black border border-zinc-700 p-4 rounded-xl text-sm focus:border-sber-green outline-none transition-colors"
                    />
                    <button 
                      onClick={handleUpdateApiKey}
                      disabled={!editingKey || isValidatingKey}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                    >
                      {isValidatingKey ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                          <CheckCircle className="w-4 h-4" />
                      )}
                      {user.isGuest ? t.add_key : t.update_key}
                    </button>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-red-500 p-5 bg-red-500/5 border border-red-500/10 rounded-[2rem] hover:bg-red-500/10 transition-colors font-bold mt-8"
              >
                <LogOut size={20} /> {t.sign_out} / Reset
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Navigation "Island" */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
         <nav className="bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] px-6 py-3 shadow-2xl flex items-center gap-6 pointer-events-auto scale-100 transition-transform duration-300">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`flex flex-col items-center gap-1 w-10 transition-all ${currentView === 'dashboard' ? 'text-sber-green scale-110' : 'text-zinc-500 hover:text-white'}`}
            >
              <Home size={22} strokeWidth={currentView === 'dashboard' ? 2.5 : 2} />
            </button>

            <button 
              onClick={() => setCurrentView('transactions')}
              className={`flex flex-col items-center gap-1 w-10 transition-all ${currentView === 'transactions' ? 'text-sber-green scale-110' : 'text-zinc-500 hover:text-white'}`}
            >
              <List size={22} strokeWidth={currentView === 'transactions' ? 2.5 : 2} />
            </button>

            <button 
                onClick={() => setCurrentView('add')}
                className="w-14 h-14 bg-gradient-to-tr from-sber-green to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sber-green/30 hover:scale-105 active:scale-95 transition-transform -mt-6 border-[4px] border-[#050505]"
            >
                <Plus size={28} strokeWidth={2.5} />
            </button>

            <button 
              onClick={() => setCurrentView('reports')}
              className={`flex flex-col items-center gap-1 w-10 transition-all ${currentView === 'reports' ? 'text-sber-green scale-110' : 'text-zinc-500 hover:text-white'}`}
            >
              <PieIcon size={22} strokeWidth={currentView === 'reports' ? 2.5 : 2} />
            </button>

            <button 
              onClick={() => setCurrentView('settings')}
              className={`flex flex-col items-center gap-1 w-10 transition-all ${currentView === 'settings' ? 'text-sber-green scale-110' : 'text-zinc-500 hover:text-white'}`}
            >
              <Settings size={22} strokeWidth={currentView === 'settings' ? 2.5 : 2} />
            </button>
         </nav>
      </div>
    </div>
  );
};

export default App;
```
---

### File: `constants.tsx`
```tsx
import { ExpenseCategory } from './types';
import { ShoppingCart, Utensils, Car, Home, Zap, HeartPulse, GraduationCap, Plane, Gift, Briefcase } from 'lucide-react';
import React from 'react';

export const CATEGORIES: ExpenseCategory[] = [
  { id: 'food', name_en: 'Food & Dining', name_ar: 'طعام ومطاعم', name_ru: 'Еда и напитки', icon: 'Utensils', color: '#FF9500' },
  { id: 'groceries', name_en: 'Groceries', name_ar: 'بقالة', name_ru: 'Продукты', icon: 'ShoppingCart', color: '#30D158' },
  { id: 'transport', name_en: 'Transport', name_ar: 'نقل ومواصلات', name_ru: 'Транспорт', icon: 'Car', color: '#0A84FF' },
  { id: 'housing', name_en: 'Housing', name_ar: 'سكن', name_ru: 'Жилье', icon: 'Home', color: '#BF5AF2' },
  { id: 'utilities', name_en: 'Utilities', name_ar: 'فواتير وخدمات', name_ru: 'Коммунальные', icon: 'Zap', color: '#FFD60A' },
  { id: 'health', name_en: 'Health', name_ar: 'صحة', name_ru: 'Здоровье', icon: 'HeartPulse', color: '#FF375F' },
  { id: 'education', name_en: 'Education', name_ar: 'تعليم', name_ru: 'Образование', icon: 'GraduationCap', color: '#64D2FF' },
  { id: 'travel', name_en: 'Travel', name_ar: 'سفر', name_ru: 'Путешествия', icon: 'Plane', color: '#5E5CE6' },
  { id: 'gifts', name_en: 'Gifts', name_ar: 'هدايا', name_ru: 'Подарки', icon: 'Gift', color: '#FF453A' },
  { id: 'salary', name_en: 'Salary', name_ar: 'راتب', name_ru: 'Зарплата', icon: 'Briefcase', color: '#21A038' },
];

export const TRANSLATIONS = {
  en: {
    welcome: "Welcome to Masareefy",
    setup_title: "Let's personalize your experience",
    enter_key: "Gemini API Key",
    enter_name: "Your Name",
    select_currency: "Currency",
    start: "Start Setup",
    guest_mode: "Continue as Guest",
    sign_in_google: "Sign in with Google",
    sign_out: "Sign Out",
    validating: "Validating Key...",
    invalid_key_error: "Invalid API Key. Please check.",
    
    // Onboarding Steps
    step_balance: "Current Balance",
    step_balance_desc: "Upload a screenshot of your current bank balance.",
    step_salary: "Last Salary Slip",
    step_salary_desc: "Upload your last pay slip or salary notification.",
    step_expenses: "Recent Expenses",
    step_expenses_desc: "Upload multiple receipts to learn your spending habits.",
    step_recurring: "Fixed Monthly Bills",
    step_recurring_desc: "Add your fixed bills like Rent, Internet, Netflix, etc.",
    step_review: "Review & Plan",
    upload_image: "Upload Image",
    upload_images: "Upload Images",
    analyzing_all: "Analyzing your financial profile...",
    
    // Calendar & Plan
    next_salary_date: "Next Salary Date",
    expected_amount: "Expected Amount",
    salary_diff: "Difference from last salary",
    confirm_setup: "Finish Setup",
    
    // Recurring
    bill_name: "Bill Name (e.g. Rent)",
    bill_amount: "Amount",
    add_bill: "Add New Bill",
    mark_paid: "Mark as Paid",
    confirm_payment: "Confirm Payment",
    deduct_balance: "Deduct from total balance?",
    payment_date: "Payment Date",
    
    dashboard: "Dashboard",
    transactions: "History",
    add: "Add",
    reports: "Reports",
    settings: "Settings",
    balance: "Total Balance",
    income: "Income",
    expense: "Expense",
    recent_transactions: "Recent Transactions",
    scan_receipt: "Scan Receipt",
    manual_add: "Manual Entry",
    analyzing: "Analyzing Receipt...",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    category: "Category",
    amount: "Amount",
    date: "Date",
    vendor: "Vendor / Source",
    note: "Note (Optional)",
    ai_insight: "AI Insight",
    insight_good: "Excellent! You are on track.",
    insight_warning: "Warning: Spending is high this week.",
    fixed_bills: "Fixed Bills",
    
    // AI & Settings
    download_report: "Download Report",
    close_report: "Close Report",
    manage_api_key: "Manage API Key",
    update_key: "Update Key",
    add_key: "Add API Key",
    key_valid_saved: "Key validated and saved!",
    key_invalid: "Invalid API Key",
    change_key_desc: "Update your Gemini API Key here if you are experiencing connection issues.",
    guest_warning: "You are in Guest Mode. AI features are disabled.",
  },
  ar: {
    welcome: "مرحباً بك في مصاريفي",
    setup_title: "دعنا نخصص تجربتك",
    enter_key: "مفتاح Gemini API",
    enter_name: "اسمك",
    select_currency: "العملة",
    start: "ابدأ الإعداد",
    guest_mode: "الدخول كضيف",
    sign_in_google: "تسجيل الدخول بجوجل",
    sign_out: "تسجيل الخروج",
    validating: "جاري التحقق...",
    invalid_key_error: "مفتاح غير صالح. يرجى التأكد.",
    
    // Onboarding Steps
    step_balance: "الرصيد الحالي",
    step_balance_desc: "ارفع صورة لرصيدك البنكي الحالي.",
    step_salary: "آخر راتب",
    step_salary_desc: "ارفع صورة لإشعار آخر راتب استلمته.",
    step_expenses: "مصاريف حديثة",
    step_expenses_desc: "ارفع عدة صور لفواتير سابقة لفهم نمط إنفاقك.",
    step_recurring: "مصاريف شهرية ثابتة",
    step_recurring_desc: "أضف المصاريف الثابتة مثل الإيجار، الإنترنت، الاشتراكات.",
    step_review: "المراجعة والتخطيط",
    upload_image: "رفع صورة",
    upload_images: "رفع صور",
    analyzing_all: "جاري تحليل ملفك المالي...",

    // Calendar & Plan
    next_salary_date: "موعد الراتب القادم",
    expected_amount: "المبلغ المتوقع",
    salary_diff: "الفرق عن الراتب السابق",
    confirm_setup: "إتمام الإعداد",

    // Recurring
    bill_name: "اسم الفاتورة (مثلاً: إيجار)",
    bill_amount: "المبلغ",
    add_bill: "إضافة فاتورة جديدة",
    mark_paid: "تحديد كمدفوع",
    confirm_payment: "تأكيد الدفع",
    deduct_balance: "خصم من الرصيد الكلي؟",
    payment_date: "تاريخ الدفع",

    dashboard: "الرئيسية",
    transactions: "السجل",
    add: "إضافة",
    reports: "التقارير",
    settings: "الإعدادات",
    balance: "الرصيد الكلي",
    income: "دخل",
    expense: "مصروف",
    recent_transactions: "آخر العمليات",
    scan_receipt: "مسح إيصال",
    manual_add: "إدخال يدوي",
    analyzing: "جاري تحليل الإيصال...",
    save: "حفظ",
    cancel: "إلغاء",
    confirm: "تأكيد",
    category: "التصنيف",
    amount: "المبلغ",
    date: "التاريخ",
    vendor: "المصدر / المتجر",
    note: "ملاحظة (اختياري)",
    ai_insight: "رؤية الذكاء الاصطناعي",
    insight_good: "ممتاز! أنت تسير وفق الخطة.",
    insight_warning: "تحذير: الإنفاق مرتفع هذا الأسبوع.",
    fixed_bills: "فواتير ثابتة",

    // AI & Settings
    download_report: "تنزيل التقرير",
    close_report: "إغلاق التقرير",
    manage_api_key: "إدارة مفتاح API",
    update_key: "تحديث المفتاح",
    add_key: "إضافة مفتاح API",
    key_valid_saved: "تم التحقق من المفتاح وحفظه!",
    key_invalid: "مفتاح API غير صالح",
    change_key_desc: "قم بتحديث مفتاح Gemini API الخاص بك هنا إذا كنت تواجه مشاكل في الاتصال.",
    guest_warning: "أنت في وضع الضيف. ميزات الذكاء الاصطناعي معطلة.",
  },
  ru: {
    welcome: "Добро пожаловать в Masareefy",
    setup_title: "Настроим ваш профиль",
    enter_key: "Ключ Gemini API",
    enter_name: "Ваше имя",
    select_currency: "Валюта",
    start: "Начать настройку",
    guest_mode: "Войти как гость",
    sign_in_google: "Войти через Google",
    sign_out: "Выйти",
    validating: "Проверка...",
    invalid_key_error: "Неверный ключ. Проверьте.",
    
    // Onboarding Steps
    step_balance: "Текущий баланс",
    step_balance_desc: "Загрузите скриншот текущего баланса.",
    step_salary: "Последняя зарплата",
    step_salary_desc: "Загрузите чек последней зарплаты.",
    step_expenses: "Недавние расходы",
    step_expenses_desc: "Загрузите чеки расходов для анализа привычек.",
    step_recurring: "Фиксированные расходы",
    step_recurring_desc: "Добавьте аренду, интернет, подписки и т.д.",
    step_review: "Обзор и план",
    upload_image: "Загрузить фото",
    upload_images: "Загрузить фото",
    analyzing_all: "Анализ финансового профиля...",

    // Calendar & Plan
    next_salary_date: "Дата следующей зарплаты",
    expected_amount: "Ожидаемая сумма",
    salary_diff: "Разница с прошлой зарплатой",
    confirm_setup: "Завершить",

    // Recurring
    bill_name: "Название (напр. Аренда)",
    bill_amount: "Сумма",
    add_bill: "Добавить счет",
    mark_paid: "Отметить как оплаченное",
    confirm_payment: "Подтвердить оплату",
    deduct_balance: "Списать с баланса?",
    payment_date: "Дата оплаты",

    dashboard: "Главная",
    transactions: "История",
    add: "Добавить",
    reports: "Отчеты",
    settings: "Настройки",
    balance: "Общий баланс",
    income: "Доход",
    expense: "Расход",
    recent_transactions: "Последние операции",
    scan_receipt: "Скан чека",
    manual_add: "Ручной ввод",
    analyzing: "Анализ чека...",
    save: "Сохранить",
    cancel: "Отмена",
    confirm: "Подтвердить",
    category: "Категория",
    amount: "Сумма",
    date: "Дата",
    vendor: "Продавец / Источник",
    note: "Заметка (опционально)",
    ai_insight: "AI Инсайт",
    insight_good: "Отлично! Вы следуете плану.",
    insight_warning: "Внимание: Расходы высоки на этой неделе.",
    fixed_bills: "Постоянные счета",

    // AI & Settings
    download_report: "Скачать отчет",
    close_report: "Закрыть отчет",
    manage_api_key: "Управление API ключом",
    update_key: "Обновить ключ",
    add_key: "Добавить API ключ",
    key_valid_saved: "Ключ проверен и сохранен!",
    key_invalid: "Неверный ключ API",
    change_key_desc: "Обновите ключ Gemini API здесь, если возникли проблемы с подключением.",
    guest_warning: "Вы в гостевом режиме. AI функции отключены.",
  }
};
```
---

### File: `declarations.d.ts`
```ts
declare module '@google/genai';
```
---

### File: `index.html`
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
    <title>Masareefy</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              sber: {
                green: '#21A038',
                dark: '#0B0C0B',
                card: '#1C1C1E',
                accent: '#4ADE80',
                gray: '#2C2C2E'
              }
            },
            fontFamily: {
              sans: ['Inter', 'Noto Sans Arabic', 'sans-serif'],
            },
            animation: {
              'enter': 'enter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
              'leave': 'leave 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
              'scale-in': 'scaleIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
              enter: {
                '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
                '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
              },
              leave: {
                '0%': { opacity: '1', transform: 'scale(1)' },
                '100%': { opacity: '0', transform: 'scale(0.98)' },
              },
              scaleIn: {
                '0%': { transform: 'scale(0.9)', opacity: '0' },
                '100%': { transform: 'scale(1)', opacity: '1' },
              }
            }
          }
        }
      }
    </script>
    <style>
      body {
        background-color: #050505;
        color: #FFFFFF;
        font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      /* Hide scrollbar for clean UI */
      ::-webkit-scrollbar {
        width: 0px;
        background: transparent;
      }
    </style>
  <script type="importmap">
{
  "imports": {
    "react/": "https://esm.sh/react@^19.2.3/",
    "react": "https://esm.sh/react@^19.2.3",
    "react-dom/": "https://esm.sh/react-dom@^19.2.3/",
    "lucide-react": "https://esm.sh/lucide-react@^0.562.0",
    "recharts": "https://esm.sh/recharts@^3.6.0",
    "react-markdown": "https://esm.sh/react-markdown@^10.1.0",
    "@google/genai": "https://esm.sh/@google/genai@^1.36.0",
    "path": "https://esm.sh/path@^0.12.7",
    "vite": "https://esm.sh/vite@^7.3.1",
    "@vitejs/plugin-react": "https://esm.sh/@vitejs/plugin-react@^5.1.2",
    "firebase/": "https://esm.sh/firebase@^12.8.0/"
  }
}
</script>
<link rel="stylesheet" href="/index.css">
</head>
  <body>
    <div id="root"></div>
  <script type="module" src="/index.tsx"></script>
</body>
</html>
```
---

### File: `index.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```
---

### File: `metadata.json`
```json
{
  "name": "Masareefy",
  "description": "Smart income and expense manager with AI receipt analysis.",
  "requestFramePermissions": [
    "camera"
  ]
}
```
---

### File: `package.json`
```json
{
  "name": "masareefy",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "lucide-react": "^0.562.0",
    "recharts": "^3.6.0",
    "react-markdown": "^10.1.0",
    "@google/genai": "^1.36.0",
    "path": "^0.12.7",
    "vite": "^7.3.1",
    "@vitejs/plugin-react": "^5.1.2",
    "firebase": "^12.8.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}

```
---

### File: `README.md`
```md
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1M_nvPxzotXGq-FOWN6TG1gAM5evw-s5l

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

```
---

### File: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "types": [
      "node"
    ],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```
---

### File: `types.ts`
```ts
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
```
---

### File: `vite.config.ts`
```ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
        'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
        'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID),
        'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
        'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
        'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```
---

## 📊 Stats
- Total Files: 21
- Total Characters: 129495
- Estimated Tokens: ~32.374 (GPT-4 Context)
