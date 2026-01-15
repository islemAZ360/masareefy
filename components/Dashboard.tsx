import React from 'react';
import { UserSettings, Transaction, TransactionType, BudgetPlan } from '../types';
import { TRANSLATIONS } from '../constants';
import { Wallet, ArrowUpRight, BrainCircuit, TrendingUp, TrendingDown, Lock, Sparkles, ChevronRight } from 'lucide-react';
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
    <div className="space-y-6 animate-in fade-in duration-700 pb-24">
      
      {user.isGuest && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-500 p-4 rounded-r-xl flex items-center gap-3 shadow-lg shadow-yellow-500/5 backdrop-blur-sm">
              <Lock className="text-yellow-500 w-5 h-5" />
              <p className="text-xs text-yellow-500 font-bold tracking-wide uppercase">
                  {t.guest_warning}
              </p>
          </div>
      )}

      {/* Hero Section: Balance Card */}
      <div className="relative group perspective-1000">
        {/* Ambient Glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-sber-green to-emerald-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#121214] border border-white/10 shadow-2xl p-8 transition-transform duration-500 hover:scale-[1.005]">
            {/* Background Texture */}
            <div className="absolute inset-0 z-0 opacity-20" style={{ 
                backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(33, 160, 56, 0.15) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(33, 160, 56, 0.05) 0%, transparent 50%)' 
            }}></div>
            <div className="absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            <div className="relative z-10 flex flex-col h-full justify-between min-h-[180px]">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 bg-white/5 p-2 pr-4 rounded-full border border-white/5 backdrop-blur-md">
                        <div className="bg-zinc-800 p-1.5 rounded-full">
                            <Wallet className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-bold text-[10px] tracking-widest uppercase">{t.balance}</p>
                    </div>
                    {/* Live Indicator */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sber-green/10 border border-sber-green/20">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sber-green opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-sber-green"></span>
                        </span>
                    </div>
                </div>

                <div className="mt-6 mb-2">
                    <h1 className="text-5xl font-extrabold text-white tracking-tighter tabular-nums drop-shadow-sm">
                        {displayBalance.toLocaleString()} <span className="text-2xl font-light text-sber-green opacity-80">{user.currency}</span>
                    </h1>
                </div>

                {/* Daily Progress Mini-Bar (If Plan Selected) */}
                {user.selectedPlan && (
                    <div className="mt-4 bg-zinc-900/50 rounded-xl p-3 border border-white/5 backdrop-blur-md flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">{user.language === 'ar' ? 'مصروف اليوم' : 'Daily Limit'}</span>
                                <span className={`text-xs font-mono font-bold ${isOverBudget ? 'text-red-400' : 'text-sber-green'}`}>
                                    {todaySpent.toLocaleString()} / {dailyLimit}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_currentColor] ${isOverBudget ? 'bg-red-500 shadow-red-500/50' : 'bg-sber-green shadow-sber-green/50'}`} 
                                    style={{ width: `${progressPercent}%` }} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Cash Flow Bento Grid */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1C1C1E] p-5 rounded-[1.5rem] border border-white/5 relative overflow-hidden group hover:border-sber-green/30 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="w-16 h-16 text-sber-green" />
              </div>
              <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-sber-green/20 flex items-center justify-center mb-3 text-sber-green">
                      <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t.income}</p>
                  <p className="text-xl font-bold text-white tabular-nums">
                      +{transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0).toLocaleString()}
                  </p>
              </div>
          </div>

          <div className="bg-[#1C1C1E] p-5 rounded-[1.5rem] border border-white/5 relative overflow-hidden group hover:border-red-500/30 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingDown className="w-16 h-16 text-red-500" />
              </div>
              <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center mb-3 text-red-500">
                      <TrendingDown className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t.expense}</p>
                  <p className="text-xl font-bold text-white tabular-nums">
                      -{transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0).toLocaleString()}
                  </p>
              </div>
          </div>
      </div>

      {/* AI Advisor Banner */}
      <button 
        onClick={onOpenAI}
        className="w-full relative group overflow-hidden rounded-[2rem] p-[1px]"
      >
         <div className="absolute inset-0 bg-gradient-to-r from-sber-green/40 via-emerald-500/40 to-sber-green/40 opacity-50 group-hover:opacity-100 transition duration-500 animate-pulse-slow"></div>
         <div className="relative bg-[#1C1C1E] rounded-[2rem] p-5 flex items-center justify-between overflow-hidden">
            {/* Glossy Reflection */}
            <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-b from-white/5 to-transparent rotate-45 pointer-events-none"></div>
            
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-sber-green to-emerald-800 rounded-2xl flex items-center justify-center shadow-lg shadow-sber-green/20 group-hover:scale-110 transition-transform duration-300">
                    <BrainCircuit className="text-white w-7 h-7" />
                </div>
                <div className="text-left">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        {user.language === 'ar' ? 'المستشار الذكي' : 'AI Advisor'}
                        <div className="flex items-center gap-1 bg-gradient-to-r from-sber-green to-emerald-400 text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(33,160,56,0.5)]">
                            <Sparkles className="w-2 h-2 fill-black" />
                            GEMINI
                        </div>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-[150px] leading-tight">
                        {user.language === 'ar' ? 'تحليل نفقاتك واقتراح حلول ذكية' : 'Deep insights & smart saving tips'}
                    </p>
                </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-colors">
                 <ChevronRight className="text-gray-400 w-5 h-5 group-hover:text-white" />
            </div>
         </div>
      </button>

      {/* Recurring Bills */}
      <div className="pt-2">
          <RecurringBills user={user} onPayBill={onPayBill} onAddBill={onAddBill} onDeleteBill={onDeleteBill} />
      </div>

      {/* Budget Plans Selector */}
      <div className="pt-2">
          <BudgetPlans user={user} onSelectPlan={onSelectPlan} />
      </div>

      {/* Recent Txs */}
      <div className="pt-4">
        <div className="flex justify-between items-end mb-4 px-2">
          <h2 className="text-xl font-bold text-white tracking-tight">{t.recent_transactions}</h2>
          <button onClick={() => onChangeView('transactions')} className="text-sber-green text-xs font-bold uppercase tracking-widest hover:text-emerald-400 transition-colors flex items-center gap-1 group">
              {t.transactions} <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
        <div className="space-y-3">
          {transactions.slice(0, 4).map(tx => (
            <TransactionItem key={tx.id} transaction={tx} currency={user.currency} language={user.language} />
          ))}
          {transactions.length === 0 && (
              <div className="text-center py-10 bg-[#1C1C1E] rounded-3xl border border-white/5 border-dashed">
                  <p className="text-gray-500 text-sm">No transactions yet.</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};