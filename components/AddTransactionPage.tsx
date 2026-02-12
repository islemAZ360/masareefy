import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, Calendar, Delete, Check, Wand2, Wallet, PiggyBank, X, PenLine } from 'lucide-react';
import { UserSettings, Transaction, TransactionType, WalletType } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { analyzeReceipt, parseMagicInput } from '../services/geminiService';
import { parseMagicInputStandard } from '../services/standardService';
import * as Icons from 'lucide-react';

interface Props {
    user: UserSettings;
    transactions: Transaction[];
    onSave: (transaction: Transaction, transferAmount?: number) => void;
    onBack: () => void;
}

export const AddTransactionPage: React.FC<Props> = ({ user, transactions, onSave, onBack }) => {
    const t = TRANSLATIONS[user.language];
    const [loadingMsg, setLoadingMsg] = useState<string | null>(null);

    // Form State
    const [amountStr, setAmountStr] = useState('0');
    const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [wallet, setWallet] = useState<WalletType>('spending');
    const [selectedCategory, setSelectedCategory] = useState<string>('food');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [vendor, setVendor] = useState('');
    const [note, setNote] = useState('');

    // Modals State
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);

    // Magic Input State
    const [showMagicInput, setShowMagicInput] = useState(false);
    const [magicText, setMagicText] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Logic ---

    const handleNumPress = (num: string) => {
        if (amountStr === '0' && num !== '.') setAmountStr(num);
        else {
            if (num === '.' && amountStr.includes('.')) return;
            if (amountStr.length > 9) return;
            setAmountStr(prev => prev + num);
        }
    };

    const handleDelete = () => {
        if (amountStr.length === 1) setAmountStr('0');
        else setAmountStr(prev => prev.slice(0, -1));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user.isAIMode) { alert("Enable AI Mode in Settings to use Receipt Scanning."); return; }
        if (user.isGuest || !user.apiKey) { alert(t.guest_warning); return; }
        const file = e.target.files?.[0];
        if (!file) return;

        setLoadingMsg(t.analyzing);
        try {
            const result = await analyzeReceipt(file, user.apiKey, user.language);
            setAmountStr(result.amount.toString());
            setDate(result.date);
            setVendor(result.vendor);
            setType(result.type as TransactionType);
            if (CATEGORIES.some(c => c.id === result.category)) setSelectedCategory(result.category);

            // Death Calculation logic omitted for brevity, keeping core function
        } catch (err) {
            alert("Failed to analyze receipt.");
        } finally {
            setLoadingMsg(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleMagicAnalysis = async () => {
        if (!magicText.trim()) return;

        setLoadingMsg("Processing...");
        try {
            if (user.isAIMode && user.apiKey && !user.isGuest) {
                // AI Mode
                const result = await parseMagicInput(magicText, user.apiKey, user.language);
                if (result.amount) setAmountStr(result.amount.toString());
                if (result.date) setDate(result.date);
                if (result.vendor) setVendor(result.vendor);
                if (result.type) setType(result.type);
                if (result.category && CATEGORIES.some(c => c.id === result.category)) {
                    setSelectedCategory(result.category);
                }
            } else {
                // Standard Mode
                const result = parseMagicInputStandard(magicText);
                if (result.amount) setAmountStr(result.amount.toString());
                if (result.vendor) setVendor(result.vendor);
                if (result.category && CATEGORIES.some(c => c.id === result.category)) {
                    setSelectedCategory(result.category);
                }
                // Standard parser doesn't detect type/date well yet, simple fallback
            }
            setShowMagicInput(false);
        } catch (e) { alert("Could not understand text."); }
        finally { setLoadingMsg(null); }
    };

    const handleSave = () => {
        const amountVal = parseFloat(amountStr);
        if (amountVal <= 0) return;

        let transferNeeded = 0;
        if (type === TransactionType.EXPENSE && wallet === 'spending') {
            const currentBal = user.currentBalance || 0;
            if (amountVal > currentBal) {
                const deficit = amountVal - currentBal;
                if ((user.savingsBalance || 0) >= deficit) {
                    if (confirm(user.language === 'ar' ? "رصيد غير كافٍ. هل نسحب من التجميع؟" : "Insufficient funds. Pull from savings?")) {
                        transferNeeded = deficit;
                    } else return;
                }
            }
        }

        const newTx: Transaction = {
            id: Date.now().toString(),
            amount: amountVal,
            date: date,
            category: selectedCategory,
            vendor: vendor || (type === 'income' ? 'Deposit' : 'Unknown'),
            note: note,
            type: type,
            wallet: wallet,
            isRecurring: false
        };
        onSave(newTx, transferNeeded);
    };

    // --- Components ---

    const NumpadButton = ({ children, onClick, main = false, danger = false }: any) => (
        <button
            onClick={onClick}
            className={`
            relative h-14 rounded-[1.5rem] flex items-center justify-center text-2xl font-display font-medium transition-all duration-200 active:scale-[0.88] select-none group ripple-effect overflow-hidden
            ${main
                    ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)]'
                    : danger
                        ? 'glass-card text-red-500 hover:bg-red-500/20 hover:border-red-500/30'
                        : 'glass-card text-white hover:bg-white/10 hover:border-white/20'
                }
        `}
        >
            <span className="relative z-10 transition-transform group-active:scale-110">{children}</span>
            {!main && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-[2rem] transition-opacity blur-md"></div>}
        </button>
    );

    const ToolButton = ({ icon: Icon, label, onClick, active = false }: any) => (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 h-14 rounded-2xl transition-all active:scale-90 border ripple-effect overflow-hidden relative ${active ? 'bg-white/10 border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'glass-card border-transparent text-zinc-400 hover:text-white hover:bg-white/5'}`}
        >
            <Icon size={18} className={`transition-colors ${active ? 'text-primary' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
            {active && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full shadow-[0_0_8px_var(--primary-glow)]"></div>}
        </button>
    );

    return (
        <div className="flex flex-col h-[100dvh] bg-transparent text-white overflow-hidden relative font-sans animate-fade-in" dir={user.language === 'ar' ? 'rtl' : 'ltr'}>

            {/* 1. Top Bar */}
            <div className="pt-4 px-6 pb-2 flex items-center justify-between z-10 animate-slide-down">
                <button onClick={onBack} className="p-3 glass-card rounded-full hover:bg-white/10 transition-colors group">
                    <ChevronLeft size={20} className={`text-zinc-400 group-hover:text-white ${user.language === 'ar' ? 'rotate-180' : ''}`} />
                </button>

                <div className="glass-card p-1.5 rounded-full flex relative overflow-hidden">
                    <div
                        className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 rounded-full transition-all duration-500 ease-out border border-white/5 ${type === 'income' ? (user.language === 'ar' ? 'right-[calc(50%+3px)]' : 'left-[calc(50%+3px)]') : (user.language === 'ar' ? 'right-1.5' : 'left-1.5')}`}
                    ></div>
                    <button
                        onClick={() => setType(TransactionType.EXPENSE)}
                        className={`relative z-10 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 uppercase tracking-wider ${type === 'expense' ? 'text-white text-glow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {t.expense}
                    </button>
                    <button
                        onClick={() => setType(TransactionType.INCOME)}
                        className={`relative z-10 px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 uppercase tracking-wider ${type === 'income' ? 'text-secondary text-glow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {t.income}
                    </button>
                </div>
                <div className="w-10" />
            </div>

            {loadingMsg ? (
                <div className="flex-1 flex flex-col items-center justify-center animate-pulse-glow">
                    <div className="w-32 h-32 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-8 flex items-center justify-center">
                        <Wand2 className="w-12 h-12 text-primary animate-pulse" />
                    </div>
                    <p className="font-display font-bold text-primary text-xl tracking-widest uppercase">{loadingMsg}</p>
                </div>
            ) : showMagicInput ? (
                <div className="flex-1 px-6 flex flex-col justify-center animate-scale-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                            <Wand2 className="text-primary animate-pulse" /> Magic Input
                        </h3>
                        <button onClick={() => setShowMagicInput(false)} className="p-2 glass-card rounded-full hover:bg-white/10"><X size={20} /></button>
                    </div>
                    <textarea
                        value={magicText}
                        onChange={e => setMagicText(e.target.value)}
                        className="w-full h-56 glass-card rounded-[2.5rem] p-8 text-white border border-white/10 focus:border-primary focus:shadow-[0_0_40px_rgba(168,85,247,0.2)] outline-none resize-none mb-8 text-2xl font-medium placeholder-zinc-600 leading-relaxed transition-all"
                        placeholder="Ex: Spent 150 on Groceries..."
                        autoFocus
                    />
                    <button onClick={handleMagicAnalysis} className="w-full py-6 rounded-[2rem] bg-gradient-to-r from-primary to-indigo-600 text-white font-bold text-lg tracking-widest uppercase shadow-[0_0_40px_rgba(147,51,234,0.4)] active:scale-95 transition-transform hover:shadow-[0_0_60px_rgba(147,51,234,0.6)]">
                        Analyze Text
                    </button>
                </div>
            ) : (
                <>
                    {/* 2. Display Area */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[140px] relative z-10 animate-scale-in">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative group">
                                {/* Dynamic Glow Behind Number */}
                                <div className={`absolute inset-0 blur-[80px] opacity-50 rounded-full transition-colors duration-500 ${type === TransactionType.EXPENSE ? 'bg-white/20' : 'bg-secondary/30'}`}></div>

                                <div className="flex items-baseline gap-2 relative z-10">
                                    <span className={`text-6xl font-display font-bold tracking-tighter tabular-nums drop-shadow-2xl transition-all duration-300 ${amountStr !== '0' ? 'scale-100' : 'scale-95 opacity-30'} ${type === TransactionType.EXPENSE ? 'text-white' : 'text-secondary'}`}>
                                        {amountStr}
                                    </span>
                                    <span className="text-2xl text-zinc-500 font-display font-medium">{user.currency}</span>
                                </div>
                            </div>

                            {/* Wallet Selector Pill (Glass) */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setWallet('spending')}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${wallet === 'spending' ? 'glass-card border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                                >
                                    <Wallet size={14} /> Spending
                                </button>
                                <button
                                    onClick={() => setWallet('savings')}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${wallet === 'savings' ? 'glass-card bg-secondary/10 border-secondary/50 text-secondary shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                                >
                                    <PiggyBank size={14} /> Savings
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 3. Category Strip */}
                    <div className="mb-2 pl-6 z-10 animate-slide-up-fade" style={{ animationDelay: '100ms' }}>
                        <div className="flex gap-5 overflow-x-auto no-scrollbar py-4 pr-6 items-center">
                            {CATEGORIES.map(cat => {
                                const Icon = (Icons as any)[cat.icon] || Icons.Circle;
                                const isSelected = selectedCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`flex flex-col items-center gap-2.5 min-w-[5rem] transition-all duration-300 group ${isSelected ? 'scale-110 -translate-y-2' : 'opacity-50 hover:opacity-100 hover:-translate-y-1'}`}
                                    >
                                        <div
                                            className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-all relative overflow-hidden`}
                                            style={{
                                                backgroundColor: isSelected ? cat.color : 'rgba(255,255,255,0.03)',
                                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                                boxShadow: isSelected ? `0 10px 40px -10px ${cat.color}` : 'none'
                                            }}
                                        >
                                            {isSelected && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                                            <Icon size={26} className="text-white relative z-10 drop-shadow-md" />
                                        </div>
                                        <span className={`text-[10px] font-bold truncate max-w-full tracking-wider ${isSelected ? 'text-white text-glow' : 'text-zinc-600'}`}>
                                            {user.language === 'ar' ? cat.name_ar : cat.name_en}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 4. Tools & Keypad Container */}
                    <div className="glass-panel rounded-t-[3.5rem] p-6 pb-32 border-t border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] z-20 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>

                        {/* Tools Row */}
                        <div className="grid grid-cols-4 gap-3 mb-6">
                            <ToolButton icon={Wand2} label="Magic" onClick={() => setShowMagicInput(true)} />
                            <ToolButton icon={Camera} label="Scan" onClick={() => fileInputRef.current?.click()} />
                            <ToolButton icon={PenLine} label={note ? "Edit" : "Note"} onClick={() => setShowNoteModal(true)} active={!!note} />
                            <ToolButton icon={Calendar} label={date === new Date().toISOString().split('T')[0] ? "Today" : date.slice(5)} onClick={() => setShowDateModal(true)} active={date !== new Date().toISOString().split('T')[0]} />
                        </div>

                        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

                        {/* Keypad Grid */}
                        <div className="grid grid-cols-4 gap-3">
                            <NumpadButton onClick={() => handleNumPress('1')}>1</NumpadButton>
                            <NumpadButton onClick={() => handleNumPress('2')}>2</NumpadButton>
                            <NumpadButton onClick={() => handleNumPress('3')}>3</NumpadButton>
                            <button
                                onClick={handleDelete}
                                className="glass-card rounded-[2rem] flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:border-red-500/30 active:scale-90 transition-all group"
                            >
                                <Delete size={30} className="group-hover:text-red-300" />
                            </button>

                            <NumpadButton onClick={() => handleNumPress('4')}>4</NumpadButton>
                            <NumpadButton onClick={() => handleNumPress('5')}>5</NumpadButton>
                            <NumpadButton onClick={() => handleNumPress('6')}>6</NumpadButton>

                            {/* Big Save Button */}
                            <button
                                onClick={handleSave}
                                disabled={parseFloat(amountStr) === 0}
                                className={`row-span-2 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${parseFloat(amountStr) > 0
                                    ? (type === TransactionType.EXPENSE ? 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.5)] scale-105 active:scale-95' : 'bg-secondary text-white shadow-[0_0_40px_rgba(16,185,129,0.5)] scale-105 active:scale-95')
                                    : 'glass-card text-zinc-700 cursor-not-allowed'
                                    }`}
                            >
                                {parseFloat(amountStr) > 0 && <div className="shimmer-overlay rounded-[2rem]"></div>}
                                <Check size={40} strokeWidth={4} className="relative z-10" />
                            </button>

                            <NumpadButton onClick={() => handleNumPress('7')}>7</NumpadButton>
                            <NumpadButton onClick={() => handleNumPress('8')}>8</NumpadButton>
                            <NumpadButton onClick={() => handleNumPress('9')}>9</NumpadButton>

                            <NumpadButton onClick={() => handleNumPress('.')}>.</NumpadButton>
                            <NumpadButton onClick={() => handleNumPress('0')}>0</NumpadButton>
                            <div className="flex items-center justify-center">
                                <span className="text-[10px] text-zinc-700 font-mono tracking-widest opacity-30">V4.0</span>
                            </div>
                        </div>
                    </div>

                    {/* Note Modal */}
                    {showNoteModal && (
                        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
                            <div className="absolute inset-0" onClick={() => setShowNoteModal(false)} />
                            <div className="relative w-full max-w-sm glass-card border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] p-8 animate-slide-up-fade shadow-2xl">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-8"></div>
                                <h3 className="text-2xl font-display font-bold text-white mb-6 text-center">Add Details</h3>
                                <input
                                    type="text"
                                    placeholder="Vendor Name (e.g. Starbucks)"
                                    value={vendor}
                                    onChange={e => setVendor(e.target.value)}
                                    className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 text-white mb-4 outline-none focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all placeholder-zinc-600"
                                    autoFocus
                                />
                                <textarea
                                    placeholder="Additional notes..."
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 text-white h-36 resize-none outline-none focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all placeholder-zinc-600"
                                />
                                <button onClick={() => setShowNoteModal(false)} className="w-full bg-white text-black font-bold py-5 rounded-2xl mt-6 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-all uppercase tracking-widest">Done</button>
                            </div>
                        </div>
                    )}

                    {/* Date Modal */}
                    {showDateModal && (
                        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
                            <div className="absolute inset-0" onClick={() => setShowDateModal(false)} />
                            <div className="relative w-full max-w-sm glass-card border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] p-8 animate-slide-up-fade shadow-2xl">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-8"></div>
                                <h3 className="text-2xl font-display font-bold text-white mb-6 text-center">Select Date</h3>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full bg-white/5 p-6 rounded-2xl border border-white/10 text-white outline-none focus:border-white/30 text-center text-2xl font-display font-bold transition-all"
                                />
                                <button onClick={() => setShowDateModal(false)} className="w-full bg-white text-black font-bold py-5 rounded-2xl mt-6 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-all uppercase tracking-widest">Confirm</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};