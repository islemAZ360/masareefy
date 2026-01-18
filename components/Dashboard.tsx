import React, { useState } from 'react';
import { UserSettings, Transaction, BudgetPlan, WalletType } from '../types';
import { TRANSLATIONS } from '../constants';
import { Wallet, ArrowUpRight, TrendingUp, CalendarClock, Zap, PiggyBank, Skull, AlertTriangle, Target, Sparkles, CreditCard, Pencil } from 'lucide-react';
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

// Visual: Rotating Border Light
const BorderBeam = () => (
    <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,#A855F7_360deg)] animate-[spin_4s_linear_infinite] opacity-30"></div>
    </div>
);

export const Dashboard: React.FC<Props> = ({ user, transactions, onSelectPlan, onOpenAI, onChangeView, onPayBill, onAddBill, onDeleteBill, onUpdateBankName }) => {
  const t = TRANSLATIONS[user.language];
  const [activeWallet, setActiveWallet] = useState<WalletType>('spending');
  const [renamingWallet, setRenamingWallet] = useState<WalletType | null>(null);
  const [tempName, setTempName] = useState('');

  // --- Logic ---
  const transactionsAfterSnapshot = transactions.filter(t => !t.id.startsWith('init-'));
  
  const calcBalance = (w: WalletType, initial: number) => {
      const inc = transactionsAfterSnapshot.filter(t => t.wallet === w && t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = transactionsAfterSnapshot.filter(t => t.wallet === w && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return initial + inc - exp;
  };

  const spendingBalance = calcBalance('spending', user.currentBalance || 0);
  const savingsBalance = calcBalance('savings', user.savingsBalance || 0);
  
  const currentBalance = activeWallet === 'spending' ? spendingBalance : savingsBalance;
  const currentBankName = activeWallet === 'spending' ? user.spendingBankName : user.savingsBankName;
  
  // Dynamic Card Styles
  const cardGradient = activeWallet === 'spending' 
    ? 'bg-gradient-to-br from-[#1c1c22] via-[#2d1b4e] to-[#0f0f13]' 
    : 'bg-gradient-to-br from-[#062c1b] via-[#0f4c3a] to-[#02180e]';
    
  const accentColor = activeWallet === 'spending' ? 'text-primary' : 'text-secondary';

  // Daily Limit
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySpent = transactions
      .filter(t => t.type === 'expense' && t.wallet === 'spending' && t.date.startsWith(todayStr))
      .reduce((s, t) => s + t.amount, 0);
  
  const dailyLimit = user.dailyLimit || 0;
  const progressPercent = dailyLimit > 0 ? Math.min((todaySpent / dailyLimit) * 100, 100) : 0;

  // Salary
  const calculateDaysToSalary = () => {
      if (!user.lastSalaryDate || !user.salaryInterval) return null;
      const last = new Date(user.lastSalaryDate);
      const next = new Date(last);
      next.setDate(last.getDate() + user.salaryInterval);
      const today = new Date();
      const diffTime = next.getTime() - today.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { days: days > 0 ? days : 0 };
  };
  const salaryData = calculateDaysToSalary();

  // Burn Rate
  const calculateBurnRate = () => {
      const today = new Date();
      const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);
      const recentSpent = transactions
        .filter(t => t.type === 'expense' && t.wallet === 'spending' && new Date(t.date) >= tenDaysAgo)
        .reduce((s, t) => s + t.amount, 0);
      const dailyBurn = recentSpent / 10 || 0;
      if (dailyBurn === 0) return null;
      const daysToZero = spendingBalance / dailyBurn;
      return { daysToZero };
  };
  const burnStats = calculateBurnRate();

  const handleStartRename = (e: React.MouseEvent) => {
      e.stopPropagation();
      setRenamingWallet(activeWallet);
      setTempName(currentBankName);
  };

  const handleSaveRename = () => {
      if (renamingWallet && tempName.trim()) {
          onUpdateBankName(renamingWallet, tempName.trim());
          setRenamingWallet(null);
      }
  };

  return (
    <div className="space-y-8 pb-32 pt-2 relative">
      
      {/* 1. Futuristic Header */}
      <div className="flex justify-between items-center animate-slide-up-fade" style={{ animationDelay: '0ms' }}>
        <div>
           <h1 className="text-4xl font-display font-bold text-white tracking-tighter text-glow">
             Hi, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{user.name.split(' ')[0]}</span>
           </h1>
           <p className="text-xs text-zinc-400 font-medium tracking-widest uppercase opacity-70">Financial Command</p>
        </div>
        <button onClick={() => onChangeView('settings')} className="w-12 h-12 rounded-full glass-card flex items-center justify-center p-0.5 group">
            {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
                <div className="text-lg font-bold font-display group-hover:text-primary transition-colors">{user.name.charAt(0)}</div>
            )}
        </button>
      </div>

      {/* 2. The Master Card (Floating & Beaming) */}
      <div className="relative group perspective-1000 animate-slide-up-fade" style={{ animationDelay: '100ms' }}>
          {/* Outer Glow */}
          <div className={`absolute -inset-1 rounded-[2.6rem] bg-gradient-to-r ${activeWallet === 'spending' ? 'from-primary to-accent' : 'from-secondary to-teal-400'} opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500 animate-pulse-glow`}></div>
          
          {/* Card Container */}
          <div 
            onClick={() => setActiveWallet(activeWallet === 'spending' ? 'savings' : 'spending')}
            className={`
                relative h-60 rounded-[2.5rem] p-7 flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-700
                ${cardGradient} glass-card border-0 animate-float
            `}
          >
              <BorderBeam />
              
              {/* Noise Texture Overlay */}
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
              
              {/* Top Row */}
              <div className="relative z-10 flex justify-between items-start">
                  <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-2 backdrop-blur-md border border-white/10">
                      {activeWallet === 'spending' ? <CreditCard size={16} className="text-primary" /> : <PiggyBank size={16} className="text-secondary" />}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                          {activeWallet === 'spending' ? 'Main Account' : 'Vault'}
                      </span>
                  </div>
                  <div className="w-12 h-8 rounded bg-white/10 flex items-center justify-center border border-white/5">
                      <div className="w-8 h-8 border-[3px] border-white/20 rounded-full -mr-4"></div>
                      <div className="w-8 h-8 border-[3px] border-white/20 rounded-full"></div>
                  </div>
              </div>

              {/* Balance (Neon) */}
              <div className="relative z-10">
                  <p className="text-zinc-400 text-[10px] font-mono mb-2 tracking-[0.2em] uppercase">Total Balance</p>
                  <h2 className="text-6xl font-display font-bold text-white tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                      {currentBalance.toLocaleString()}
                      <span className="text-2xl text-white/30 ml-2 font-light">{user.currency}</span>
                  </h2>
              </div>

              {/* Bottom Info */}
              <div className="relative z-10 flex justify-between items-end">
                  <div className="flex items-center gap-3 group/edit" onClick={handleStartRename}>
                      <p className="font-mono text-xs text-white/50 tracking-widest">•••• {user.apiKey ? user.apiKey.slice(-4) : '8888'}</p>
                      <Pencil size={12} className="text-white/20 group-hover/edit:text-white transition-colors" />
                  </div>
                  <div className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">{currentBankName}</div>
              </div>
          </div>
      </div>

      {/* 3. Bento Grid Stats */}
      <div className="grid grid-cols-2 gap-4 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
          
          {/* Daily Limit Box */}
          <div className="glass-card rounded-[2rem] p-6 relative overflow-hidden group hover:bg-white/5 transition-colors">
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                      <Target size={16} className={`${accentColor}`} />
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Limit</span>
                  </div>
                  {dailyLimit > 0 ? (
                      <div>
                          <span className="text-3xl font-display font-bold text-white tabular-nums">
                              {Math.max(0, dailyLimit - todaySpent).toLocaleString()}
                          </span>
                          <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ease-out ${todaySpent > dailyLimit ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-primary shadow-[0_0_10px_#A855F7]'}`} style={{ width: `${progressPercent}%` }}></div>
                          </div>
                      </div>
                  ) : (
                      <button onClick={() => onChangeView('settings')} className={`text-xs ${accentColor} font-bold hover:underline`}>Set Limit &rarr;</button>
                  )}
              </div>
          </div>

          {/* Payday Box */}
          <div className="glass-card rounded-[2rem] p-6 relative overflow-hidden group hover:bg-white/5 transition-colors">
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                      <CalendarClock size={16} className="text-secondary" />
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Refill</span>
                  </div>
                  {salaryData ? (
                      <div>
                          <span className="text-3xl font-display font-bold text-white tabular-nums">
                              {salaryData.days}
                          </span>
                          <span className="text-sm text-zinc-500 ml-1">days</span>
                          <p className="text-[10px] text-zinc-600 mt-2 font-mono opacity-60">Stay on track</p>
                      </div>
                  ) : (
                      <span className="text-xs text-zinc-600">No data</span>
                  )}
              </div>
          </div>
      </div>

      {/* 4. Action Orb Dock */}
      <div className="flex justify-between gap-2 animate-slide-up-fade px-2" style={{ animationDelay: '300ms' }}>
          <button onClick={() => onChangeView('add')} className="flex-1 glass-card hover:bg-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group">
              <ArrowUpRight size={22} className="text-zinc-300 group-hover:text-white transition-colors" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300">Send</span>
          </button>
          <button onClick={() => onChangeView('transactions')} className="flex-1 glass-card hover:bg-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group">
              <TrendingUp size={22} className="text-zinc-300 group-hover:text-white transition-colors" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300">Stats</span>
          </button>
          <button onClick={onOpenAI} className="flex-1 glass-card bg-primary/10 border-primary/20 hover:bg-primary/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <Sparkles size={22} className="text-primary animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary">AI</span>
          </button>
      </div>

      {/* 5. Alerts (Holographic) */}
      {burnStats && burnStats.daysToZero < 10 && salaryData && salaryData.days > burnStats.daysToZero && (
          <div className="glass-card bg-red-500/5 border-red-500/20 p-5 rounded-[2rem] flex items-center gap-4 animate-pulse-glow mx-1">
              <div className="p-3 bg-red-500/20 rounded-full text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"><Skull size={20} /></div>
              <div>
                  <h4 className="text-red-400 font-display font-bold text-sm tracking-wide">CRITICAL STATUS</h4>
                  <p className="text-[10px] text-zinc-400 mt-1">Runway ending in <span className="text-white font-bold">{burnStats.daysToZero.toFixed(0)} days</span>.</p>
              </div>
          </div>
      )}

      {/* 6. Recurring Bills */}
      <div className="animate-slide-up-fade" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between px-4 mb-3">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.fixed_bills}</h3>
          </div>
          <RecurringBills user={user} onPayBill={onPayBill} onAddBill={onAddBill} onDeleteBill={onDeleteBill} />
      </div>

      {/* Rename Modal (Glass) */}
      {renamingWallet && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-scale-in">
            <div className="relative glass-card bg-[#0F0E17] w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl border border-white/10">
                <h3 className="text-lg font-display font-bold text-white mb-6 text-center tracking-wide">Rename Wallet</h3>
                <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-white font-bold outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all mb-6 text-lg"
                    autoFocus
                />
                <div className="flex gap-3">
                    <button onClick={() => setRenamingWallet(null)} className="flex-1 py-4 rounded-2xl text-xs font-bold text-zinc-400 hover:bg-white/5 transition-colors uppercase tracking-wider">Cancel</button>
                    <button onClick={handleSaveRename} className="flex-1 bg-white text-black py-4 rounded-2xl text-xs font-bold hover:scale-105 transition-all shadow-lg uppercase tracking-wider">Save</button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};