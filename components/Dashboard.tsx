import React, { useState, useEffect } from 'react';
import { UserSettings, Transaction, TransactionType, BudgetPlan, WalletType } from '../types';
import { TRANSLATIONS } from '../constants';
import { Wallet, ArrowUpRight, TrendingUp, CalendarClock, ChevronRight, Zap, PiggyBank, Skull, AlertTriangle, Repeat, Pencil, Target, AlertCircle, Sparkles } from 'lucide-react';
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
  onUpdateBankName: (wallet: WalletType, newName: string) => void;
}

// --- Visual Components (Chips & Logos) ---
const EMVChip = () => (
    <div className="w-11 h-8 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md border border-yellow-600/50 relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 opacity-50 border-[0.5px] border-black/20 rounded-md"></div>
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20"></div>
        <div className="absolute left-1/3 top-0 w-[1px] h-full bg-black/20"></div>
        <div className="absolute right-1/3 top-0 w-[1px] h-full bg-black/20"></div>
        <div className="absolute top-1/2 left-1/2 w-4 h-4 border border-black/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
    </div>
);

const VisaLogo = ({ color }: { color: string }) => (
    <div className="flex items-center font-black italic tracking-tighter text-2xl opacity-90" style={{ color }}>
        VISA
    </div>
);

const NoiseTexture = () => (
    <div className="absolute inset-0 opacity-[0.12] mix-blend-overlay pointer-events-none z-0" 
         style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
    />
);

export const Dashboard: React.FC<Props> = ({ user, transactions, onSelectPlan, onOpenAI, onChangeView, onPayBill, onAddBill, onDeleteBill, onUpdateBankName }) => {
  const t = TRANSLATIONS[user.language];
  const [activeCard, setActiveCard] = useState<WalletType>('spending');
  
  // Rename Modal State
  const [renamingWallet, setRenamingWallet] = useState<WalletType | null>(null);
  const [tempName, setTempName] = useState('');

  // --- Logic: Financial Health ---
  const transactionsAfterSnapshot = transactions.filter(t => !t.id.startsWith('init-'));
  
  const calcBalance = (w: WalletType, initial: number) => {
      const inc = transactionsAfterSnapshot.filter(t => t.wallet === w && t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = transactionsAfterSnapshot.filter(t => t.wallet === w && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return initial + inc - exp;
  };

  const spendingBalance = calcBalance('spending', user.currentBalance || 0);
  const savingsBalance = calcBalance('savings', user.savingsBalance || 0);

  // --- Logic: Daily Gauge ---
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySpent = transactions
      .filter(t => t.type === 'expense' && t.wallet === 'spending' && t.date.startsWith(todayStr))
      .reduce((s, t) => s + t.amount, 0);
  
  const dailyLimit = user.dailyLimit || 0;
  const isOverBudget = dailyLimit > 0 && todaySpent > dailyLimit;
  const progressPercent = dailyLimit > 0 ? Math.min((todaySpent / dailyLimit) * 100, 100) : 0;
  
  let gaugeColor = 'bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]'; // Safe Neon
  if (progressPercent > 75) gaugeColor = 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]'; // Warning Neon
  if (progressPercent >= 100) gaugeColor = 'bg-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)]'; // Danger Neon

  // --- Logic: Salary Countdown ---
  const calculateDaysToSalary = () => {
      if (!user.lastSalaryDate || !user.salaryInterval) return null;
      const last = new Date(user.lastSalaryDate);
      const next = new Date(last);
      next.setDate(last.getDate() + user.salaryInterval);
      
      const today = new Date();
      const diffTime = next.getTime() - today.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { days: days > 0 ? days : 0, nextDate: next, totalInterval: user.salaryInterval };
  };
  const salaryData = calculateDaysToSalary();

  // --- Logic: Burn Rate ---
  const calculateBurnRate = () => {
      const today = new Date();
      const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);
      const recentSpent = transactions
        .filter(t => t.type === 'expense' && t.wallet === 'spending' && new Date(t.date) >= tenDaysAgo)
        .reduce((s, t) => s + t.amount, 0);
      
      const dailyBurn = recentSpent / 10 || 0;
      if (dailyBurn === 0) return null;

      const daysToZero = spendingBalance / dailyBurn;
      return { dailyBurn, daysToZero };
  };
  const burnStats = calculateBurnRate();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const handleStartRename = (e: React.MouseEvent, type: WalletType, currentName: string) => {
      e.stopPropagation();
      setRenamingWallet(type);
      setTempName(currentName);
  };

  const handleSaveRename = () => {
      if (renamingWallet && tempName.trim()) {
          onUpdateBankName(renamingWallet, tempName.trim());
          setRenamingWallet(null);
      }
  };

  // --- Premium Card Component ---
  const PremiumCard = ({ 
      type, 
      balance, 
      bankName, 
      bgColor, 
      textColor, 
      isActive, 
      onClick,
      onEditName
  }: { 
      type: WalletType, 
      balance: number, 
      bankName: string, 
      bgColor: string,
      textColor: string,
      isActive: boolean, 
      onClick: () => void,
      onEditName: (e: React.MouseEvent) => void
  }) => (
      <div 
        onClick={onClick}
        className={`absolute inset-0 rounded-[2rem] p-6 flex flex-col justify-between cursor-pointer overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] border border-white/5 ${
            isActive 
            ? 'z-20 opacity-100 translate-y-0 scale-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]' 
            : 'z-10 opacity-40 translate-y-8 scale-90 hover:translate-y-6 brightness-50 grayscale-[0.8] hover:grayscale-[0.5]'
        }`}
        style={{ 
            backgroundColor: bgColor, 
            color: textColor,
            boxShadow: isActive ? `0 25px 60px -15px ${bgColor}50` : 'none'
        }}
      >
         <NoiseTexture />
         
         {/* Holographic Shine */}
         <div className={`absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 skew-x-12 opacity-0 group-hover:opacity-100 animate-shimmer transition-opacity pointer-events-none ${isActive ? 'block' : 'hidden'}`} style={{backgroundSize: '200% 100%'}}></div>
         
         {/* Glossy Reflection */}
         <div className="absolute -top-32 -right-32 w-80 h-80 bg-white opacity-5 rounded-full blur-[80px] pointer-events-none"></div>
         
         <div className="relative z-10 flex justify-between items-start">
             <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-2 opacity-80">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{type === 'spending' ? 'DEBIT' : 'SAVINGS'}</span>
                    <div className="w-1 h-1 rounded-full bg-current animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">WORLD</span>
                 </div>
                 <EMVChip />
             </div>
             <VisaLogo color={textColor} />
         </div>

         <div className="relative z-10 mt-auto">
             <div className="flex justify-between items-end">
                 <div>
                    <h2 className="text-4xl font-mono font-bold tracking-tighter tabular-nums mb-1 drop-shadow-lg">
                        {balance.toLocaleString()} <span className="text-base opacity-70">{user.currency}</span>
                    </h2>
                    <p className="font-mono text-xs tracking-[0.2em] opacity-60">
                        •••• •••• •••• {user.apiKey ? user.apiKey.slice(-4) : '8888'}
                    </p>
                 </div>
                 
                 <button 
                    onClick={onEditName}
                    className="flex items-center gap-2 group/edit px-3 py-1.5 -mr-2 rounded-lg bg-black/10 backdrop-blur-md border border-white/5 hover:bg-white/10 transition-colors"
                 >
                    <span className="font-bold text-xs tracking-wide">{bankName}</span>
                    <Pencil size={10} className="opacity-50 group-hover/edit:opacity-100 transition-opacity" />
                 </button>
             </div>
         </div>
      </div>
  );

  return (
    <div className="space-y-8 pb-32 relative">
      
      {/* Greeting - Slide Down */}
      <div className="px-2 pt-2 animate-slide-down">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-0.5">{greeting}</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">{user.name.split(' ')[0]}</h1>
      </div>

      {/* 1. Stacked Cards Area */}
      <div className="relative h-[240px] w-full perspective-1000 group animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Savings Card */}
          <PremiumCard 
            type="savings" 
            balance={savingsBalance} 
            bankName={user.savingsBankName || 'Savings'} 
            bgColor={user.savingsBankColor || '#21A038'}
            textColor={user.savingsTextColor || '#FFFFFF'}
            isActive={activeCard === 'savings'} 
            onClick={() => setActiveCard('savings')}
            onEditName={(e) => handleStartRename(e, 'savings', user.savingsBankName)}
          />
          
          {/* Spending Card */}
          <PremiumCard 
            type="spending" 
            balance={spendingBalance} 
            bankName={user.spendingBankName || 'Main Bank'}
            bgColor={user.spendingBankColor || '#1C1C1E'}
            textColor={user.spendingTextColor || '#FFFFFF'}
            isActive={activeCard === 'spending'} 
            onClick={() => setActiveCard('spending')}
            onEditName={(e) => handleStartRename(e, 'spending', user.spendingBankName)}
          />
      </div>

      {/* 2. Neon Daily Gauge */}
      <div className="px-1 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {dailyLimit > 0 ? (
            <div className="glass-panel p-5 rounded-[2rem] relative overflow-hidden group">
                {/* Side Glow Line */}
                <div className={`absolute top-0 left-0 w-1 h-full ${gaugeColor.split(' ')[0]} shadow-[0_0_15px_currentColor]`}></div>
                
                <div className="flex justify-between items-end mb-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Target size={14} className={isOverBudget ? 'text-red-500 animate-pulse' : 'text-emerald-400'} />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{user.language === 'ar' ? 'ميزانية اليوم' : 'Daily Limit'}</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white tabular-nums tracking-tight drop-shadow-md">
                            {todaySpent.toLocaleString()} <span className="text-sm text-zinc-600 font-medium">/ {dailyLimit}</span>
                        </h3>
                    </div>
                    <div className="text-right">
                         <div className={`text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5 shadow-lg ${isOverBudget ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                            {isOverBudget 
                                ? (user.language === 'ar' ? 'تجاوزت الحد' : 'OVER LIMIT') 
                                : `${Math.round((todaySpent/dailyLimit)*100)}% USED`
                            }
                         </div>
                    </div>
                </div>

                {/* Neon Progress Bar */}
                <div className="h-3 bg-black/50 rounded-full overflow-hidden relative z-10 shadow-inner border border-white/5">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${gaugeColor} ${isOverBudget ? 'animate-pulse' : ''}`}
                        style={{ width: `${progressPercent}%` }}
                    >
                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/60 blur-[4px]"></div>
                    </div>
                </div>
                
                {/* Background Glow */}
                {isOverBudget && <div className="absolute inset-0 bg-red-500/5 animate-pulse z-0 pointer-events-none" />}
            </div>
        ) : (
            <button 
                onClick={() => onChangeView('settings')}
                className="w-full glass p-6 rounded-[2rem] border border-dashed border-zinc-700 flex items-center justify-center gap-3 text-zinc-500 hover:text-white hover:border-zinc-500 transition-all hover:bg-white/5 active:scale-95"
            >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Target size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">{user.language === 'ar' ? 'تحديد خطة صرف يومية' : 'Setup Budget Plan'}</span>
            </button>
        )}
      </div>

      {/* 3. Salary Countdown Pill */}
      {salaryData && salaryData.days > 0 && (
          <div className="px-1 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="glass p-1.5 rounded-[1.8rem] border border-white/5 flex items-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="bg-[#18181b] p-3.5 rounded-[1.4rem] text-purple-400 z-10 shadow-lg border border-white/5">
                      <CalendarClock size={20} />
                  </div>
                  <div className="flex-1 px-4 z-10 flex justify-between items-center">
                      <div>
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Payday in</p>
                          <p className="text-xl font-bold text-white leading-none tracking-tight">{salaryData.days} Days</p>
                      </div>
                      
                      {/* Circular Progress Mini */}
                      <div className="relative w-10 h-10 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90">
                              <circle cx="20" cy="20" r="16" stroke="#333" strokeWidth="3" fill="none" />
                              <circle 
                                cx="20" cy="20" r="16" 
                                stroke="#A855F7" strokeWidth="3" fill="none" 
                                strokeDasharray="100" 
                                strokeDashoffset={100 - ((salaryData.totalInterval - salaryData.days) / salaryData.totalInterval) * 100} 
                                strokeLinecap="round"
                                className="drop-shadow-[0_0_4px_rgba(168,85,247,0.5)]"
                              />
                          </svg>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 4. Alerts & Insights */}
      {burnStats && burnStats.daysToZero < 10 && salaryData && salaryData.days > burnStats.daysToZero && (
          <div className="px-1 animate-slide-up" style={{ animationDelay: '0.35s' }}>
              <div className={`rounded-[2rem] p-5 border flex items-start gap-4 shadow-lg backdrop-blur-md ${user.selectedPlan === 'austerity' ? 'bg-red-950/40 border-red-500/30' : 'bg-yellow-950/40 border-yellow-500/30'}`}>
                  <div className={`p-3 rounded-2xl shrink-0 ${user.selectedPlan === 'austerity' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                    {user.selectedPlan === 'austerity' ? <Skull size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div>
                      <h4 className={`font-bold text-sm ${user.selectedPlan === 'austerity' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {user.selectedPlan === 'austerity' ? "Critical Condition" : "Funds Low"}
                      </h4>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                          {user.selectedPlan === 'austerity' 
                            ? `Estimated runway: ${burnStats.daysToZero.toFixed(0)} days. Salary in ${salaryData.days} days.`
                            : `Runway: ${burnStats.daysToZero.toFixed(0)} days. Switch to Austerity recommended.`
                          }
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* 5. Glassy Action Grid */}
      <div className="grid grid-cols-2 gap-3 px-1 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <button 
             onClick={() => onChangeView('add')}
             className="group glass p-5 rounded-[2rem] flex flex-col items-center gap-3 transition-all active:scale-95 hover:bg-white/5 border border-white/5 hover:border-white/10 relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-sber-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="w-12 h-12 bg-sber-green/10 rounded-2xl flex items-center justify-center text-sber-green group-hover:scale-110 transition-transform duration-300 border border-sber-green/20 group-hover:shadow-[0_0_20px_rgba(33,160,56,0.3)]">
                 <ArrowUpRight size={24} />
             </div>
             <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase tracking-widest transition-colors">{t.add}</span>
          </button>
          
          <button 
             onClick={() => onChangeView('transactions')}
             className="group glass p-5 rounded-[2rem] flex flex-col items-center gap-3 transition-all active:scale-95 hover:bg-white/5 border border-white/5 hover:border-white/10 relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300 border border-blue-500/20 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                 <TrendingUp size={24} />
             </div>
             <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase tracking-widest transition-colors">History</span>
          </button>
      </div>

      {/* AI Advisor Banner */}
      <div className="px-1 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <button 
            onClick={onOpenAI}
            className="w-full relative group overflow-hidden rounded-[2.5rem] p-1 pr-6 flex items-center justify-between transition-all border border-indigo-500/30 hover:border-indigo-500/50"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 rounded-[2.5rem]"></div>
            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
            
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_20px_rgba(129,140,248,0.4)] group-hover:scale-105 transition-transform duration-500">
                    <Sparkles className="text-white w-7 h-7 fill-current animate-pulse" />
                </div>
                <div className="text-left">
                    <h3 className="font-bold text-white text-lg drop-shadow-md">AI Advisor</h3>
                    <p className="text-xs text-indigo-200 font-medium">Generate insights report</p>
                </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative z-10 group-hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10">
                <ChevronRight className="text-white w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </button>
      </div>

      {/* Recurring Bills */}
      <div className="pt-2 px-1 animate-slide-up" style={{ animationDelay: '0.6s' }}>
         <div className="flex items-center gap-2 mb-4 px-2">
             <div className="w-1 h-4 bg-zinc-600 rounded-full"></div>
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.fixed_bills}</h3>
         </div>
         <RecurringBills user={user} onPayBill={onPayBill} onAddBill={onAddBill} onDeleteBill={onDeleteBill} />
      </div>

      {/* Rename Modal */}
      {renamingWallet && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setRenamingWallet(null)} />
            <div className="relative glass-strong border border-white/10 w-full max-w-xs rounded-[2rem] p-6 animate-scale-in shadow-2xl">
                <h3 className="text-base font-bold text-white mb-4 text-center">Rename Wallet</h3>
                <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-black/50 p-4 rounded-2xl border border-zinc-700 text-white text-center font-bold focus:border-sber-green focus:shadow-[0_0_15px_rgba(33,160,56,0.3)] outline-none mb-4 transition-all"
                    autoFocus
                />
                <div className="flex gap-3">
                    <button onClick={() => setRenamingWallet(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-3 rounded-xl text-xs font-bold text-zinc-400 transition-colors">Cancel</button>
                    <button onClick={handleSaveRename} className="flex-1 bg-sber-green hover:bg-emerald-600 py-3 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-95">Save</button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};