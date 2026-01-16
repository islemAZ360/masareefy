import React, { useState, useEffect } from 'react';
import { UserSettings, Transaction, TransactionType, BudgetPlan, WalletType } from '../types';
import { TRANSLATIONS } from '../constants';
import { Wallet, ArrowUpRight, ArrowDownLeft, Sparkles, TrendingUp, CalendarClock, ChevronRight, Zap, PiggyBank, Skull, AlertTriangle, Repeat, Pencil, Check, X } from 'lucide-react';
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

  const detectedSub = (() => {
      const counts: Record<number, number> = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
          counts[t.amount] = (counts[t.amount] || 0) + 1;
      });
      const subAmount = Object.keys(counts).find(k => counts[Number(k)] > 1 && Number(k) > 0);
      return subAmount ? Number(subAmount) : null;
  })();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const handleStartRename = (e: React.MouseEvent, type: WalletType, currentName: string) => {
      e.stopPropagation(); // Stop card flip
      setRenamingWallet(type);
      setTempName(currentName);
  };

  const handleSaveRename = () => {
      if (renamingWallet && tempName.trim()) {
          onUpdateBankName(renamingWallet, tempName.trim());
          setRenamingWallet(null);
      }
  };

  // --- UI Components ---
  
  const VisaCard = ({ 
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
        style={{ backgroundColor: bgColor, color: textColor }}
        className={`absolute inset-0 rounded-[2rem] p-6 flex flex-col justify-between cursor-pointer shadow-2xl border border-white/5 overflow-hidden transition-all duration-700 ease-spring ${
            isActive 
            ? 'z-20 opacity-100 translate-y-0 scale-100 rotate-0' 
            : 'z-10 opacity-60 translate-y-4 scale-95 hover:translate-y-2'
        }`}
      >
         {/* Noise Texture for Realism */}
         <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
         
         <div className="relative z-10 flex justify-between items-start">
             <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70" style={{ color: textColor }}>
                    {type === 'spending' ? 'Main Account' : 'Savings Pot'}
                </p>
                <h2 className="text-4xl font-extrabold tracking-tighter tabular-nums" style={{ color: textColor }}>
                    {balance.toLocaleString()} <span className="text-lg font-normal opacity-70">{user.currency}</span>
                </h2>
             </div>
             <div 
                className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10"
                style={{ backgroundColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
             >
                 {type === 'spending' ? <Wallet className="w-5 h-5" style={{ color: textColor }} /> : <PiggyBank className="w-5 h-5" style={{ color: textColor }} />}
             </div>
         </div>

         <div className="relative z-10">
             <div className="flex justify-between items-end">
                 <p className="font-mono text-sm tracking-wider opacity-60" style={{ color: textColor }}>
                    **** {user.apiKey ? user.apiKey.slice(-4) : '8888'}
                 </p>
                 
                 {/* Clickable Bank Name */}
                 <button 
                    onClick={onEditName}
                    className="flex items-center gap-2 group/edit px-2 py-1 -mr-2 rounded-lg hover:bg-white/10 transition-colors"
                 >
                    <span className="font-bold text-sm" style={{ color: textColor }}>{bankName}</span>
                    <Pencil size={10} style={{ color: textColor }} className="opacity-0 group-hover/edit:opacity-70 transition-opacity" />
                 </button>
             </div>
         </div>
      </div>
  );

  return (
    <div className="space-y-6 pb-24 relative">
      
      {/* Header */}
      <div className="flex justify-between items-center px-2 pt-2">
        <div>
           <p className="text-zinc-400 text-sm font-medium">{greeting},</p>
           <h1 className="text-2xl font-bold text-white tracking-tight">{user.name.split(' ')[0]}</h1>
        </div>
        <button onClick={() => onChangeView('settings')}>
           {user.photoURL ? (
             <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-zinc-800" alt="profile" />
           ) : (
             <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                <span className="text-sm font-bold text-white">{user.name.charAt(0)}</span>
             </div>
           )}
        </button>
      </div>

      {/* 1. Stacked Cards Area */}
      <div className="relative h-[220px] w-full perspective-1000 group">
          {/* Savings Card */}
          <VisaCard 
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
          <VisaCard 
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

      {/* 2. Salary Countdown */}
      {salaryData && salaryData.days > 0 && (
          <div className="px-2">
              <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                  <div className="bg-purple-500/10 p-3 rounded-xl">
                      <CalendarClock className="text-purple-400 w-6 h-6" />
                  </div>
                  <div className="flex-1">
                      <div className="flex justify-between mb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase">Next Salary</span>
                          <span className="text-xs font-bold text-white">{salaryData.days} days left</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full transition-all duration-1000" 
                            style={{ width: `${((salaryData.totalInterval - salaryData.days) / salaryData.totalInterval) * 100}%` }}
                          />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 3. The Doom Alert */}
      {burnStats && burnStats.daysToZero < 10 && salaryData && salaryData.days > burnStats.daysToZero && (
          <div className="px-2 animate-bounce-slow">
              <div className={`rounded-2xl p-4 border flex items-start gap-3 ${user.selectedPlan === 'austerity' ? 'bg-red-900/20 border-red-500/50' : 'bg-yellow-900/20 border-yellow-500/50'}`}>
                  {user.selectedPlan === 'austerity' ? (
                      <Skull className="text-red-500 w-6 h-6 shrink-0" />
                  ) : (
                      <AlertTriangle className="text-yellow-500 w-6 h-6 shrink-0" />
                  )}
                  <div>
                      <h4 className={`font-bold text-sm ${user.selectedPlan === 'austerity' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {user.selectedPlan === 'austerity' ? "You are going to die 💀" : "Warning: Funds Low"}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                          {user.selectedPlan === 'austerity' 
                            ? `At this rate, you go broke in ${burnStats.daysToZero.toFixed(0)} days. Salary is in ${salaryData.days} days.`
                            : `You will run out of money in ${burnStats.daysToZero.toFixed(0)} days. Switch to Austerity Plan?`
                          }
                      </p>
                      {user.selectedPlan !== 'austerity' && (
                          <button 
                            onClick={() => onSelectPlan({ type: 'austerity', dailyLimit: 50, monthlySavingsProjected: 0, description_en: '', description_ar: '', description_ru: '' })}
                            className="mt-2 bg-yellow-500 text-black text-[10px] font-bold px-3 py-1.5 rounded-lg"
                          >
                              Enable Austerity Mode
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* 4. Subscription Detective */}
      {detectedSub && (
          <div className="px-2">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <Repeat className="text-blue-400 w-5 h-5" />
                      <div>
                          <p className="text-xs font-bold text-blue-300">Subscription Detected?</p>
                          <p className="text-[10px] text-blue-200/60">Transaction of {detectedSub} repeats often.</p>
                      </div>
                  </div>
                  <button className="text-[10px] bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold">Add Fixed Bill</button>
              </div>
          </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 px-2">
          <button 
             onClick={() => onChangeView('add')}
             className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-2 hover:bg-[#252527] transition-all active:scale-95"
          >
             <div className="w-10 h-10 bg-sber-green/10 rounded-full flex items-center justify-center text-sber-green">
                 <ArrowUpRight size={20} />
             </div>
             <span className="text-xs font-bold text-zinc-300">{t.add}</span>
          </button>
          
          <button 
             onClick={() => onChangeView('transactions')}
             className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-2 hover:bg-[#252527] transition-all active:scale-95"
          >
             <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
                 <TrendingUp size={20} />
             </div>
             <span className="text-xs font-bold text-zinc-300">History</span>
          </button>
      </div>

      {/* AI Advisor Banner */}
      <button 
        onClick={onOpenAI}
        className="mx-2 relative group overflow-hidden rounded-[1.5rem] bg-[#1C1C1E] border border-white/5 p-5 flex items-center justify-between hover:bg-[#252527] transition-all"
      >
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Zap className="text-white w-6 h-6 fill-current" />
            </div>
            <div className="text-left">
                <h3 className="font-bold text-white text-base">AI Analysis</h3>
                <p className="text-xs text-gray-400">Generate financial report</p>
            </div>
         </div>
         <ChevronRight className="text-zinc-600" />
      </button>

      {/* Recurring Bills */}
      <div className="pt-2 px-2">
         <div className="flex items-center gap-2 mb-3">
             <CalendarClock className="w-4 h-4 text-zinc-400" />
             <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.fixed_bills}</h3>
         </div>
         <RecurringBills user={user} onPayBill={onPayBill} onAddBill={onAddBill} onDeleteBill={onDeleteBill} />
      </div>

      {/* Rename Modal */}
      {renamingWallet && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRenamingWallet(null)} />
            <div className="relative bg-[#1C1C1E] border border-white/10 w-full max-w-xs rounded-2xl p-4 animate-in zoom-in-95">
                <h3 className="text-sm font-bold text-white mb-3">Rename {renamingWallet === 'spending' ? 'Main Account' : 'Savings'}</h3>
                <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-black p-3 rounded-xl border border-zinc-700 text-white text-sm focus:border-sber-green outline-none mb-3"
                    autoFocus
                />
                <div className="flex gap-2">
                    <button onClick={() => setRenamingWallet(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-xl text-xs font-bold text-zinc-400">Cancel</button>
                    <button onClick={handleSaveRename} className="flex-1 bg-sber-green hover:bg-green-600 py-2 rounded-xl text-xs font-bold text-white">Save</button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};