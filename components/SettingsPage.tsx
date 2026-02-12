import React, { useState, useRef } from 'react';
import { Settings, Globe, ChevronRight, Key, LogOut, Wallet, PiggyBank, X, Check, Trash2, Loader2, Calculator, Target, Camera, Pencil, CreditCard, Sparkles, HandCoins, TrendingUp, Plus, User } from 'lucide-react';
import { UserSettings, BudgetPlan, SavingsGoal, DebtRecord } from '../types';
import { TRANSLATIONS, RUSSIAN_BANKS } from '../constants';
import { validateApiKey } from '../services/geminiService';
import { deleteUserAccount, auth, reauthenticateUser } from '../services/firebase';
import { BudgetPlans } from './BudgetPlans';

interface Props {
    user: UserSettings;
    setUser: React.Dispatch<React.SetStateAction<UserSettings>>;
    onLogout: () => void;
}

export const SettingsPage: React.FC<Props> = ({ user, setUser, onLogout }) => {
    const t = TRANSLATIONS[user.language];

    // --- States ---
    const [editingKey, setEditingKey] = useState('');
    const [isValidatingKey, setIsValidatingKey] = useState(false);
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Profile
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user.name);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modals
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showGoalsModal, setShowGoalsModal] = useState(false);
    const [showDebtsModal, setShowDebtsModal] = useState(false);

    // Wallet Edit
    const [editingWallet, setEditingWallet] = useState<'spending' | 'savings' | null>(null);
    const [tempBankId, setTempBankId] = useState<string>('sber');
    const [tempName, setTempName] = useState('');
    const [tempColor, setTempColor] = useState('#21A038');

    // Goals Form
    const [goalName, setGoalName] = useState('');
    const [goalAmount, setGoalAmount] = useState('');

    // Debts Form
    const [debtPerson, setDebtPerson] = useState('');
    const [debtAmount, setDebtAmount] = useState('');
    const [debtType, setDebtType] = useState<'lent' | 'borrowed'>('lent');
    const [updateBalance, setUpdateBalance] = useState(false);

    // --- Handlers ---

    // ... (Existing handlers: API, Profile, Wallet, Delete Account) ...
    const handleUpdateApiKey = async () => {
        if (!editingKey.trim()) return;
        setIsValidatingKey(true);
        const isValid = await validateApiKey(editingKey.trim());
        if (isValid) {
            setUser(u => ({ ...u, apiKey: editingKey.trim(), isGuest: false }));
            alert(t.key_valid_saved);
            setEditingKey('');
            setShowKeyInput(false);
        } else {
            alert(t.key_invalid);
        }
        setIsValidatingKey(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setUser(prev => ({ ...prev, photoURL: reader.result as string })); };
            reader.readAsDataURL(file);
        }
    };

    const saveName = () => { if (newName.trim()) { setUser(prev => ({ ...prev, name: newName.trim() })); setIsEditingName(false); } };

    const handlePlanSelection = (plan: BudgetPlan) => {
        setUser(u => ({ ...u, selectedPlan: plan.type, dailyLimit: plan.dailyLimit }));
        setShowPlanModal(false);
    };

    const openWalletEdit = (type: 'spending' | 'savings') => {
        setEditingWallet(type);
        const currentName = type === 'spending' ? user.spendingBankName : user.savingsBankName;
        const currentColor = type === 'spending' ? user.spendingBankColor : user.savingsBankColor;
        const preset = RUSSIAN_BANKS.find(b => b.name === currentName && b.color === currentColor);
        if (preset) { setTempBankId(preset.id); setTempName(''); setTempColor(preset.color); }
        else { setTempBankId('other'); setTempName(currentName); setTempColor(currentColor); }
    };

    const saveWalletChanges = () => {
        if (!editingWallet) return;
        const bank = RUSSIAN_BANKS.find(b => b.id === tempBankId);
        const finalName = bank && tempBankId !== 'other' ? bank.name : tempName;
        const finalColor = bank && tempBankId !== 'other' ? bank.color : tempColor;
        const finalTextColor = bank && tempBankId !== 'other' ? bank.textColor : '#FFFFFF';
        if (!finalName) return alert("Please enter a bank name");
        setUser(prev => ({
            ...prev,
            [editingWallet === 'spending' ? 'spendingBankName' : 'savingsBankName']: finalName,
            [editingWallet === 'spending' ? 'spendingBankColor' : 'savingsBankColor']: finalColor,
            [editingWallet === 'spending' ? 'spendingTextColor' : 'savingsTextColor']: finalTextColor,
        }));
        setEditingWallet(null);
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure? This is permanent.")) return;
        setIsDeleting(true);
        try {
            if (!user.isGuest && auth.currentUser) {
                try { await deleteUserAccount(auth.currentUser.uid); }
                catch (error: any) {
                    if (error.code === 'auth/requires-recent-login') {
                        if (await reauthenticateUser() && auth.currentUser) await deleteUserAccount(auth.currentUser.uid);
                        else return setIsDeleting(false);
                    } else throw error;
                }
            }
            localStorage.removeItem('masareefy_user');
            localStorage.removeItem('masareefy_txs');
            window.location.reload();
        } catch (error) { alert("Failed to delete."); setIsDeleting(false); }
    };

    // --- New Features Handlers ---

    const handleAddGoal = () => {
        if (!goalName || !goalAmount) return;
        const newGoal: SavingsGoal = {
            id: Date.now().toString(),
            name: goalName,
            targetAmount: parseFloat(goalAmount),
            savedAmount: 0,
            color: '#10B981', // Default Green
            icon: 'Target'
        };
        setUser(prev => ({ ...prev, savingsGoals: [...(prev.savingsGoals || []), newGoal] }));
        setGoalName(''); setGoalAmount('');
    };

    const handleDeleteGoal = (id: string) => {
        setUser(prev => ({ ...prev, savingsGoals: (prev.savingsGoals || []).filter(g => g.id !== id) }));
    };

    const handleAddDebt = () => {
        if (!debtPerson || !debtAmount) return;
        const amountVal = parseFloat(debtAmount);
        const newDebt: DebtRecord = {
            id: Date.now().toString(),
            person: debtPerson,
            amount: amountVal,
            type: debtType,
            date: new Date().toISOString().split('T')[0],
            isPaid: false
        };

        setUser(prev => {
            let newBalance = prev.currentBalance;
            // Optional: Update wallet balance logic
            if (updateBalance) {
                if (debtType === 'lent') newBalance -= amountVal; // Money left wallet
                else newBalance += amountVal; // Money entered wallet
            }
            return {
                ...prev,
                debts: [...(prev.debts || []), newDebt],
                currentBalance: newBalance
            };
        });
        setDebtPerson(''); setDebtAmount(''); setUpdateBalance(false);
    };

    const handleSettleDebt = (id: string) => {
        setUser(prev => {
            const debt = prev.debts?.find(d => d.id === id);
            if (!debt) return prev;

            let newBalance = prev.currentBalance;
            if (!debt.isPaid) {
                // Settle logic: Reverse the effect
                if (debt.type === 'lent') newBalance += debt.amount; // Money returned
                else newBalance -= debt.amount; // Money paid back
            }

            const updatedDebts = prev.debts?.map(d => d.id === id ? { ...d, isPaid: true } : d);
            return { ...prev, debts: updatedDebts, currentBalance: newBalance };
        });
    };

    const handleDeleteDebt = (id: string) => {
        setUser(prev => ({ ...prev, debts: (prev.debts || []).filter(d => d.id !== id) }));
    };

    const SettingRow = ({ icon: Icon, title, value, onClick, color = "text-zinc-400" }: any) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all duration-300 group rounded-xl active:scale-[0.99]"
        >
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner transition-colors group-hover:border-white/10 ${color}`}>
                    <Icon size={18} />
                </div>
                <span className="font-medium text-gray-200 text-sm tracking-wide group-hover:text-white transition-colors">{title}</span>
            </div>
            <div className="flex items-center gap-3">
                {value && <span className="text-zinc-500 text-xs font-medium font-mono bg-white/5 px-2 py-1 rounded-md border border-white/5 group-hover:bg-white/10 transition-colors">{value}</span>}
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/0 group-hover:bg-white/5 transition-colors">
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
            </div>
        </button>
    );

    return (
        <div className="pb-40 space-y-8 px-1">

            {/* 1. Header */}
            <div className="flex items-center justify-between pt-4 animate-slide-down">
                <div>
                    <h2 className="text-4xl font-bold text-white tracking-tighter mb-1 font-display">{t.settings}</h2>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Preferences & Account</p>
                </div>
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                    <Settings className="w-5 h-5 text-zinc-400 animate-spin-slow" />
                </div>
            </div>

            {/* 2. Profile */}
            <div className="relative glass-panel p-6 rounded-[2.5rem] overflow-hidden group animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-sber-green/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-sber-green/20 transition-colors duration-700 pointer-events-none"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="relative cursor-pointer group/avatar" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-20 h-20 rounded-[1.5rem] p-1 bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-xl overflow-hidden relative">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-[1.2rem] object-cover" />
                            ) : (
                                <div className="w-full h-full rounded-[1.2rem] bg-zinc-900 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-gray-500">{user.name.charAt(0).toUpperCase()}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
                                <Camera size={24} className="text-white drop-shadow-lg" />
                            </div>
                        </div>
                        {user.isGuest && <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-[#121212] z-20 shadow-lg">GUEST</div>}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>

                    <div className="flex-1 min-w-0">
                        {isEditingName ? (
                            <div className="flex items-center gap-2 animate-in fade-in">
                                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white font-bold text-lg w-full outline-none focus:border-sber-green transition-all" autoFocus />
                                <button onClick={saveName} className="p-2.5 bg-sber-green rounded-xl text-white shadow-lg hover:bg-green-600"><Check size={18} /></button>
                                <button onClick={() => setIsEditingName(false)} className="p-2.5 bg-white/10 rounded-xl text-zinc-400 hover:text-white"><X size={18} /></button>
                            </div>
                        ) : (
                            <div className="group/name">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-2xl font-bold font-display text-white truncate">{user.name || 'Guest User'}</h3>
                                    <button onClick={() => setIsEditingName(true)} className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover/name:opacity-100"><Pencil size={14} /></button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-zinc-500">ID: {user.apiKey ? '••••' + user.apiKey.slice(-4) : 'N/A'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. General Settings */}
            <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Application
                </h3>
                <div className="glass-panel rounded-[1.8rem] p-1 overflow-hidden shadow-2xl">
                    <SettingRow icon={Globe} title="Language" value={user.language.toUpperCase()} color="text-indigo-400" onClick={() => setUser(u => ({ ...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en' }))} />
                    <div className="h-[1px] bg-white/5 mx-4" />
                    <SettingRow icon={Target} title="Currency" value={user.currency} color="text-emerald-400" onClick={() => { const c = ['USD', 'SAR', 'AED', 'RUB']; setUser(u => ({ ...u, currency: c[(c.indexOf(u.currency) + 1) % c.length] as any })); }} />
                </div>
            </div>

            {/* 4. Advanced Tools (New) */}
            <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.25s' }}>
                <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Advanced Tools
                </h3>
                <div className="glass-panel rounded-[1.8rem] p-1 overflow-hidden shadow-2xl">
                    <SettingRow
                        icon={Target}
                        title="Savings Goals"
                        value={`${user.savingsGoals?.length || 0} Goals`}
                        color="text-pink-400"
                        onClick={() => setShowGoalsModal(true)}
                    />
                    <div className="h-[1px] bg-white/5 mx-4" />
                    <SettingRow
                        icon={HandCoins}
                        title="Debt Tracker"
                        value={`${user.debts?.filter(d => !d.isPaid).length || 0} Active`}
                        color="text-orange-400"
                        onClick={() => setShowDebtsModal(true)}
                    />
                </div>
            </div>

            {/* 5. Finance Control */}
            <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Finance Control
                </h3>
                <div className="glass-panel rounded-[1.8rem] p-1 overflow-hidden shadow-2xl">
                    <SettingRow icon={Calculator} title="Budget Plan" value={user.selectedPlan?.toUpperCase() || 'NOT SET'} color="text-blue-400" onClick={() => setShowPlanModal(true)} />
                    <div className="h-[1px] bg-white/5 mx-4" />
                    <SettingRow icon={Wallet} title="Spending Wallet" value={user.spendingBankName} color="text-white" onClick={() => openWalletEdit('spending')} />
                    <div className="h-[1px] bg-white/5 mx-4" />
                    <SettingRow icon={PiggyBank} title="Savings Pot" value={user.savingsBankName} color="text-sber-green" onClick={() => openWalletEdit('savings')} />
                </div>
            </div>

            {/* 6. AI Features */}
            <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Intelligence
                </h3>
                <div className="glass-panel rounded-[1.8rem] p-1 overflow-hidden shadow-2xl">
                    <div className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner ${user.isAIMode ? 'text-purple-400' : 'text-zinc-500'}`}>
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <span className="font-medium text-gray-200 text-sm tracking-wide block">AI Features</span>
                                <span className="text-[10px] text-zinc-500 font-mono">{user.isAIMode ? 'Active' : 'Disabled'}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setUser(u => ({ ...u, isAIMode: !u.isAIMode }))}
                            className={`w-12 h-7 rounded-full transition-colors relative ${user.isAIMode ? 'bg-purple-500/20 border-purple-500/50' : 'bg-black/40 border-white/10'} border`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${user.isAIMode ? 'right-1 bg-purple-400 shadow-[0_0_10px_#a855f7]' : 'left-1 bg-zinc-600'}`}></div>
                        </button>
                    </div>

                    {user.isAIMode && (
                        <>
                            <div className="h-[1px] bg-white/5 mx-4" />
                            <SettingRow icon={Key} title="Gemini API Key" value={user.apiKey ? 'Linked' : 'Missing'} color="text-purple-400" onClick={() => setShowKeyInput(!showKeyInput)} />
                            {showKeyInput && (
                                <div className="px-4 pb-4 pt-2 animate-in slide-in-from-top-2">
                                    <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex gap-2">
                                        <input type="password" placeholder="API Key" value={editingKey} onChange={e => setEditingKey(e.target.value)} className="flex-1 bg-transparent text-white text-sm outline-none" />
                                        <button onClick={handleUpdateApiKey} className="text-sber-green font-bold text-xs">{isValidatingKey ? <Loader2 className="animate-spin" /> : 'SAVE'}</button>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-2 px-1">API Key is required for Magic Input, Advisor, and Titan Engine.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <button onClick={onLogout} className="w-full glass-card p-4 rounded-[1.5rem] flex items-center justify-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mt-6">
                    <LogOut size={16} /> {t.sign_out}
                </button>
            </div>

            {/* --- MODALS --- */}

            {/* Goals Modal */}
            {showGoalsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                    <div className="relative glass-panel w-full max-w-md rounded-[2.5rem] p-6 animate-scale-in shadow-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2"><Target className="text-pink-400" /> Savings Goals</h3>
                            <button onClick={() => setShowGoalsModal(false)} className="p-2 glass rounded-full"><X size={18} /></button>
                        </div>

                        {/* List */}
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-6 custom-scrollbar pr-1">
                            {(user.savingsGoals || []).length === 0 ? (
                                <div className="text-center py-8 text-zinc-500 text-xs">No active goals. Start dreaming!</div>
                            ) : (
                                (user.savingsGoals || []).map(goal => (
                                    <div key={goal.id} className="glass-card p-4 rounded-2xl relative overflow-hidden group">
                                        <div className="flex justify-between items-center relative z-10">
                                            <span className="font-bold text-white">{goal.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-sm text-zinc-400">{goal.targetAmount.toLocaleString()}</span>
                                                <button onClick={() => handleDeleteGoal(goal.id)} className="text-zinc-600 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-black/40 rounded-full mt-3 overflow-hidden">
                                            <div className="h-full bg-pink-500 shadow-[0_0_10px_#EC4899]" style={{ width: '0%' }}></div> {/* Static for now, connect to savings later */}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Form */}
                        <div className="bg-black/30 p-4 rounded-3xl border border-white/5 space-y-3">
                            <input type="text" placeholder="Goal Name (e.g. New Car)" value={goalName} onChange={e => setGoalName(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl text-sm text-white outline-none focus:border-pink-500 border border-transparent transition-all" />
                            <div className="flex gap-2">
                                <input type="number" placeholder="Target Amount" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl text-sm text-white outline-none focus:border-pink-500 border border-transparent transition-all" />
                                <button onClick={handleAddGoal} className="bg-pink-500 p-3 rounded-xl text-white shadow-[0_0_15px_rgba(236,72,153,0.4)] active:scale-95 transition-transform"><Plus /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Debts Modal */}
            {showDebtsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                    <div className="relative glass-panel w-full max-w-md rounded-[2.5rem] p-6 animate-scale-in shadow-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2"><HandCoins className="text-orange-400" /> Debt Tracker</h3>
                            <button onClick={() => setShowDebtsModal(false)} className="p-2 glass rounded-full"><X size={18} /></button>
                        </div>

                        {/* List */}
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-6 custom-scrollbar pr-1">
                            {(user.debts || []).length === 0 ? (
                                <div className="text-center py-8 text-zinc-500 text-xs">Clean sheet! No debts recorded.</div>
                            ) : (
                                (user.debts || []).map(debt => (
                                    <div key={debt.id} className={`glass-card p-4 rounded-2xl border-l-4 ${debt.isPaid ? 'border-zinc-700 opacity-50' : debt.type === 'lent' ? 'border-green-500' : 'border-red-500'} flex justify-between items-center`}>
                                        <div>
                                            <p className="font-bold text-white text-sm">{debt.person}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider ${debt.type === 'lent' ? 'text-green-400' : 'text-red-400'}`}>
                                                {debt.type === 'lent' ? 'Owes Me' : 'I Owe'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-display font-bold text-white">{debt.amount.toLocaleString()}</span>
                                            {!debt.isPaid ? (
                                                <button onClick={() => handleSettleDebt(debt.id)} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg text-white" title="Mark Paid & Settle"><Check size={14} /></button>
                                            ) : (
                                                <button onClick={() => handleDeleteDebt(debt.id)} className="text-zinc-500 hover:text-red-500"><Trash2 size={14} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Form */}
                        <div className="bg-black/30 p-4 rounded-3xl border border-white/5 space-y-3">
                            <div className="flex gap-2">
                                <button onClick={() => setDebtType('lent')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${debtType === 'lent' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 text-zinc-500'}`}>I LENT</button>
                                <button onClick={() => setDebtType('borrowed')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${debtType === 'borrowed' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-white/5 text-zinc-500'}`}>I BORROWED</button>
                            </div>
                            <input type="text" placeholder="Person Name" value={debtPerson} onChange={e => setDebtPerson(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl text-sm text-white outline-none focus:border-orange-500 border border-transparent transition-all" />
                            <div className="flex gap-2">
                                <input type="number" placeholder="Amount" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl text-sm text-white outline-none focus:border-orange-500 border border-transparent transition-all" />
                                <button onClick={handleAddDebt} className="bg-orange-500 p-3 rounded-xl text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95 transition-transform"><Plus /></button>
                            </div>
                            <div className="flex items-center gap-2 pl-1 cursor-pointer" onClick={() => setUpdateBalance(!updateBalance)}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${updateBalance ? 'bg-orange-500 border-orange-500' : 'border-zinc-600'}`}>
                                    {updateBalance && <Check size={10} className="text-white" />}
                                </div>
                                <span className="text-[10px] text-zinc-400">Update wallet balance automatically?</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Selection Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                    <div className="relative w-full max-w-lg glass-panel border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-slide-up-fade max-h-[90vh] overflow-y-auto">
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8 sm:hidden" />
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-display font-bold text-white">Select Strategy</h3>
                                <p className="text-zinc-500 text-xs mt-1">Choose your spending behavior.</p>
                            </div>
                            <button onClick={() => setShowPlanModal(false)} className="p-2 glass rounded-full"><X size={18} /></button>
                        </div>
                        <BudgetPlans user={user} onSelectPlan={handlePlanSelection} />
                    </div>
                </div>
            )}

            {/* Wallet Edit Modal */}
            {editingWallet && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                    <div className="relative w-full max-w-sm glass-panel border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-slide-up-fade shadow-2xl">
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8 sm:hidden" />
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-display font-bold text-white">Configure {editingWallet === 'spending' ? 'Main Wallet' : 'Savings'}</h3>
                            <button onClick={() => setEditingWallet(null)} className="p-2 glass rounded-full"><X size={18} /></button>
                        </div>
                        {/* Bank Grid & Inputs... (Same as before but wrapped in glass styles) */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-3 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                                {RUSSIAN_BANKS.filter(b => b.id !== 'other').map(bank => (
                                    <button key={bank.id} onClick={() => { setTempBankId(bank.id); setTempName(bank.name); setTempColor(bank.color); }} className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border duration-300 ${tempBankId === bank.id ? 'bg-white/10 border-sber-green shadow-[0_0_15px_rgba(33,160,56,0.3)] scale-105' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}>
                                        {bank.logo ? <img src={bank.logo} alt={bank.name} className="w-10 h-10 rounded-full object-cover shadow-lg bg-white p-0.5" /> : <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg" style={{ backgroundColor: bank.color, color: bank.textColor }}>{bank.name.substring(0, 2).toUpperCase()}</div>}
                                        <span className="text-[9px] text-zinc-400 truncate w-full text-center font-medium">{bank.name}</span>
                                    </button>
                                ))}
                                <button onClick={() => setTempBankId('other')} className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border duration-300 ${tempBankId === 'other' ? 'bg-white/10 border-sber-green shadow-[0_0_15px_rgba(33,160,56,0.3)] scale-105' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] bg-zinc-800 text-white border border-white/10">...</div>
                                    <span className="text-[9px] text-zinc-400 font-medium">Custom</span>
                                </button>
                            </div>
                            {tempBankId === 'other' && (
                                <div className="bg-black/40 p-5 rounded-3xl border border-white/10 space-y-4 animate-scale-in">
                                    <input type="text" value={tempName} onChange={e => setTempName(e.target.value)} placeholder="Bank Name" className="w-full bg-black p-4 rounded-2xl border border-white/10 text-white text-sm focus:border-sber-green outline-none transition-all" />
                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {['#21A038', '#EF3124', '#002882', '#FFDD2D', '#000000', '#BF5AF2', '#FF9500'].map(c => (
                                            <button key={c} onClick={() => setTempColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${tempColor === c ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button onClick={saveWalletChanges} className="w-full bg-white text-black font-bold py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-gray-200 transition-all active:scale-95 text-sm uppercase tracking-wider"><Check size={18} /> Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};