import React, { useState, useEffect } from 'react';
import { UserSettings, Transaction, BudgetPlan, WalletType } from '../types';
import { TRANSLATIONS } from '../constants';
import { Wallet, ArrowUpRight, TrendingUp, CalendarClock, Zap, PiggyBank, Skull, AlertTriangle, Target, Sparkles, CreditCard, Pencil, Flame, HeartPulse, ChevronRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
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
    const [activeWallet, setActiveWallet] = useState<WalletType>('spending');
    const [renamingWallet, setRenamingWallet] = useState<WalletType | null>(null);
    const [tempName, setTempName] = useState('');
    const [showBalance, setShowBalance] = useState(true);
    const [cardFlipping, setCardFlipping] = useState(false);

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

    // Daily Limit
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySpent = transactions
        .filter(t => t.type === 'expense' && t.wallet === 'spending' && t.date.startsWith(todayStr))
        .reduce((s, t) => s + t.amount, 0);
    const dailyLimit = user.dailyLimit || 0;
    const progressPercent = dailyLimit > 0 ? Math.min((todaySpent / dailyLimit) * 100, 100) : 0;
    const limitRemaining = Math.max(0, dailyLimit - todaySpent);

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

    // Burn Rate (30-day lookback)
    const calculateBurnRate = () => {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentExpenses = transactions
            .filter(t => t.type === 'expense' && t.wallet === 'spending' && new Date(t.date) >= thirtyDaysAgo);
        const totalSpent = recentExpenses.reduce((s, t) => s + t.amount, 0);
        const daysWithData = Math.max(1, Math.min(30, Math.ceil((today.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24))));
        const dailyBurn = totalSpent / daysWithData;
        if (dailyBurn === 0) return null;
        const daysToZero = spendingBalance / dailyBurn;
        return { dailyBurn, daysToZero, totalSpent };
    };
    const burnStats = calculateBurnRate();

    // Health Score (0-100)
    const calculateHealthScore = () => {
        let score = 50;

        // Factor 1: Savings ratio
        const totalBalance = spendingBalance + savingsBalance;
        if (totalBalance > 0) {
            const savingsRatio = savingsBalance / totalBalance;
            score += savingsRatio * 20; // up to +20
        }

        // Factor 2: Daily limit adherence
        if (dailyLimit > 0 && todaySpent <= dailyLimit) score += 10;
        if (dailyLimit > 0 && todaySpent > dailyLimit) score -= 15;

        // Factor 3: Burn rate runway
        if (burnStats) {
            if (burnStats.daysToZero > 30) score += 15;
            else if (burnStats.daysToZero > 14) score += 5;
            else score -= 20;
        }

        // Factor 4: Having recurring bills set
        if (user.recurringBills && user.recurringBills.length > 0) score += 5;

        return Math.max(0, Math.min(100, Math.round(score)));
    };
    const healthScore = calculateHealthScore();
    const healthGrade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D';
    const healthColor = healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#EAB308' : healthScore >= 40 ? '#F97316' : '#EF4444';

    const handleFlipWallet = () => {
        setCardFlipping(true);
        setTimeout(() => {
            setActiveWallet(prev => prev === 'spending' ? 'savings' : 'spending');
            setTimeout(() => setCardFlipping(false), 300);
        }, 200);
    };

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

    // Format balance with animation-friendly splitting
    const formatBalance = (val: number) => {
        const parts = val.toLocaleString().split('');
        return parts;
    };

    return (
        <div className="space-y-6 pb-32 pt-2 relative">

            {/* 1. Header – Greeting + Profile */}
            <div className="flex justify-between items-center animate-slide-up-fade px-1">
                <div>
                    <p className="text-xs text-zinc-500 font-medium tracking-widest uppercase mb-1">Financial Command Center</p>
                    <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                        {user.language === 'ar' ? 'مرحبًا' : user.language === 'ru' ? 'Привет' : 'Hey'},{' '}
                        <span className="text-shimmer">{user.name.split(' ')[0]}</span>
                    </h1>
                </div>
                <button onClick={() => onChangeView('settings')} className="w-13 h-13 rounded-2xl glass-card flex items-center justify-center p-0.5 group ripple-effect relative overflow-hidden">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-2xl object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-lg font-bold font-display group-hover:text-primary transition-colors">{user.name.charAt(0)}</div>
                    )}
                </button>
            </div>

            {/* 2. The Master Card – Premium 3D Design */}
            <div className="relative group animate-slide-up-fade" style={{ animationDelay: '100ms' }}>
                {/* Outer Glow – More intense */}
                <div className={`absolute -inset-2 rounded-[3rem] bg-gradient-to-br ${activeWallet === 'spending' ? 'from-primary via-accent to-primary' : 'from-secondary via-teal-400 to-secondary'} opacity-15 blur-2xl group-hover:opacity-30 transition-opacity duration-700`}></div>

                {/* Card */}
                <div
                    onClick={handleFlipWallet}
                    className={`
                        relative h-56 rounded-[2.5rem] p-7 flex flex-col justify-between overflow-hidden cursor-pointer
                        transition-all duration-500 ${cardFlipping ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}
                        ${activeWallet === 'spending'
                            ? 'bg-gradient-to-br from-[#18102e] via-[#1a1025] to-[#0d0b12]'
                            : 'bg-gradient-to-br from-[#071f15] via-[#0c2e20] to-[#04130a]'
                        }
                        border border-white/8 shadow-2xl
                    `}
                >
                    {/* Animated Shimmer Sweep */}
                    <div className="shimmer-overlay rounded-[2.5rem]"></div>

                    {/* Corner Glow Orb */}
                    <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-20 ${activeWallet === 'spending' ? 'bg-primary' : 'bg-secondary'}`}></div>
                    <div className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${activeWallet === 'spending' ? 'bg-accent' : 'bg-teal-400'}`}></div>

                    {/* Top Row – Chip + Badge */}
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-2.5 backdrop-blur-md border-white/10">
                            {activeWallet === 'spending'
                                ? <CreditCard size={15} className="text-primary" />
                                : <PiggyBank size={15} className="text-secondary" />
                            }
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/80">
                                {activeWallet === 'spending'
                                    ? (user.language === 'ar' ? 'الحساب الرئيسي' : 'Main Account')
                                    : (user.language === 'ar' ? 'الخزنة' : 'Vault')
                                }
                            </span>
                        </div>
                        {/* Tap to flip indicator */}
                        <div className="flex items-center gap-1.5 text-white/20">
                            <RefreshCw size={12} className={`${cardFlipping ? 'animate-spin' : ''}`} />
                            <span className="text-[8px] tracking-wider uppercase font-mono">TAP</span>
                        </div>
                    </div>

                    {/* Balance – Giant Numbers */}
                    <div className="relative z-10" onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}>
                        <p className="text-zinc-500 text-[10px] font-mono mb-1.5 tracking-[0.25em] uppercase">
                            {user.language === 'ar' ? 'الرصيد الإجمالي' : 'Total Balance'}
                        </p>
                        <div className="flex items-baseline gap-1">
                            <h2 className={`text-5xl font-display font-black text-white tracking-tighter tabular-nums transition-all duration-500 ${showBalance ? '' : 'blur-lg select-none'}`}>
                                {currentBalance.toLocaleString()}
                            </h2>
                            <span className={`text-xl font-light tracking-wider ${activeWallet === 'spending' ? 'text-primary/50' : 'text-secondary/50'}`}>
                                {user.currency}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="relative z-10 flex justify-between items-end">
                        <div className="flex items-center gap-3 group/edit" onClick={(e) => { e.stopPropagation(); handleStartRename(e); }}>
                            <p className="font-mono text-xs text-white/30 tracking-widest">•••• {user.apiKey ? user.apiKey.slice(-4) : '8888'}</p>
                            <Pencil size={11} className="text-white/15 group-hover/edit:text-white/50 transition-colors" />
                        </div>
                        <div className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">{currentBankName}</div>
                    </div>
                </div>
            </div>

            {/* 3. Bento Grid – 4 Stats */}
            <div className="grid grid-cols-2 gap-3 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>

                {/* Daily Limit */}
                <div className="glass-panel rounded-[1.8rem] p-5 relative overflow-hidden group hover-lift ripple-effect">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Target size={16} className="text-primary" />
                            </div>
                        </div>
                        {dailyLimit > 0 ? (
                            <div>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
                                    {user.language === 'ar' ? 'المتبقي اليوم' : 'Remaining'}
                                </p>
                                <span className={`text-2xl font-display font-bold tabular-nums ${todaySpent > dailyLimit ? 'text-red-400' : 'text-white'}`}>
                                    {limitRemaining.toLocaleString()}
                                </span>
                                <div className="progress-neon mt-3">
                                    <div
                                        className={`bar ${todaySpent > dailyLimit ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-primary shadow-[0_0_10px_var(--primary-glow)]'}`}
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => onChangeView('settings')} className="text-xs text-primary font-bold hover:underline mt-1">
                                {user.language === 'ar' ? 'حدد الحد ←' : 'Set Limit →'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Payday Countdown */}
                <div className="glass-panel rounded-[1.8rem] p-5 relative overflow-hidden group hover-lift ripple-effect">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                                <CalendarClock size={16} className="text-secondary" />
                            </div>
                        </div>
                        {salaryData ? (
                            <div>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
                                    {user.language === 'ar' ? 'يوم الراتب' : 'Payday'}
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-display font-bold text-white tabular-nums">{salaryData.days}</span>
                                    <span className="text-xs text-zinc-500 font-mono">{user.language === 'ar' ? 'يوم' : 'days'}</span>
                                </div>
                                {salaryData.days <= 3 && (
                                    <p className="text-[9px] text-secondary mt-2 font-bold animate-pulse">
                                        {user.language === 'ar' ? '🎉 قريب جداً!' : '🎉 Almost there!'}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-zinc-600 font-mono">{user.language === 'ar' ? 'لا بيانات' : 'No data'}</span>
                        )}
                    </div>
                </div>

                {/* Burn Rate */}
                <div className="glass-panel rounded-[1.8rem] p-5 relative overflow-hidden group hover-lift ripple-effect">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <Flame size={16} className="text-orange-400" />
                            </div>
                        </div>
                        {burnStats ? (
                            <div>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
                                    {user.language === 'ar' ? 'تنفد خلال' : 'Runway'}
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-2xl font-display font-bold tabular-nums ${burnStats.daysToZero < 10 ? 'text-red-400' : burnStats.daysToZero < 20 ? 'text-orange-400' : 'text-white'}`}>
                                        {Math.round(burnStats.daysToZero)}
                                    </span>
                                    <span className="text-xs text-zinc-500 font-mono">{user.language === 'ar' ? 'يوم' : 'days'}</span>
                                </div>
                                <p className="text-[9px] text-zinc-600 mt-2 font-mono">
                                    ~{Math.round(burnStats.dailyBurn).toLocaleString()}/{user.language === 'ar' ? 'يومياً' : 'day'}
                                </p>
                            </div>
                        ) : (
                            <span className="text-xs text-zinc-600 font-mono">{user.language === 'ar' ? 'لا بيانات' : 'No data'}</span>
                        )}
                    </div>
                </div>

                {/* Health Score */}
                <div className="glass-panel rounded-[1.8rem] p-5 relative overflow-hidden group hover-lift ripple-effect">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${healthColor}15` }}>
                                <HeartPulse size={16} style={{ color: healthColor }} />
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
                            {user.language === 'ar' ? 'الصحة المالية' : 'Health'}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-display font-black" style={{ color: healthColor }}>{healthGrade}</span>
                            <span className="text-xs text-zinc-500 font-mono">{healthScore}/100</span>
                        </div>
                        {/* Mini health bar */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full mt-3 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{ width: `${healthScore}%`, background: healthColor, boxShadow: `0 0 10px ${healthColor}60` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Quick Actions – Larger Icons + Glow */}
            <div className="grid grid-cols-4 gap-2 animate-slide-up-fade px-1" style={{ animationDelay: '300ms' }}>
                <button onClick={() => onChangeView('add')} className="glass-card hover:bg-white/8 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all active:scale-90 group ripple-effect relative overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <ArrowUpRight size={20} className="text-blue-400" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300">{user.language === 'ar' ? 'إضافة' : 'Add'}</span>
                </button>

                <button onClick={() => onChangeView('transactions')} className="glass-card hover:bg-white/8 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all active:scale-90 group ripple-effect relative overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                        <TrendingUp size={20} className="text-emerald-400" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300">{user.language === 'ar' ? 'السجل' : 'History'}</span>
                </button>

                <button onClick={() => onChangeView('reports')} className="glass-card hover:bg-white/8 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all active:scale-90 group ripple-effect relative overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                        <Zap size={20} className="text-amber-400" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300">{user.language === 'ar' ? 'تقارير' : 'Reports'}</span>
                </button>

                <button onClick={onOpenAI} className="glass-card bg-primary/8 border-primary/15 hover:bg-primary/15 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all active:scale-90 group ripple-effect relative overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center relative">
                        <Sparkles size={20} className="text-primary animate-pulse" />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-breathe"></div>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80">AI</span>
                </button>
            </div>

            {/* 5. Critical Alert */}
            {burnStats && burnStats.daysToZero < 10 && salaryData && salaryData.days > burnStats.daysToZero && (
                <div className="glass-panel bg-red-500/5 border-red-500/20 p-5 rounded-[2rem] flex items-center gap-4 mx-1 animate-slide-up-fade relative overflow-hidden"
                    style={{ animationDelay: '350ms' }}>
                    {/* Pulsing red glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent animate-breathe pointer-events-none"></div>

                    <div className="relative z-10 p-3 bg-red-500/15 rounded-2xl text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                        <Skull size={22} />
                    </div>
                    <div className="relative z-10 flex-1">
                        <h4 className="text-red-400 font-display font-bold text-sm tracking-wide">
                            {user.language === 'ar' ? '⚠️ حالة حرجة' : '⚠️ CRITICAL'}
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                            {user.language === 'ar'
                                ? <>المال ينفد خلال <span className="text-white font-bold">{burnStats.daysToZero.toFixed(0)} يوم</span> قبل الراتب</>
                                : <>Money runs out in <span className="text-white font-bold">{burnStats.daysToZero.toFixed(0)} days</span> before payday</>
                            }
                        </p>
                    </div>
                    <ChevronRight size={16} className="text-red-400/30" />
                </div>
            )}

            {/* 6. Recurring Bills */}
            <div className="animate-slide-up-fade" style={{ animationDelay: '400ms' }}>
                <div className="flex items-center justify-between px-4 mb-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.fixed_bills}</h3>
                </div>
                <RecurringBills user={user} onPayBill={onPayBill} onAddBill={onAddBill} onDeleteBill={onDeleteBill} />
            </div>

            {/* Rename Modal */}
            {renamingWallet && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-2xl animate-fade-in">
                    <div className="relative glass-premium w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl animate-scale-in">
                        {/* Top glow */}
                        <div className="absolute -top-px inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

                        <h3 className="text-lg font-display font-bold text-white mb-6 text-center">
                            {user.language === 'ar' ? 'إعادة تسمية المحفظة' : 'Rename Wallet'}
                        </h3>
                        <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-white font-bold outline-none focus:border-primary focus:shadow-[0_0_30px_var(--primary-glow)] transition-all mb-6 text-lg"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setRenamingWallet(null)} className="flex-1 py-4 rounded-2xl text-xs font-bold text-zinc-400 hover:bg-white/5 transition-colors uppercase tracking-wider">
                                {user.language === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button onClick={handleSaveRename} className="flex-1 bg-white text-black py-4 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg uppercase tracking-wider">
                                {user.language === 'ar' ? 'حفظ' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};