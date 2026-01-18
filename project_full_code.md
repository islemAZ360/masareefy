# Project Code Dump
Generated: 18/1/2026, 23:29:25

## 🌳 Project Structure
```text
├── components
  ├── AddTransactionPage.tsx
  ├── AIAdvisor.tsx
  ├── BudgetPlans.tsx
  ├── Dashboard.tsx
  ├── Navigation.tsx
  ├── Onboarding.tsx
  ├── RecurringBills.tsx
  ├── Reports.tsx
  ├── SettingsPage.tsx
  ├── TitanSimulator.tsx
  ├── TransactionItem.tsx
  └── TransactionsPage.tsx
├── public
  ├── banks
    ├── alpha.png
    ├── gazprom.png
    ├── ozon.png
    ├── psb.png
    ├── sankt.png
    ├── sber.png
    ├── Tinkif.png
    ├── vtb.png
    └── wildberries.png
  ├── app.png
  └── manifest.json
├── services
  ├── firebase.ts
  ├── geminiService.ts
  └── titanService.ts
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

### File: `components\AddTransactionPage.tsx`
```tsx
import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, Calendar, Delete, Check, Wand2, Wallet, PiggyBank, X, PenLine } from 'lucide-react';
import { UserSettings, Transaction, TransactionType, WalletType } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { analyzeReceipt, parseMagicInput } from '../services/geminiService';
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
      if (user.isGuest || !user.apiKey) { alert(t.guest_warning); return; }

      setLoadingMsg("Processing text...");
      try {
          const result = await parseMagicInput(magicText, user.apiKey, user.language);
          if (result.amount) setAmountStr(result.amount.toString());
          if (result.date) setDate(result.date);
          if (result.vendor) setVendor(result.vendor);
          if (result.type) setType(result.type);
          if (result.category && CATEGORIES.some(c => c.id === result.category)) {
              setSelectedCategory(result.category);
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
            relative h-[4.5rem] rounded-[2rem] flex items-center justify-center text-3xl font-display font-medium transition-all duration-200 active:scale-90 select-none group
            ${main 
                ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)]' 
                : danger 
                    ? 'glass-card text-red-500 hover:bg-red-500/20 hover:border-red-500/30' 
                    : 'glass-card text-white hover:bg-white/10 hover:border-white/20'
            }
        `}
      >
          <span className="relative z-10">{children}</span>
          {!main && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-[2rem] transition-opacity blur-md"></div>}
      </button>
  );

  const ToolButton = ({ icon: Icon, label, onClick, active = false }: any) => (
      <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1.5 h-16 rounded-2xl transition-all active:scale-95 border ${active ? 'bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'glass-card border-transparent text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
          <Icon size={20} />
          <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
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
            <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] relative z-10 animate-scale-in">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative group">
                        {/* Dynamic Glow Behind Number */}
                        <div className={`absolute inset-0 blur-[80px] opacity-40 rounded-full transition-colors duration-500 ${type === 'expense' ? 'bg-white/20' : 'bg-secondary/30'}`}></div>
                        
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className={`text-8xl font-display font-bold tracking-tighter tabular-nums drop-shadow-2xl transition-colors duration-300 ${type === 'expense' ? 'text-white' : 'text-secondary'}`}>
                                {amountStr}
                            </span>
                            <span className="text-3xl text-zinc-500 font-display font-medium">{user.currency}</span>
                        </div>
                    </div>

                    {/* Wallet Selector Pill */}
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setWallet('spending')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${wallet === 'spending' ? 'bg-zinc-800 border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                        >
                            <Wallet size={14} /> Spending
                        </button>
                        <button 
                            onClick={() => setWallet('savings')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${wallet === 'savings' ? 'bg-secondary/10 border-secondary/50 text-secondary shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                        >
                            <PiggyBank size={14} /> Savings
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Category Strip */}
            <div className="mb-6 pl-6 z-10 animate-slide-up-fade" style={{ animationDelay: '100ms' }}>
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
            <div className="glass-card rounded-t-[3.5rem] p-6 pb-12 border-t border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] z-20 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
                
                {/* Tools Row */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <ToolButton icon={Wand2} label="Magic" onClick={() => setShowMagicInput(true)} />
                    <ToolButton icon={Camera} label="Scan" onClick={() => fileInputRef.current?.click()} />
                    <ToolButton icon={PenLine} label={note ? "Edit" : "Note"} onClick={() => setShowNoteModal(true)} active={!!note} />
                    <ToolButton icon={Calendar} label={date === new Date().toISOString().split('T')[0] ? "Today" : date.slice(5)} onClick={() => setShowDateModal(true)} active={date !== new Date().toISOString().split('T')[0]} />
                </div>

                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

                {/* Keypad Grid */}
                <div className="grid grid-cols-4 gap-4">
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
                        className={`row-span-2 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                            parseFloat(amountStr) > 0 
                            ? (type === 'expense' ? 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.5)] scale-105 active:scale-95' : 'bg-secondary text-white shadow-[0_0_40px_rgba(16,185,129,0.5)] scale-105 active:scale-95') 
                            : 'glass-card text-zinc-700 cursor-not-allowed'
                        }`}
                    >
                        <Check size={40} strokeWidth={4} />
                    </button>

                    <NumpadButton onClick={() => handleNumPress('7')}>7</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('8')}>8</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('9')}>9</NumpadButton>

                    <NumpadButton onClick={() => handleNumPress('.')}>.</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('0')}>0</NumpadButton>
                    <div className="flex items-center justify-center">
                        <span className="text-[10px] text-zinc-700 font-mono tracking-widest opacity-50">V3.0</span>
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
```
---

### File: `components\AIAdvisor.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { UserSettings, Transaction } from '../types';
import { getDeepFinancialAnalysis } from '../services/geminiService';
import { X, Download, Sparkles, Bot, RefreshCw, ChevronRight, ShieldCheck, Target, BrainCircuit, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TRANSLATIONS } from '../constants';

interface Props {
  user: UserSettings;
  transactions: Transaction[];
  onClose: () => void;
}

const LoadingStep = ({ text, delay }: { text: string, delay: number }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    if (!visible) return null;
    return (
        <div className="flex items-center gap-3 animate-slide-up-fade">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_#a855f7]"></div>
            <span className="text-xs text-zinc-400 font-mono tracking-widest uppercase">{text}</span>
        </div>
    );
};

export const AIAdvisor: React.FC<Props> = ({ user, transactions, onClose }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = TRANSLATIONS[user.language];

  const generateReport = async () => {
    if (user.isGuest || !user.apiKey) return;

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
      setReport("Signal lost. Neural link failed. Check API Key.");
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
    link.download = `Masareefy_AI_Report_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!report && !user.isGuest) generateReport();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
      {/* Backdrop with Blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500 animate-fade-in" 
        onClick={onClose}
      />

      {/* Main Holographic Card */}
      <div className="relative w-full max-w-2xl glass-panel rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up-fade border border-white/10">
        
        {/* Animated Header Background */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-20">
          <div className="flex items-center gap-4">
             <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-lg opacity-40 animate-pulse"></div>
                <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shadow-lg relative z-10 backdrop-blur-md">
                    <Bot className="text-purple-400 w-6 h-6" />
                </div>
             </div>
             <div>
               <h2 className="text-xl font-display font-bold text-white flex items-center gap-2 tracking-wide text-glow">
                 Gemini Advisor
                 <span className="text-[9px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold tracking-widest uppercase">PRO</span>
               </h2>
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Powered by Google AI</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full glass hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 scrollbar-hide min-h-[400px] relative z-10">
            {user.isGuest || !user.apiKey ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/5 relative">
                        <ShieldCheck className="w-10 h-10 text-zinc-500" />
                        <div className="absolute inset-0 border border-white/5 rounded-full animate-ping opacity-20"></div>
                    </div>
                    <div className="max-w-xs mx-auto">
                        <h3 className="text-xl font-display font-bold text-white mb-2">Access Restricted</h3>
                        <p className="text-zinc-500 text-sm">
                            {user.language === 'ar' 
                            ? 'المستشار الذكي يتطلب مفتاح API. يرجى إضافته من الإعدادات.' 
                            : 'AI Advisor requires a valid Gemini API Key. Please add one in Settings.'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="glass-card hover:bg-white/10 px-8 py-3 rounded-xl font-bold text-sm transition-colors text-white"
                    >
                        Close
                    </button>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-10">
                    {/* Neural Network Loader */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                        <div className="absolute inset-2 border-2 border-t-purple-500 border-r-transparent border-b-purple-500/50 border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Cpu className="text-purple-400 w-10 h-10 animate-pulse" />
                        </div>
                        {/* Orbiting particles */}
                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa] animate-ping"></div>
                    </div>
                    
                    <div className="space-y-3 text-left w-64">
                        <LoadingStep text="Initializing Neural Core..." delay={0} />
                        <LoadingStep text="Scanning Transaction Matrix..." delay={1200} />
                        <LoadingStep text="Detecting Anomalies..." delay={2800} />
                        <LoadingStep text="Synthesizing Strategy..." delay={4500} />
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-slide-up-fade">
                    <div className={`prose prose-invert max-w-none ${user.language === 'ar' ? 'text-right' : 'text-left'}`} dir={user.language === 'ar' ? 'rtl' : 'ltr'}>
                        <ReactMarkdown
                            components={{
                                h1: ({node, ...props}) => (
                                    <div className="mb-8 border-b border-white/10 pb-4">
                                        <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-2" {...props} />
                                    </div>
                                ),
                                h2: ({node, ...props}) => (
                                    <div className="mt-10 mb-4 flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <Target className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <h2 className="text-lg font-display font-bold text-white m-0 tracking-wide" {...props} />
                                    </div>
                                ),
                                ul: ({node, ...props}) => <ul className="grid grid-cols-1 gap-3 my-4 list-none p-0" {...props} />,
                                li: ({node, ...props}) => (
                                    <li className="glass-card p-4 rounded-xl border border-white/5 flex items-start gap-3 hover:bg-white/5 transition-colors group">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sber-green shadow-[0_0_8px_#22c55e] shrink-0 group-hover:scale-125 transition-transform"></div>
                                        <span className="text-sm text-zinc-300 leading-relaxed font-medium" {...props} />
                                    </li>
                                ),
                                strong: ({node, ...props}) => <strong className="text-purple-300 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded text-xs uppercase tracking-wider" {...props} />,
                                p: ({node, ...props}) => <p className="text-zinc-400 text-sm leading-relaxed mb-4" {...props} />,
                            }}
                        >
                            {report || ''}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        {!loading && report && (
            <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md flex gap-3 relative z-20">
                <button 
                    onClick={generateReport}
                    className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center text-zinc-400 hover:text-white transition-colors hover:bg-white/5"
                >
                    <RefreshCw size={20} />
                </button>
                <button 
                    onClick={handleDownload}
                    className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-wider text-xs"
                >
                    <Download size={18} />
                    {t.download_report}
                </button>
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
import { Shield, Scale, Coffee, CheckCircle, CalendarDays, Calculator, AlertTriangle, PiggyBank, Sparkles } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface Props {
  user: UserSettings;
  onSelectPlan: (plan: BudgetPlan) => void;
}

export const BudgetPlans: React.FC<Props> = ({ user, onSelectPlan }) => {
  const t = TRANSLATIONS[user.language];

  // --- 1. THE BRAIN: Advanced Financial Engine ---

  // A. Time Analysis
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextSalary = user.nextSalaryDate ? new Date(user.nextSalaryDate) : null;
  if (!nextSalary || nextSalary < today) {
      nextSalary = new Date(today);
      nextSalary.setDate(today.getDate() + (user.salaryInterval || 30));
  }
  nextSalary.setHours(0, 0, 0, 0);

  const diffTime = nextSalary.getTime() - today.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // B. Weighted Days Logic
  let weekendsCount = 0;
  let weekdaysCount = 0;
  for (let i = 0; i < daysRemaining; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = d.getDay();
      const isWeekend = user.language === 'ar' ? (day === 5 || day === 6) : (day === 6 || day === 0);
      if (isWeekend) weekendsCount++;
      else weekdaysCount++;
  }

  // C. Liability Analysis
  const currentMonthPrefix = today.toISOString().slice(0, 7);
  const bills = user.recurringBills || [];
  
  const unpaidBillsTotal = bills.reduce((sum, bill) => {
      const isPaidThisMonth = bill.lastPaidDate && bill.lastPaidDate.startsWith(currentMonthPrefix);
      return isPaidThisMonth ? sum : sum + bill.amount;
  }, 0);

  // D. Net Disposable Income
  const grossBalance = user.currentBalance > 0 ? user.currentBalance : 0;
  const netDisposable = Math.max(0, grossBalance - unpaidBillsTotal);
  
  const isCritical = grossBalance < unpaidBillsTotal;

  // --- 2. Plan Generation Strategy ---

  const createSmartPlan = (type: PlanType): BudgetPlan => {
      let safetyBufferPct = 0;
      let weekendMultiplier = 1.0;
      let savingsAggression = 0;

      if (type === 'austerity') {
          safetyBufferPct = 0.20;
          weekendMultiplier = 1.0;
          savingsAggression = 0.30;
      } else if (type === 'balanced') {
          safetyBufferPct = 0.10;
          weekendMultiplier = 1.3;
          savingsAggression = 0.15;
      } else { // Comfort
          safetyBufferPct = 0.05;
          weekendMultiplier = 1.6;
          savingsAggression = 0.0;
      }

      const afterBuffer = netDisposable * (1 - safetyBufferPct);
      const spendablePool = afterBuffer * (1 - savingsAggression);
      const projectedSavings = (netDisposable - spendablePool) + (grossBalance - netDisposable - unpaidBillsTotal);
      
      const weightedDivisor = weekdaysCount + (weekendsCount * weekendMultiplier);
      const baseDaily = Math.floor(spendablePool / Math.max(1, weightedDivisor));
      
      const todayIsWeekend = user.language === 'ar' 
        ? (today.getDay() === 5 || today.getDay() === 6)
        : (today.getDay() === 6 || today.getDay() === 0);

      const todayLimit = todayIsWeekend ? Math.floor(baseDaily * weekendMultiplier) : baseDaily;

      let desc_en = '', desc_ar = '', desc_ru = '';
      if (type === 'austerity') {
          desc_en = `Survival mode. Reserves ${unpaidBillsTotal} for bills + 20% buffer.`;
          desc_ar = `وضع النجاة. يحجز ${unpaidBillsTotal} للفواتير + 20% طوارئ.`;
          desc_ru = `Режим выживания. Резерв ${unpaidBillsTotal} на счета.`;
      } else if (type === 'balanced') {
          desc_en = `Smart mix. ${weekendMultiplier}x spending on weekends.`;
          desc_ar = `مزيج ذكي. صرف ${weekendMultiplier}x في عطلة نهاية الأسبوع.`;
          desc_ru = `Умный микс. ${weekendMultiplier}x на выходных.`;
      } else {
          desc_en = `Max lifestyle. ${weekendMultiplier}x weekend boost. Minimal buffer.`;
          desc_ar = `رفاهية قصوى. ${weekendMultiplier}x زيادة للعطلة. هامش بسيط.`;
          desc_ru = `Макс. стиль. ${weekendMultiplier}x на выходных.`;
      }

      return {
          type,
          dailyLimit: todayLimit > 0 ? todayLimit : 0,
          monthlySavingsProjected: Math.floor(projectedSavings),
          description_en: desc_en,
          description_ar: desc_ar,
          description_ru: desc_ru
      };
  };

  const plans: BudgetPlan[] = isCritical 
    ? [createSmartPlan('austerity')]
    : [createSmartPlan('austerity'), createSmartPlan('balanced'), createSmartPlan('comfort')];

  // UI Helpers
  const PLANS_CONFIG = {
    austerity: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', shadow: 'shadow-yellow-500/20' },
    balanced: { color: 'text-sber-green', bg: 'bg-sber-green/10', border: 'border-sber-green/30', shadow: 'shadow-sber-green/20' },
    comfort: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', shadow: 'shadow-blue-500/20' }
  };

  const getIcon = (type: PlanType) => {
    switch(type) {
      case 'austerity': return <Shield className={`w-6 h-6 ${PLANS_CONFIG.austerity.color} drop-shadow-md`} />;
      case 'balanced': return <Scale className={`w-6 h-6 ${PLANS_CONFIG.balanced.color} drop-shadow-md`} />;
      case 'comfort': return <Coffee className={`w-6 h-6 ${PLANS_CONFIG.comfort.color} drop-shadow-md`} />;
    }
  };

  const getTitle = (type: PlanType) => {
      const titles = {
          ar: { austerity: 'خطة التقشف', balanced: 'المتوازنة (الذكية)', comfort: 'خطة الرفاهية' },
          en: { austerity: 'Survival Mode', balanced: 'Smart Balanced', comfort: 'Comfort Mode' },
          ru: { austerity: 'Выживание', balanced: 'Баланс', comfort: 'Комфорт' }
      };
      return (titles as any)[user.language][type] || type;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. The Financial Reality Check (Header) */}
      <div className="glass-card p-6 rounded-[2.5rem] relative overflow-hidden animate-slide-up-fade">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none animate-pulse-glow"></div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
               {/* Time Context */}
               <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2 text-zinc-400">
                       <CalendarDays size={14} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">{user.language === 'ar' ? 'حتى الراتب' : 'Until Payday'}</span>
                   </div>
                   <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-display font-bold text-white tracking-tighter tabular-nums text-glow">{daysRemaining}</span>
                        <span className="text-xs text-zinc-500 font-bold uppercase">{user.language === 'ar' ? 'يوم' : 'days'}</span>
                   </div>
                   <div className="flex gap-2 text-[9px] mt-1">
                       <span className="bg-white/5 px-2 py-1 rounded-md text-zinc-400 border border-white/5">{weekdaysCount} Work</span>
                       <span className="bg-white/5 px-2 py-1 rounded-md text-zinc-400 border border-white/5">{weekendsCount} Off</span>
                   </div>
               </div>

               {/* Money Context */}
               <div className="flex flex-col gap-1 text-right">
                   <div className="flex items-center gap-2 justify-end text-zinc-400">
                       <span className="text-[10px] font-bold uppercase tracking-widest">{user.language === 'ar' ? 'السيولة الحقيقية' : 'Disposable'}</span>
                       <Calculator size={14} />
                   </div>
                   <div className={`flex items-baseline justify-end gap-1 ${isCritical ? 'text-red-500' : 'text-sber-green'}`}>
                        <span className="text-3xl font-display font-bold tabular-nums text-glow">{netDisposable.toLocaleString()}</span>
                        <span className="text-xs font-bold">{user.currency}</span>
                   </div>
                   {unpaidBillsTotal > 0 && (
                       <p className="text-[10px] text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-full ml-auto w-fit">
                           -{unpaidBillsTotal} {user.language === 'ar' ? 'محجوزة' : 'reserved'}
                       </p>
                   )}
               </div>
          </div>

          {/* Progress Bar: Bills vs Disposable */}
          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden flex border border-white/5">
              <div 
                className="h-full bg-red-500 shadow-[0_0_10px_red]" 
                style={{ width: `${Math.min((unpaidBillsTotal / grossBalance) * 100, 100)}%` }} 
              />
              <div 
                className="h-full bg-sber-green shadow-[0_0_10px_#22c55e]" 
                style={{ width: `${Math.min((netDisposable / grossBalance) * 100, 100)}%` }} 
              />
          </div>
      </div>

      {/* 2. Critical Warning */}
      {isCritical && (
          <div className="glass-card bg-red-500/10 border-red-500/20 p-4 rounded-2xl flex items-start gap-4 animate-pulse-glow">
              <div className="p-2 bg-red-500/20 rounded-full text-red-500 shadow-lg"><AlertTriangle size={20} /></div>
              <div>
                  <h4 className="text-red-400 font-bold text-xs uppercase tracking-wider">{user.language === 'ar' ? 'عجز مالي حرج!' : 'Critical Deficit!'}</h4>
                  <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed">
                      {user.language === 'ar' 
                      ? `رصيدك الحالي (${grossBalance}) أقل من الفواتير المستحقة (${unpaidBillsTotal}). لا يمكنك اختيار خطة رفاهية.` 
                      : `Your balance (${grossBalance}) is less than due bills (${unpaidBillsTotal}). Comfort plans disabled.`}
                  </p>
              </div>
          </div>
      )}

      {/* 3. The Plans */}
      <div className="grid grid-cols-1 gap-3 animate-scale-in" style={{ animationDelay: '100ms' }}>
        {plans.map((plan, idx) => {
          const isSelected = user.selectedPlan === plan.type;
          const config = PLANS_CONFIG[plan.type];
          
          return (
            <button
              key={plan.type}
              onClick={() => onSelectPlan(plan)}
              className={`
                relative p-5 rounded-[2rem] border transition-all duration-300 flex flex-col gap-3 text-left group overflow-hidden
                ${isSelected 
                  ? `glass-card ${config.bg} ${config.border} ring-1 ring-inset ${config.color.replace('text', 'ring')} transform scale-[1.02] shadow-2xl` 
                  : 'glass-card hover:bg-white/5 hover:border-white/10 active:scale-[0.98]'
                }
              `}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {isSelected && (
                  <div className="absolute top-4 right-4 animate-scale-in text-white">
                      <div className={`absolute inset-0 blur-lg opacity-50 ${config.color.replace('text-', 'bg-')}`}></div>
                      <CheckCircle className={`w-6 h-6 fill-current relative z-10 ${config.color}`} />
                  </div>
              )}
              
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3.5 rounded-2xl glass-card border border-white/5 ${isSelected ? 'shadow-inner' : ''}`}>
                    {getIcon(plan.type)}
                </div>
                <div>
                    <h4 className={`font-display font-bold text-lg ${isSelected ? 'text-white' : 'text-zinc-200'} tracking-wide`}>{getTitle(plan.type)}</h4>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                         {user.language === 'ar' ? 'الحد اليومي' : 'Daily Limit'}
                         {plan.type !== 'austerity' && (
                             <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] text-white border border-white/5">
                                 {plan.type === 'balanced' ? '+30%' : '+60%'} Weekend
                             </span>
                         )}
                    </span>
                </div>
              </div>
              
              <div className="relative z-10 pl-1 mt-1">
                 <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-display font-bold tabular-nums tracking-tighter ${isSelected ? 'text-white text-glow' : 'text-zinc-400'}`}>
                        {plan.dailyLimit}
                    </span>
                    <span className="text-sm font-bold text-zinc-600">{user.currency}</span>
                 </div>
                 
                 <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-[90%] font-medium">
                    {user.language === 'ar' ? plan.description_ar : user.language === 'ru' ? plan.description_ru : plan.description_en}
                 </p>
              </div>

              {/* Advanced Stats Badge */}
              <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                   {plan.monthlySavingsProjected > 0 && (
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
                            <PiggyBank size={12} />
                            <span>+{plan.monthlySavingsProjected} Save</span>
                        </div>
                   )}
                   {plan.type === 'austerity' && (
                       <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`}>
                           <Shield size={12} />
                           <span>Max Buffer</span>
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
```
---

### File: `components\Navigation.tsx`
```tsx
import React from 'react';
import { Home, List, Plus, PieChart as PieIcon, Settings } from 'lucide-react';
import { ViewState } from '../types';

interface Props {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const Navigation: React.FC<Props> = ({ currentView, onNavigate }) => {
  
  const NavItem = ({ view, icon: Icon }: { view: ViewState; icon: any }) => {
    const isActive = currentView === view;
    return (
      <button 
        onClick={() => onNavigate(view)}
        className="relative w-12 h-12 flex items-center justify-center transition-all duration-300 group"
      >
        {/* Active Glow Background */}
        {isActive && (
            <div className="absolute inset-0 bg-white/10 rounded-2xl blur-md animate-pulse-glow"></div>
        )}
        
        {/* Icon */}
        <Icon 
            size={24} 
            strokeWidth={isActive ? 2.5 : 2} 
            className={`relative z-10 transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-zinc-500 group-hover:text-zinc-300'}`} 
        />

        {/* Active Dot Indicator */}
        <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-white transition-all duration-300 ${isActive ? 'opacity-100 scale-100 shadow-[0_0_5px_white]' : 'opacity-0 scale-0'}`}></div>
      </button>
    );
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
       <nav className="pointer-events-auto w-full max-w-sm glass-card rounded-[2rem] p-2 flex items-center justify-between shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden">
          
          {/* Subtle reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-[2rem]"></div>

          <NavItem view="dashboard" icon={Home} />
          <NavItem view="transactions" icon={List} />

          {/* Central Add Button (Floating & Glowing) */}
          <div className="relative -top-6">
              <button 
                  onClick={() => onNavigate('add')}
                  className="w-16 h-16 bg-white text-black rounded-[1.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 relative z-20 group"
              >
                  <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
              {/* Button Reflection/Glow below */}
              <div className="absolute top-4 left-2 right-2 h-12 bg-white/20 blur-xl rounded-full -z-10"></div>
          </div>

          <NavItem view="reports" icon={PieIcon} />
          <NavItem view="settings" icon={Settings} />
          
       </nav>
    </div>
  );
};
```
---

### File: `components\Onboarding.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { UserSettings, Currency, Language, RecurringBill } from '../types';
import { TRANSLATIONS, RUSSIAN_BANKS } from '../constants';
import { validateApiKey, analyzeOnboardingData, OnboardingAnalysisResult } from '../services/geminiService';
import { signInWithGoogle, auth, getUserData } from '../services/firebase';
import { Wallet, Check, ImageIcon, DollarSign, Upload, Zap, ArrowRight, Plus, UserCircle2, Key, CheckCircle2, Loader2, PiggyBank, CalendarClock, ChevronDown, Sparkles, ScanLine } from 'lucide-react';

interface BankDetails {
    name: string;
    color: string;
    textColor: string;
}

interface Props {
  user: UserSettings;
  setUser: React.Dispatch<React.SetStateAction<UserSettings>>;
  onComplete: (
      result: OnboardingAnalysisResult, 
      nextSalaryDate: string, 
      nextSalaryAmount: number, 
      bills: RecurringBill[],
      savingsBalance: number,
      spendingBank: BankDetails,
      savingsBank: BankDetails
  ) => void;
  onRestore: (settings: UserSettings, transactions: any[]) => void;
}

// Helper: Bank Selector Component (Glass Style)
const BankSelector = ({ 
    selectedId, 
    onSelect, 
    customName, 
    setCustomName, 
    customColor, 
    setCustomColor 
}: { 
    selectedId: string, 
    onSelect: (id: string) => void,
    customName: string,
    setCustomName: (s: string) => void,
    customColor: string,
    setCustomColor: (s: string) => void
}) => {
    const isCustom = selectedId === 'other';

    return (
        <div className="space-y-4 animate-slide-up-fade">
            <div className="grid grid-cols-4 gap-3">
                {RUSSIAN_BANKS.filter(b => b.id !== 'other').map(bank => (
                    <button
                        key={bank.id}
                        type="button"
                        onClick={() => onSelect(bank.id)}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${selectedId === bank.id ? 'bg-white/10 border-sber-green shadow-[0_0_20px_rgba(33,160,56,0.3)] scale-105' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                    >
                        <div className="relative">
                            {bank.logo ? (
                                <img 
                                    src={bank.logo} 
                                    alt={bank.name} 
                                    className={`w-10 h-10 rounded-full object-cover shadow-lg transition-transform ${selectedId === bank.id ? 'scale-110' : 'grayscale group-hover:grayscale-0'}`}
                                />
                            ) : (
                                <div 
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg transition-transform ${selectedId === bank.id ? 'scale-110' : ''}`}
                                    style={{ backgroundColor: bank.color, color: bank.textColor }}
                                >
                                    {bank.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            {selectedId === bank.id && <div className="absolute -bottom-1 -right-1 bg-sber-green w-4 h-4 rounded-full border-2 border-black flex items-center justify-center shadow-[0_0_10px_#22c55e]"><Check size={8} /></div>}
                        </div>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onSelect('other')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${isCustom ? 'bg-white/10 border-sber-green shadow-lg scale-105' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-zinc-800 text-white border border-white/10">
                        <Plus size={16} />
                    </div>
                </button>
            </div>

            {isCustom && (
                <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-4 animate-scale-in">
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Bank Name</label>
                        <input 
                            type="text" 
                            value={customName} 
                            onChange={e => setCustomName(e.target.value)} 
                            placeholder="My Bank"
                            className="w-full bg-white/5 p-3 rounded-xl border border-white/10 text-white text-sm focus:border-sber-green focus:shadow-[0_0_15px_rgba(33,160,56,0.2)] outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Card Color</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {['#21A038', '#EF3124', '#002882', '#FFDD2D', '#000000', '#BF5AF2', '#FF9500', '#CB11AB', '#D22630'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCustomColor(c)}
                                    className={`w-8 h-8 rounded-full shadow-lg transition-transform ${customColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper: Smart Calendar Grid (Neon Style)
const SmartCalendar = ({ 
    lastSalaryDate, 
    interval 
  }: { 
    lastSalaryDate: string, 
    interval: number 
  }) => {
    const lastDate = new Date(lastSalaryDate);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + interval);
    
    const year = nextDate.getFullYear();
    const month = nextDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="glass-card p-5 rounded-3xl border border-white/10 animate-scale-in shadow-2xl">
         <div className="text-center font-bold mb-4 text-white flex justify-between items-center">
           <span className="text-xs text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1"><Sparkles size={12} /> Forecast</span>
           <span className="text-sm bg-white/5 px-3 py-1 rounded-full border border-white/5 font-display tracking-wide">{nextDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
         </div>
         <div className="grid grid-cols-7 gap-1 text-center mb-2">
           {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[10px] text-zinc-500 font-bold">{d}</div>)}
           {days.map((day, idx) => {
             if (!day) return <div key={idx}></div>;
             const isNextPayday = day === nextDate.getDate();
             return (
               <div 
                 key={idx}
                 className={`text-xs h-8 w-8 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${
                    isNextPayday 
                    ? 'bg-gradient-to-tr from-sber-green to-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(33,160,56,0.6)] scale-110' 
                    : 'text-zinc-600'
                 }`}
               >
                 {day}
               </div>
             )
           })}
         </div>
         <div className="mt-4 text-center bg-sber-green/5 p-3 rounded-xl border border-sber-green/10">
             <p className="text-xs text-sber-green font-medium">
                 Expected Deposit: <span className="font-bold text-white ml-1">{nextDate.toLocaleDateString()}</span>
             </p>
         </div>
      </div>
    );
};

export const Onboarding: React.FC<Props> = ({ user, setUser, onComplete, onRestore }) => {
  const t = TRANSLATIONS[user.language];
  const [step, setStep] = useState(0); 
  const [isValidating, setIsValidating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  const [spendingBankId, setSpendingBankId] = useState<string>('other');
  const [customSpendingName, setCustomSpendingName] = useState('Main Account');
  const [customSpendingColor, setCustomSpendingColor] = useState('#1C1C1E');
  const [showSpendingBankEdit, setShowSpendingBankEdit] = useState(true);

  const [savingsBankId, setSavingsBankId] = useState<string>('other');
  const [customSavingsName, setCustomSavingsName] = useState('Savings Pot');
  const [customSavingsColor, setCustomSavingsColor] = useState('#21A038');
  const [showSavingsBankEdit, setShowSavingsBankEdit] = useState(true);

  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [salaryFile, setSalaryFile] = useState<File | null>(null);
  const [expenseFiles, setExpenseFiles] = useState<File[]>([]);
  
  const [analysisResult, setAnalysisResult] = useState<OnboardingAnalysisResult | null>(null);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');

  const [salaryInterval, setSalaryInterval] = useState<number>(30);
  const [savingsInitial, setSavingsInitial] = useState<number>(0);

  useEffect(() => {
    document.documentElement.dir = user.language === 'ar' ? 'rtl' : 'ltr';
  }, [user.language]);

  useEffect(() => {
    if (process.env.API_KEY && !user.apiKey) {
      setUser(prev => ({ ...prev, apiKey: process.env.API_KEY || '' }));
    }
  }, []);

  const handleGoogleSignIn = async () => {
    if (!auth) { alert("Firebase not configured."); return; }
    try {
        const googleUser = await signInWithGoogle();
        if (googleUser) {
            setIsRestoring(true);
            try {
                const existingData = await getUserData(googleUser.uid);
                if (existingData?.settings?.isOnboarded) {
                    onRestore(existingData.settings, existingData.transactions || []);
                } else {
                    setUser(prev => ({
                        ...prev,
                        name: googleUser.displayName || prev.name,
                        email: googleUser.email || undefined,
                        photoURL: googleUser.photoURL || undefined,
                        isGuest: false
                    }));
                    setStep(1); 
                }
            } catch (e: any) {
                console.error("Firestore Error:", e);
                setStep(1);
            }
        }
    } catch (e: any) {
        alert(`Login Failed: ${e.message}`);
    } finally {
        setIsRestoring(false);
    }
  };

  const checkApiKey = async () => {
    if (!user.apiKey.trim()) return;
    setKeyStatus('validating');
    try {
        const isValid = await validateApiKey(user.apiKey.trim());
        setKeyStatus(isValid ? 'valid' : 'invalid');
    } catch { setKeyStatus('invalid'); }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.name.trim()) return alert("Please enter your name");
    if (!user.apiKey.trim()) return alert(t.enter_key);
    
    if (keyStatus === 'valid') { setStep(2); return; }
    
    setIsValidating(true);
    try {
      const isValid = await validateApiKey(user.apiKey.trim());
      if (isValid) {
        setUser(u => ({ ...u, apiKey: u.apiKey.trim() }));
        setStep(2);
      } else {
        setKeyStatus('invalid');
        alert(t.invalid_key_error);
      }
    } catch { alert("Error connecting to API"); } 
    finally { setIsValidating(false); }
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
      setStep(7);
    } catch (e) {
      console.error(e);
      alert("Analysis failed. Please try again.");
      setStep(2);
    }
  };

  const resolveBankDetails = (id: string, customName: string, customColor: string): BankDetails => {
      const bank = RUSSIAN_BANKS.find(b => b.id === id);
      if (id === 'other' || !bank) {
          return { name: customName || 'Bank', color: customColor || '#000000', textColor: '#FFFFFF' };
      }
      return { name: bank.name, color: bank.color, textColor: bank.textColor };
  };

  const handleFinalize = () => {
      if (!analysisResult) return;
      if (spendingBankId === 'other' && !customSpendingName) return alert("Please enter Spending Bank name.");
      if (savingsBankId === 'other' && !customSavingsName) return alert("Please enter Savings Bank name.");
      
      const lastDate = new Date(analysisResult.lastSalary.date);
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + salaryInterval);
      const nextSalaryDateStr = nextDate.toISOString().split('T')[0];

      const spendingDetails = resolveBankDetails(spendingBankId, customSpendingName, customSpendingColor);
      const savingsDetails = resolveBankDetails(savingsBankId, customSavingsName, customSavingsColor);

      onComplete(
          analysisResult, 
          nextSalaryDateStr, 
          analysisResult.lastSalary.amount, 
          recurringBills,
          savingsInitial,
          spendingDetails,
          savingsDetails
      );
  };

  if (isRestoring) {
      return (
          <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center animate-pulse-glow">
                  <div className="w-24 h-24 glass-card rounded-full flex items-center justify-center border border-primary/30 mb-6">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">Restoring Data...</h2>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center px-6 pt-24 pb-12 text-center text-white relative overflow-hidden font-sans">
        
        {/* Step Indicator (Glowing Bar) */}
        {step > 0 && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-2 p-1.5 glass-card rounded-full border border-white/10 z-20">
            {[1,2,3,4,5,6,7].map(s => (
                <div 
                    key={s} 
                    className={`h-1.5 rounded-full transition-all duration-700 ease-out ${
                        s === step ? 'w-8 bg-primary shadow-[0_0_15px_rgba(168,85,247,0.8)]' : 
                        s < step ? 'w-2 bg-white/80' : 'w-2 bg-white/10'
                    }`} 
                />
            ))}
            </div>
        )}

        {/* Step 0: Welcome Screen */}
        {step === 0 && (
          <div className="w-full max-w-sm glass-card p-8 rounded-[3rem] animate-slide-up-fade shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>
            
            <div className="relative w-32 h-32 mx-auto mb-10 group">
               <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse-slow"></div>
               <img 
                 src="/app.png" 
                 alt="Masareefy" 
                 className="relative z-10 w-full h-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-110 rounded-[2.5rem]"
               />
            </div>
            
            <h1 className="text-5xl font-display font-bold mb-4 tracking-tighter text-white drop-shadow-lg">{t.welcome}</h1>
            <p className="text-zinc-400 mb-10 text-sm font-medium tracking-wide">{t.setup_title}</p>
            
            <button onClick={handleGoogleSignIn} className="w-full bg-white text-black font-bold p-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-95 mb-4 shadow-[0_0_30px_rgba(255,255,255,0.2)] group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {t.sign_in_google}
            </button>
            <button onClick={() => { setUser(u => ({...u, isGuest: false, name: ''})); setStep(1); }} className="w-full glass hover:bg-white/10 text-white font-bold p-5 rounded-2xl flex items-center justify-center gap-3 border border-white/10 transition-all active:scale-95">
                <UserCircle2 className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                {t.guest_mode}
            </button>
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="w-full max-w-sm glass-card p-8 rounded-[3rem] animate-slide-up-fade relative">
             <div className="text-left mb-8">
                 <h2 className="text-3xl font-display font-bold mb-2 text-white">{t.enter_name}</h2>
                 <p className="text-zinc-400 text-xs uppercase tracking-widest">Personalization</p>
             </div>
             
             <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="text-left group">
                  <label className="text-[10px] text-zinc-500 ml-1 mb-2 block uppercase font-bold tracking-widest group-focus-within:text-primary transition-colors">{t.enter_name}</label>
                  <input type="text" className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 focus:border-primary focus:shadow-[0_0_20px_rgba(168,85,247,0.2)] outline-none text-white transition-all placeholder-zinc-700" placeholder="John Doe" value={user.name} onChange={e => setUser({...user, name: e.target.value})} required autoFocus />
              </div>

              <div className="text-left group">
                <label className="text-[10px] text-zinc-500 ml-1 mb-2 block uppercase font-bold tracking-widest group-focus-within:text-primary transition-colors">{t.enter_key}</label>
                <div className="relative">
                    <input type="password" className={`w-full bg-white/5 p-4 pr-14 rounded-2xl border outline-none text-white transition-all placeholder-zinc-700 ${keyStatus === 'valid' ? 'border-sber-green shadow-[0_0_15px_rgba(33,160,56,0.3)]' : keyStatus === 'invalid' ? 'border-red-500' : 'border-white/10 focus:border-primary'}`} placeholder="AI Studio Key" value={user.apiKey} onChange={e => { setUser({...user, apiKey: e.target.value}); setKeyStatus('idle'); }} required />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button type="button" onClick={checkApiKey} disabled={!user.apiKey} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${keyStatus === 'valid' ? 'bg-sber-green text-white shadow-lg' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>
                            {keyStatus === 'valid' ? <CheckCircle2 size={20} /> : <Key size={20} />}
                        </button>
                    </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                 <select className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 text-white outline-none focus:border-primary appearance-none font-bold" value={user.currency} onChange={e => setUser({...user, currency: e.target.value as Currency})}>
                    <option value="USD">USD ($)</option>
                    <option value="SAR">SAR (﷼)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="RUB">RUB (₽)</option>
                 </select>
                 <select className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 text-white outline-none focus:border-primary appearance-none font-bold" value={user.language} onChange={e => setUser({...user, language: e.target.value as Language})}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                    <option value="ru">Русский</option>
                 </select>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:to-indigo-500 font-bold p-4 rounded-2xl mt-4 flex justify-center gap-3 items-center shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all active:scale-95 text-white" disabled={isValidating}>
                {isValidating ? <Loader2 className="animate-spin" /> : <>{t.start} <ArrowRight size={20} /></>}
              </button>
             </form>
          </div>
        )}

        {/* Step 2: Balance */}
        {step === 2 && (
          <div className="w-full max-w-sm glass-card p-8 rounded-[3rem] animate-slide-up-fade text-left">
            <h2 className="text-3xl font-display font-bold mb-2 text-white">{t.step_balance}</h2>
            <p className="text-zinc-400 mb-8 text-sm">{t.step_balance_desc}</p>
            <div 
                className={`h-64 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden ${balanceFile ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/50 hover:bg-white/5'}`} 
                onClick={() => document.getElementById('balanceInput')?.click()}
            >
              {balanceFile && <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse"></div>}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all relative z-10 ${balanceFile ? 'bg-primary text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]' : 'bg-white/5 text-zinc-500 group-hover:scale-110'}`}>
                 {balanceFile ? <Check size={40} /> : <ImageIcon size={32} />}
              </div>
              <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors relative z-10">{balanceFile ? balanceFile.name : t.upload_image}</span>
              <input id="balanceInput" type="file" accept="image/*" className="hidden" onChange={(e) => setBalanceFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(3)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold shadow-lg hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none" disabled={!balanceFile}>Next Step</button>
          </div>
        )}

        {/* Step 3: Salary */}
        {step === 3 && (
          <div className="w-full max-w-sm glass-card p-8 rounded-[3rem] animate-slide-up-fade text-left">
            <h2 className="text-3xl font-display font-bold mb-2 text-white">{t.step_salary}</h2>
            <p className="text-zinc-400 mb-8 text-sm">Upload last salary slip.</p>
            <div 
                className={`h-64 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden ${salaryFile ? 'border-secondary bg-secondary/10' : 'border-white/10 hover:border-secondary/50 hover:bg-white/5'}`} 
                onClick={() => document.getElementById('salaryInput')?.click()}
            >
              {salaryFile && <div className="absolute inset-0 bg-secondary/20 blur-xl animate-pulse"></div>}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all relative z-10 ${salaryFile ? 'bg-secondary text-white shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'bg-white/5 text-zinc-500 group-hover:scale-110'}`}>
                 {salaryFile ? <Check size={40} /> : <DollarSign size={32} />}
              </div>
              <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors relative z-10">{salaryFile ? salaryFile.name : t.upload_image}</span>
              <input id="salaryInput" type="file" accept="image/*" className="hidden" onChange={(e) => setSalaryFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold shadow-lg hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none" disabled={!salaryFile}>Next Step</button>
          </div>
        )}

        {/* Step 4: Expenses */}
        {step === 4 && (
          <div className="w-full max-w-sm glass-card p-8 rounded-[3rem] animate-slide-up-fade text-left">
            <h2 className="text-3xl font-display font-bold mb-2 text-white">{t.step_expenses}</h2>
            <p className="text-zinc-400 mb-8 text-sm">Upload receipts to learn habits.</p>
            <div 
                className={`h-64 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden ${expenseFiles.length ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/50 hover:bg-white/5'}`} 
                onClick={() => document.getElementById('expensesInput')?.click()}
            >
               {expenseFiles.length > 0 && <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse"></div>}
               <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all relative z-10 ${expenseFiles.length ? 'bg-primary text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]' : 'bg-white/5 text-zinc-500 group-hover:scale-110'}`}>
                 {expenseFiles.length ? <span className="font-display font-bold text-2xl">{expenseFiles.length}</span> : <Upload size={32} />}
               </div>
               <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors relative z-10">{expenseFiles.length ? 'Files Selected' : 'Upload Receipts'}</span>
               <input id="expensesInput" type="file" accept="image/*" multiple className="hidden" onChange={(e) => setExpenseFiles(Array.from(e.target.files || []))} />
            </div>
            <button onClick={() => setStep(5)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold shadow-lg hover:bg-gray-200 transition-all active:scale-95">Next Step</button>
          </div>
        )}

        {/* Step 5: Recurring Bills */}
        {step === 5 && (
          <div className="w-full max-w-sm glass-card p-8 rounded-[3rem] animate-slide-up-fade text-left">
             <h2 className="text-3xl font-display font-bold mb-2 text-white">{t.step_recurring}</h2>
             <p className="text-zinc-400 mb-6 text-sm">Rent, Internet, Netflix, etc.</p>
             
             <div className="glass-card p-4 rounded-3xl border border-white/5 mb-6 space-y-3">
                <input type="text" placeholder={t.bill_name} value={newBillName} onChange={e => setNewBillName(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl border border-white/10 outline-none text-sm text-white focus:border-primary transition-all" />
                <div className="flex gap-2">
                   <input type="number" placeholder={t.bill_amount} value={newBillAmount} onChange={e => setNewBillAmount(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl border border-white/10 outline-none text-sm text-white focus:border-primary transition-all" />
                   <button onClick={() => { if(newBillName && newBillAmount) { setRecurringBills([...recurringBills, { id: Date.now().toString(), name: newBillName, amount: Number(newBillAmount) }]); setNewBillName(''); setNewBillAmount(''); } }} className="bg-primary p-3 rounded-xl text-white hover:bg-purple-600 transition-colors shadow-lg"><Plus /></button>
                </div>
                {recurringBills.length > 0 && (
                    <div className="space-y-2 pt-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {recurringBills.map(b => (
                            <div key={b.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                <span className="text-sm font-medium">{b.name}</span> 
                                <span className="text-xs font-bold text-zinc-400">{b.amount}</span>
                            </div>
                        ))}
                    </div>
                )}
             </div>
             <button onClick={handleStartAnalysis} className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:to-indigo-500 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all active:scale-95">
                 Analyze All <Zap size={18} className="fill-current" />
             </button>
          </div>
        )}

        {/* Step 6: Loading */}
        {step === 6 && (
           <div className="flex flex-col items-center justify-center animate-fade-in relative">
              <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse-slow"></div>
              <div className="relative z-10">
                  <div className="w-32 h-32 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                  </div>
              </div>
              <h2 className="text-3xl font-display font-bold mt-8 text-white tracking-wide text-glow">{t.analyzing_all}</h2>
              <p className="text-zinc-400 mt-2 text-sm font-mono tracking-widest">AI NEURAL PROCESSING...</p>
           </div>
        )}

        {/* Step 7: Final Review */}
        {step === 7 && analysisResult && (
           <div className="w-full max-w-sm animate-slide-up-fade pb-10">
              <h2 className="text-4xl font-display font-bold mb-2 text-white">{t.step_review}</h2>
              <p className="text-zinc-400 mb-8 text-sm">Configure your smart wallets.</p>
              
              <div className="space-y-4">
                 {/* 1. Spending Wallet Config */}
                 <div className="glass-card p-6 rounded-[2.5rem] border border-white/10 space-y-4 shadow-xl">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div className="flex items-center gap-2 text-zinc-300">
                            <Wallet size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Spending</span>
                        </div>
                        <span className="font-display font-bold text-white text-2xl">{analysisResult.currentBalance.toLocaleString()}</span>
                    </div>

                    <div className="pt-1">
                        <button 
                            onClick={() => setShowSpendingBankEdit(!showSpendingBankEdit)}
                            className="w-full flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-all group"
                        >
                            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors uppercase tracking-wider">Bank Account</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{spendingBankId === 'other' ? customSpendingName || 'Custom' : RUSSIAN_BANKS.find(b => b.id === spendingBankId)?.name}</span>
                                <ChevronDown size={14} className={`text-zinc-500 transition-transform ${showSpendingBankEdit ? 'rotate-180' : ''}`} />
                            </div>
                        </button>

                        {showSpendingBankEdit && (
                            <div className="mt-4">
                                <BankSelector 
                                    selectedId={spendingBankId}
                                    onSelect={setSpendingBankId}
                                    customName={customSpendingName}
                                    setCustomName={setCustomSpendingName}
                                    customColor={customSpendingColor}
                                    setCustomColor={setCustomSpendingColor}
                                />
                            </div>
                        )}
                    </div>
                 </div>
                 
                 {/* 2. Savings Wallet Config */}
                 <div className="glass-card p-6 rounded-[2.5rem] border border-white/10 space-y-4 shadow-xl">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 text-sber-green">
                            <PiggyBank size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Savings Pot</span>
                        </div>
                        <input 
                            type="number" 
                            value={savingsInitial} 
                            onChange={e => setSavingsInitial(Number(e.target.value))}
                            className="bg-white/5 text-white w-28 text-right p-2 rounded-xl text-xl font-display font-bold border border-white/10 outline-none focus:border-sber-green transition-all"
                            placeholder="0.00"
                        />
                    </div>
                    
                    <div className="pt-2">
                            <button 
                                onClick={() => setShowSavingsBankEdit(!showSavingsBankEdit)}
                                className="w-full flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-all group"
                            >
                                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors uppercase tracking-wider">Bank Account</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">{savingsBankId === 'other' ? customSavingsName || 'Custom' : RUSSIAN_BANKS.find(b => b.id === savingsBankId)?.name}</span>
                                    <ChevronDown size={14} className={`text-zinc-500 transition-transform ${showSavingsBankEdit ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {showSavingsBankEdit && (
                                <div className="mt-4">
                                    <BankSelector 
                                        selectedId={savingsBankId}
                                        onSelect={setSavingsBankId}
                                        customName={customSavingsName}
                                        setCustomName={setCustomSavingsName}
                                        customColor={customSavingsColor}
                                        setCustomColor={setCustomSavingsColor}
                                    />
                                </div>
                            )}
                    </div>
                 </div>

                 {/* 3. Salary Cycle */}
                 <div className="glass-card p-6 rounded-[2.5rem] border border-white/10 shadow-xl">
                    <div className="flex items-center gap-2 mb-6">
                        <CalendarClock className="text-purple-400 w-5 h-5" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Salary Cycle</span>
                    </div>
                    
                    <div className="mb-6 flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-xs text-zinc-400 uppercase tracking-widest">Detected Date</p>
                        <p className="text-white font-mono font-bold text-lg">
                            {analysisResult.lastSalary.date}
                        </p>
                    </div>

                    <div className="mb-8">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block tracking-widest text-left ml-1">Pay Interval (Days)</label>
                        <input 
                            type="number" 
                            value={salaryInterval} 
                            onChange={e => setSalaryInterval(Number(e.target.value))}
                            className="w-full bg-white/5 text-white p-4 rounded-2xl border border-white/10 text-center font-display font-bold text-2xl outline-none focus:border-purple-500 transition-all"
                        />
                    </div>

                    <SmartCalendar lastSalaryDate={analysisResult.lastSalary.date} interval={salaryInterval} />
                 </div>

                 <button onClick={handleFinalize} className="w-full bg-white text-black p-5 rounded-2xl mt-4 font-bold shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-all active:scale-95 text-lg uppercase tracking-wider">
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
import { Check, Calendar, Plus, Trash2, Receipt } from 'lucide-react';

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
    <div className="space-y-3">
      {/* List */}
      {bills.length === 0 ? (
        <div 
            onClick={() => setIsAdding(true)}
            className="flex flex-col items-center justify-center py-8 border border-dashed border-white/10 rounded-2xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
        >
            <div className="p-3 rounded-full bg-white/5 group-hover:scale-110 transition-transform mb-2">
                <Plus className="w-5 h-5 text-zinc-500 group-hover:text-white" />
            </div>
            <p className="text-xs text-zinc-500 font-medium">Tap to add fixed bills</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
            {bills.map((bill, idx) => {
            const isPaid = bill.lastPaidDate && bill.lastPaidDate.startsWith(currentMonth);
            return (
                <div 
                key={bill.id}
                onClick={() => !isPaid && setSelectedBill(bill)}
                className={`
                    relative overflow-hidden p-4 rounded-2xl transition-all duration-300 flex items-center justify-between group
                    ${isPaid 
                        ? 'bg-sber-green/5 border border-sber-green/10 opacity-60' 
                        : 'glass-card glass-card-hover cursor-pointer'
                    }
                    animate-slide-up-fade
                `}
                style={{ animationDelay: `${idx * 50}ms` }}
                >
                <div className="flex items-center gap-4 z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${isPaid ? 'bg-sber-green/20 border-sber-green/20 text-sber-green' : 'bg-white/5 border-white/5 text-zinc-400 group-hover:text-white'}`}>
                        {isPaid ? <Check size={18} strokeWidth={3} /> : <Receipt size={18} />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isPaid ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-white'}`}>{bill.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {isPaid ? `Paid: ${bill.lastPaidDate}` : 'Due this month'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 z-10">
                    <span className={`font-display font-bold text-sm ${isPaid ? 'text-zinc-500' : 'text-white'}`}>
                        {bill.amount} <span className="text-[10px] opacity-50 font-sans">{user.currency}</span>
                    </span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteBill(bill.id); }}
                        className="p-2 rounded-full hover:bg-red-500/20 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                </div>
            );
            })}
            
            {/* Add Button Row */}
            <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-3 rounded-xl border border-dashed border-white/10 text-xs font-bold text-zinc-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 hover:bg-white/5 uppercase tracking-wider"
            >
                <Plus size={14} /> Add Bill
            </button>
        </div>
      )}

      {/* Payment Modal */}
      {selectedBill && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="absolute inset-0" onClick={() => setSelectedBill(null)} />
            <div className="relative glass-panel w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 animate-slide-up-fade shadow-2xl border border-white/10">
               <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
               
               <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-sber-green/10 rounded-full flex items-center justify-center mx-auto mb-4 text-sber-green border border-sber-green/20 shadow-[0_0_20px_rgba(33,160,56,0.2)]">
                      <Check size={32} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-1">{t.confirm_payment}</h3>
                  <p className="text-sm text-zinc-400">Mark <span className="text-white font-bold">{selectedBill.name}</span> as paid?</p>
               </div>

               <div className="space-y-4">
                  <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Amount</span>
                      <span className="text-lg font-display font-bold text-white">{selectedBill.amount} {user.currency}</span>
                  </div>

                  <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2 mb-1 block">Date</label>
                        <input 
                            type="date" 
                            value={payDate}
                            onChange={(e) => setPayDate(e.target.value)}
                            className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 text-sm outline-none focus:border-sber-green focus:shadow-[0_0_15px_rgba(33,160,56,0.2)] transition-all"
                        />
                      </div>
                  </div>

                  <div 
                    onClick={() => setDeduct(!deduct)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${deduct ? 'bg-sber-green/10 border-sber-green/50' : 'bg-black/40 border-white/5'}`}
                  >
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${deduct ? 'bg-sber-green border-sber-green shadow-[0_0_10px_#22c55e]' : 'border-zinc-600'}`}>
                        {deduct && <Check size={12} className="text-white" />}
                     </div>
                     <span className="text-sm font-medium text-zinc-300">{t.deduct_balance}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button onClick={() => setSelectedBill(null)} className="py-3 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                      <button onClick={confirmPayment} className="py-3 rounded-xl font-bold text-sm bg-sber-green text-white shadow-[0_0_20px_rgba(33,160,56,0.3)] hover:shadow-[0_0_30px_rgba(33,160,56,0.5)] transition-all active:scale-95">Confirm</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Add Bill Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="absolute inset-0" onClick={() => setIsAdding(false)} />
            <div className="relative glass-panel w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 animate-slide-up-fade shadow-2xl border border-white/10">
               <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
               
               <h3 className="text-xl font-display font-bold text-white mb-6 text-center">{t.add_bill}</h3>
               
               <div className="space-y-5">
                  <div className="group">
                     <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2 mb-1 block group-focus-within:text-white transition-colors">{t.bill_name}</label>
                     <input 
                        type="text"
                        placeholder="e.g. Netflix"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-white/30 focus:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none transition-all placeholder-zinc-700"
                        autoFocus
                     />
                  </div>
                  <div className="group">
                     <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2 mb-1 block group-focus-within:text-white transition-colors">{t.bill_amount}</label>
                     <div className="relative">
                        <input 
                            type="number"
                            placeholder="0.00"
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value)}
                            className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-white/30 focus:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none transition-all placeholder-zinc-700"
                        />
                        <span className="absolute right-4 top-4 text-zinc-500 font-bold text-sm pointer-events-none">{user.currency}</span>
                     </div>
                  </div>

                  <button 
                     onClick={handleSaveNewBill}
                     disabled={!newName || !newAmount}
                     className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-2xl font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 uppercase tracking-wider"
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
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction, Language } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { TrendingUp, DollarSign, PieChart as PieIcon, TrendingDown, Calculator, Activity, Calendar } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  language: Language;
}

export const Reports: React.FC<Props> = ({ transactions, language }) => {
  const t = TRANSLATIONS[language];

  // Logic: Filter Expenses
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  // Group by Category
  const dataMap = expenses.reduce((acc, curr) => {
    const amount = Number(curr.amount);
    const catKey = curr.category || 'general';
    acc[catKey] = (acc[catKey] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(dataMap).map(catId => {
    const category = CATEGORIES.find(c => c.id === catId) || CATEGORIES.find(c => c.id === 'general') || CATEGORIES[0];
    const name = language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en;
    return {
      name,
      value: dataMap[catId],
      color: category.color,
      icon: category.icon
    };
  }).sort((a, b) => b.value - a.value);

  // Weekly Trend Data & Analysis
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const barData = last7Days.map(dateStr => {
    const dayTotal = expenses
      .filter(t => t.date === dateStr) 
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const dateObj = new Date(dateStr);
    return {
      name: new Intl.DateTimeFormat(language, { weekday: 'short' }).format(dateObj),
      fullDate: dateStr,
      amount: dayTotal
    };
  });

  const maxAmount = Math.max(...barData.map(d => d.amount));
  const minAmount = Math.min(...barData.filter(d => d.amount > 0).map(d => d.amount)) || 0;
  const averageDaily = totalExpenses / (barData.filter(d => d.amount > 0).length || 1);
  const hasData = expenses.length > 0;

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="glass-card p-4 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  <p className="text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">{label}</p>
                  <p className="text-white font-display font-bold text-xl">
                      {Number(payload[0].value).toLocaleString()}
                  </p>
              </div>
          );
      }
      return null;
  };

  return (
    <div className="space-y-8 pb-32 pt-2">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-2 mb-2 pt-4 animate-slide-up-fade" style={{ animationDelay: '0ms' }}>
         <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
             <PieIcon className="w-6 h-6 text-primary" />
         </div>
         <h2 className="text-3xl font-display font-bold text-white leading-none tracking-wide text-glow">{t.reports}</h2>
      </div>

      {hasData ? (
          <>
            {/* 1. Hero Stats Row */}
            <div className="grid grid-cols-2 gap-4 px-1">
                {/* Total Spent */}
                <div className="glass-card p-6 rounded-[2.5rem] relative overflow-hidden group animate-scale-in" style={{ animationDelay: '100ms' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <TrendingDown size={56} />
                    </div>
                    {/* Animated Blob */}
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-red-500/20 blur-[50px] rounded-full animate-pulse-glow"></div>
                    
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1 relative z-10">
                        <Activity size={10} /> Total Spent
                    </p>
                    <h3 className="text-3xl font-display font-bold text-white tabular-nums tracking-tight drop-shadow-md relative z-10">
                        {totalExpenses.toLocaleString()}
                    </h3>
                    <div className="mt-3 text-[10px] font-bold text-red-300 bg-red-500/10 px-3 py-1 rounded-full w-fit border border-red-500/10 relative z-10">
                        Expense
                    </div>
                </div>

                {/* Daily Average */}
                <div className="glass-card p-6 rounded-[2.5rem] relative overflow-hidden group animate-scale-in" style={{ animationDelay: '200ms' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Calculator size={56} />
                    </div>
                    {/* Animated Blob */}
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-500/20 blur-[50px] rounded-full animate-pulse-glow" style={{ animationDelay: '1s' }}></div>

                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1 relative z-10">
                        <Calendar size={10} /> Daily Avg
                    </p>
                    <h3 className="text-3xl font-display font-bold text-white tabular-nums tracking-tight drop-shadow-md relative z-10">
                        {averageDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h3>
                    <div className="mt-3 text-[10px] font-bold text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full w-fit border border-blue-500/10 relative z-10">
                        Last 7 Days
                    </div>
                </div>
            </div>

            {/* 2. Weekly Activity (Neon Bar Chart) */}
            <div className="glass-card p-6 rounded-[2.5rem] animate-slide-up-fade" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-display font-bold text-white flex items-center gap-2 text-lg tracking-wide">
                        <TrendingUp className="w-5 h-5 text-blue-400" /> Weekly Flow
                    </h3>
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_red]"></div>Max</span>
                        <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_#10B981]"></div>Min</span>
                    </div>
                </div>
                
                <div className="h-[240px] w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} barSize={14}>
                            <CartesianGrid vertical={false} stroke="#333" strokeOpacity={0.4} strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#52525b" 
                                tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 700, fontFamily: 'Inter'}} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={15}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff', opacity: 0.05, radius: 10}} />
                            <Bar dataKey="amount" radius={[8, 8, 8, 8]}>
                                {barData.map((entry, index) => {
                                    let color = '#3b82f6'; // Blue
                                    let opacity = 0.7;
                                    
                                    if (entry.amount === maxAmount && maxAmount > 0) { color = '#ef4444'; opacity = 1; } // Red Max
                                    else if (entry.amount === minAmount && entry.amount > 0) { color = '#10B981'; opacity = 1; } // Green Min
                                    
                                    return (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={color} 
                                            fillOpacity={opacity}
                                            style={{ filter: `drop-shadow(0 0 10px ${color}50)` }} 
                                        />
                                    );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Spending Breakdown (Donut & List) */}
            <div className="glass-card p-6 rounded-[2.5rem] animate-slide-up-fade" style={{ animationDelay: '400ms' }}>
                <h3 className="font-display font-bold text-white mb-8 flex items-center gap-2 text-lg tracking-wide">
                    <DollarSign className="w-5 h-5 text-secondary" /> Breakdown
                </h3>
                
                <div className="flex flex-col items-center gap-10">
                    {/* Donut Chart */}
                    <div className="h-[260px] w-[260px] relative">
                        {/* Background Glow */}
                        <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl scale-75 animate-pulse-slow"></div>
                        
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={6}
                                    dataKey="value"
                                    cornerRadius={10}
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color} 
                                            style={{ filter: `drop-shadow(0 0 8px ${entry.color}40)` }} 
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-2">Total</span>
                            <span className="text-3xl font-display font-bold text-white tabular-nums drop-shadow-md">{totalExpenses.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Categories List */}
                    <div className="w-full space-y-6">
                        {pieData.slice(0, 5).map((cat, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-center mb-2.5">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border border-white/5 transition-transform group-hover:scale-110" 
                                            style={{ backgroundColor: `${cat.color}15` }}
                                        >
                                            <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: cat.color }}></div>
                                        </div>
                                        <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{cat.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-display font-bold text-white block tabular-nums tracking-wide">{cat.value.toLocaleString()}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">{((cat.value / totalExpenses) * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                {/* Animated Progress Bar */}
                                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out relative group-hover:brightness-125"
                                        style={{ width: `${(cat.value / totalExpenses) * 100}%`, backgroundColor: cat.color, boxShadow: `0 0 12px ${cat.color}` }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/40 blur-[4px]"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </>
      ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center opacity-50 animate-scale-in">
             <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 border-dashed">
                <PieIcon size={40} strokeWidth={1} className="text-zinc-600" />
             </div>
             <p className="text-lg font-display font-bold text-white">No data yet</p>
             <p className="text-sm text-zinc-500 mt-2">Start adding transactions.</p>
          </div>
      )}
    </div>
  );
};
```
---

### File: `components\SettingsPage.tsx`
```tsx
import React, { useState, useRef } from 'react';
import { Settings, Globe, ChevronRight, Key, LogOut, Wallet, PiggyBank, X, Check, Trash2, Loader2, Calculator, Target, Camera, Pencil, Shield, Sparkles } from 'lucide-react';
import { UserSettings, BudgetPlan } from '../types';
import { TRANSLATIONS, RUSSIAN_BANKS } from '../constants';
import { validateApiKey } from '../services/geminiService';
import { deleteUserAccount, auth, reauthenticateUser, logoutUser } from '../services/firebase';
import { BudgetPlans } from './BudgetPlans';

interface Props {
  user: UserSettings;
  setUser: React.Dispatch<React.SetStateAction<UserSettings>>;
  onLogout: () => void;
}

export const SettingsPage: React.FC<Props> = ({ user, setUser, onLogout }) => {
  const t = TRANSLATIONS[user.language];
  const [editingKey, setEditingKey] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Budget Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Wallet Edit State
  const [editingWallet, setEditingWallet] = useState<'spending' | 'savings' | null>(null);
  const [tempBankId, setTempBankId] = useState<string>('sber');
  const [tempName, setTempName] = useState('');
  const [tempColor, setTempColor] = useState('#21A038');

  // --- Handlers ---

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
      reader.onloadend = () => {
        setUser(prev => ({ ...prev, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveName = () => {
    if (newName.trim()) {
      setUser(prev => ({ ...prev, name: newName.trim() }));
      setIsEditingName(false);
    }
  };

  const handlePlanSelection = (plan: BudgetPlan) => {
    setUser(u => ({ ...u, selectedPlan: plan.type, dailyLimit: plan.dailyLimit }));
    setShowPlanModal(false);
  };

  const openWalletEdit = (type: 'spending' | 'savings') => {
      setEditingWallet(type);
      const currentName = type === 'spending' ? user.spendingBankName : user.savingsBankName;
      const currentColor = type === 'spending' ? user.spendingBankColor : user.savingsBankColor;
      
      const preset = RUSSIAN_BANKS.find(b => b.name === currentName && b.color === currentColor);
      if (preset) {
          setTempBankId(preset.id);
          setTempName('');
          setTempColor(preset.color);
      } else {
          setTempBankId('other');
          setTempName(currentName);
          setTempColor(currentColor);
      }
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
      const confirmMsg1 = user.language === 'ar' 
        ? "هل أنت متأكد أنك تريد حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء." 
        : "Are you sure you want to delete your account? This action cannot be undone.";
      
      const confirmMsg2 = user.language === 'ar'
        ? "سيتم حذف جميع بياناتك ومعاملاتك نهائياً. هل تؤكد الحذف؟"
        : "All your data and transactions will be permanently lost. Confirm deletion?";

      if (!window.confirm(confirmMsg1)) return;
      if (!window.confirm(confirmMsg2)) return;

      setIsDeleting(true);
      try {
          if (!user.isGuest && auth.currentUser) {
              try {
                  await deleteUserAccount(auth.currentUser.uid);
              } catch (error: any) {
                  // Catch the specific "Recent Login Required" error
                  if (error.code === 'auth/requires-recent-login' || error.message?.includes('recent-login')) {
                      const reAuthConfirm = window.confirm(
                          user.language === 'ar' 
                          ? "لأغراض أمنية، يرجى تأكيد هويتك (إعادة المصادقة) لإتمام حذف الحساب." 
                          : "For security, please confirm your identity (re-authenticate) to complete account deletion."
                      );
                      
                      if (reAuthConfirm) {
                          // Trigger Re-authentication popup
                          const reauthed = await reauthenticateUser();
                          if (reauthed && auth.currentUser) {
                              // Retry delete immediately after success
                              await deleteUserAccount(auth.currentUser.uid);
                          } else {
                              throw new Error("Re-authentication failed or cancelled.");
                          }
                      } else {
                          setIsDeleting(false);
                          return;
                      }
                  } else {
                      throw error;
                  }
              }
          }
          
          // Cleanup Local Data
          localStorage.removeItem('masareefy_user');
          localStorage.removeItem('masareefy_txs');
          
          // Force Reload to go back to clean slate
          window.location.reload();
          
      } catch (error: any) {
          console.error("Delete failed:", error);
          alert(user.language === 'ar' 
            ? `فشل حذف الحساب: ${error.message}` 
            : `Failed to delete account: ${error.message}`);
          setIsDeleting(false);
      }
  };

  // Reusable Modern Row
  const SettingRow = ({ icon: Icon, title, value, onClick, color = "text-zinc-400", delay = 0 }: any) => (
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
            <span className="text-zinc-500 text-xs font-medium font-mono bg-white/5 px-2 py-1 rounded-md border border-white/5 group-hover:bg-white/10 transition-colors">{value}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/0 group-hover:bg-white/5 transition-colors">
                 <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </div>
        </div>
    </button>
  );

  return (
    <div className="pb-40 space-y-8 px-1">
      
      {/* 1. Header Area */}
      <div className="flex items-center justify-between pt-4 animate-slide-down">
          <div>
            <h2 className="text-4xl font-bold text-white tracking-tighter mb-1">{t.settings}</h2>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Preferences & Account</p>
          </div>
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <Settings className="w-5 h-5 text-zinc-400 animate-spin-slow" />
          </div>
      </div>

      {/* 2. Profile Hero Card */}
      <div className="relative glass-panel p-6 rounded-[2.5rem] overflow-hidden group animate-scale-in" style={{ animationDelay: '0.1s' }}>
          {/* Ambient Glow */}
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
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
                        <Camera size={24} className="text-white drop-shadow-lg" />
                    </div>
                </div>
                {user.isGuest && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-[#121212] z-20 shadow-lg">
                        GUEST
                    </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
              
              <div className="flex-1 min-w-0">
                  {isEditingName ? (
                      <div className="flex items-center gap-2 animate-in fade-in">
                          <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white font-bold text-lg w-full outline-none focus:border-sber-green focus:ring-1 focus:ring-sber-green transition-all"
                            autoFocus
                          />
                          <button onClick={saveName} className="p-2.5 bg-sber-green rounded-xl text-white shadow-lg hover:bg-green-600 transition-colors active:scale-95"><Check size={18} /></button>
                          <button onClick={() => { setIsEditingName(false); setNewName(user.name); }} className="p-2.5 bg-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/20 transition-colors"><X size={18} /></button>
                      </div>
                  ) : (
                      <div className="group/name">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-2xl font-bold text-white truncate">{user.name || 'Guest User'}</h3>
                            <button onClick={() => setIsEditingName(true)} className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover/name:opacity-100">
                                <Pencil size={14} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-zinc-500">
                                ID: {user.apiKey ? '••••' + user.apiKey.slice(-4) : 'N/A'}
                            </span>
                            {!user.isGuest && (
                                <span className="flex items-center gap-1 text-[10px] text-sber-green font-bold bg-sber-green/10 px-2 py-0.5 rounded-md border border-sber-green/20">
                                    <Shield size={10} /> PRO
                                </span>
                            )}
                        </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
      
      {/* 3. General Settings Group */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Application
          </h3>
          <div className="bg-[#121212]/80 backdrop-blur-md rounded-[2rem] border border-white/5 overflow-hidden p-1 shadow-2xl">
            <SettingRow 
                icon={Globe} 
                title="Language" 
                value={user.language === 'ar' ? 'العربية' : user.language === 'ru' ? 'Русский' : 'English'} 
                color="text-indigo-400 group-hover:text-indigo-300"
                onClick={() => setUser(u => ({...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en'}))}
            />
            <div className="h-[1px] bg-white/5 mx-4" />
            <SettingRow 
                icon={Target} 
                title="Currency" 
                value={user.currency} 
                color="text-emerald-400 group-hover:text-emerald-300"
                onClick={() => {
                    const currencies: any[] = ['USD', 'SAR', 'AED', 'RUB'];
                    const nextIdx = (currencies.indexOf(user.currency) + 1) % currencies.length;
                    setUser(u => ({...u, currency: currencies[nextIdx]}));
                }}
            />
          </div>
      </div>

      {/* 4. Budget & Wallets Group */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
             <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Finance Control
          </h3>
          <div className="bg-[#121212]/80 backdrop-blur-md rounded-[2rem] border border-white/5 overflow-hidden p-1 shadow-2xl">
             <SettingRow 
                icon={Calculator} 
                title={user.language === 'ar' ? 'خطة الصرف' : 'Budget Plan'}
                value={user.selectedPlan ? user.selectedPlan.toUpperCase() : 'NOT SET'} 
                color="text-blue-400 group-hover:text-blue-300"
                onClick={() => setShowPlanModal(true)}
            />
             <div className="h-[1px] bg-white/5 mx-4" />
             {/* Spending Wallet */}
             <button 
                onClick={() => openWalletEdit('spending')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all duration-300 group rounded-xl active:scale-[0.99]"
             >
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner transition-colors group-hover:border-white/10 text-white">
                        <Wallet size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm tracking-wide group-hover:text-white transition-colors block">Main Wallet</span>
                        <div className="flex items-center gap-1.5 mt-1">
                             <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: user.spendingBankColor, color: user.spendingBankColor }}></div>
                             <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">{user.spendingBankName}</span>
                        </div>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/0 group-hover:bg-white/5 transition-colors">
                     <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
             </button>

             <div className="h-[1px] bg-white/5 mx-4" />

             {/* Savings Wallet */}
             <button 
                onClick={() => openWalletEdit('savings')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all duration-300 group rounded-xl active:scale-[0.99]"
             >
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner transition-colors group-hover:border-white/10 text-sber-green">
                        <PiggyBank size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm tracking-wide group-hover:text-white transition-colors block">Savings Pot</span>
                        <div className="flex items-center gap-1.5 mt-1">
                             <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: user.savingsBankColor, color: user.savingsBankColor }}></div>
                             <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">{user.savingsBankName}</span>
                        </div>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/0 group-hover:bg-white/5 transition-colors">
                     <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
             </button>
          </div>
      </div>

      {/* 5. Intelligence (AI) Group */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
             <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Intelligence
          </h3>
          <div className="bg-[#121212]/80 backdrop-blur-md rounded-[2rem] border border-white/5 overflow-hidden p-1 shadow-2xl">
             <button 
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors rounded-[1.8rem] group"
             >
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner text-purple-400 group-hover:text-purple-300">
                        <Sparkles size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm block group-hover:text-white transition-colors">Gemini AI Core</span>
                        <span className="text-[10px] text-zinc-500 block group-hover:text-zinc-400 transition-colors">Manage neural engine access</span>
                    </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform duration-300 ${showKeyInput ? 'rotate-90 text-white' : ''}`} />
             </button>

             {/* Expandable Key Input */}
             {showKeyInput && (
                 <div className="px-4 pb-4 pt-2 animate-in slide-in-from-top-2 fade-in">
                     <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                            {t.change_key_desc}
                        </p>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                                <input 
                                    type="password" 
                                    placeholder="Paste new API Key" 
                                    value={editingKey}
                                    onChange={(e) => setEditingKey(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm focus:border-purple-500 focus:shadow-[0_0_15px_rgba(168,85,247,0.2)] outline-none transition-all placeholder-zinc-700 text-white"
                                />
                            </div>
                            <button 
                                onClick={handleUpdateApiKey}
                                disabled={!editingKey || isValidatingKey}
                                className="bg-white text-black px-5 rounded-xl font-bold text-xs disabled:opacity-50 hover:bg-gray-200 transition-colors shadow-lg"
                            >
                                {isValidatingKey ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save'}
                            </button>
                        </div>
                     </div>
                 </div>
             )}
          </div>
      </div>

      {/* 6. Danger Zone */}
      <div className="grid grid-cols-2 gap-3 pt-4 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <button 
            onClick={onLogout}
            className="bg-[#1C1C1E] border border-white/5 hover:bg-white/10 p-5 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all group hover:border-white/10"
          >
            <LogOut size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
            <span className="font-bold text-zinc-500 group-hover:text-white text-xs uppercase tracking-widest">{t.sign_out}</span>
          </button>

          <button 
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 p-5 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {isDeleting ? <Loader2 size={20} className="animate-spin text-red-500" /> : <Trash2 size={20} className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
            <span className="font-bold text-red-500 text-xs uppercase tracking-widest relative z-10">Delete</span>
          </button>
      </div>

      <div className="text-center pt-6 pb-2 opacity-30 hover:opacity-100 transition-opacity duration-500">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5">
              <span className="w-1.5 h-1.5 bg-sber-green rounded-full shadow-[0_0_5px_currentColor]"></span>
              <p className="text-[9px] text-zinc-400 font-mono tracking-widest">v2.5.0 • TITAN ENGINE ACTIVE</p>
           </div>
      </div>

      {/* --- MODALS --- */}

      {/* Plan Selection Modal */}
      {showPlanModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-500" onClick={() => setShowPlanModal(false)} />
              <div className="relative w-full max-w-lg glass-strong border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-white/10">
                   <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8 sm:hidden" />
                   
                   <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-bold text-white">Select Strategy</h3>
                            <p className="text-zinc-500 text-xs mt-1">Choose your spending behavior.</p>
                        </div>
                        <button onClick={() => setShowPlanModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><X size={18} /></button>
                   </div>
                   
                   <BudgetPlans user={user} onSelectPlan={handlePlanSelection} />
              </div>
          </div>
      )}

      {/* Wallet Edit Modal */}
      {editingWallet && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-500" onClick={() => setEditingWallet(null)} />
            <div className="relative w-full max-w-sm glass-strong border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
               <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8 sm:hidden" />
               
               <div className="flex items-center justify-between mb-6">
                   <div>
                       <h3 className="text-xl font-bold text-white">Configure Wallet</h3>
                       <p className="text-zinc-500 text-xs mt-1">{editingWallet === 'spending' ? 'Main Spending Source' : 'Savings Destination'}</p>
                   </div>
                   <button onClick={() => setEditingWallet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><X size={18} /></button>
               </div>

               <div className="space-y-6">
                  {/* Bank Grid */}
                  <div className="grid grid-cols-4 gap-3 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                      {RUSSIAN_BANKS.filter(b => b.id !== 'other').map(bank => (
                          <button
                              key={bank.id}
                              onClick={() => {
                                  setTempBankId(bank.id);
                                  setTempName(bank.name);
                                  setTempColor(bank.color);
                              }}
                              className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border duration-300 ${tempBankId === bank.id ? 'bg-white/10 border-sber-green shadow-[0_0_15px_rgba(33,160,56,0.3)] scale-105' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}
                          >
                              {bank.logo ? (
                                  <img 
                                    src={bank.logo} 
                                    alt={bank.name} 
                                    className="w-10 h-10 rounded-full object-cover shadow-lg bg-white p-0.5"
                                  />
                              ) : (
                                  <div 
                                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg"
                                      style={{ backgroundColor: bank.color, color: bank.textColor }}
                                  >
                                      {bank.name.substring(0, 2).toUpperCase()}
                                  </div>
                              )}
                              <span className="text-[9px] text-zinc-400 truncate w-full text-center font-medium">{bank.name}</span>
                          </button>
                      ))}
                      <button
                          onClick={() => setTempBankId('other')}
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border duration-300 ${tempBankId === 'other' ? 'bg-white/10 border-sber-green shadow-[0_0_15px_rgba(33,160,56,0.3)] scale-105' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}
                      >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] bg-zinc-800 text-white border border-white/10">
                              ...
                          </div>
                          <span className="text-[9px] text-zinc-400 font-medium">Custom</span>
                      </button>
                  </div>

                  {/* Custom Inputs */}
                  {tempBankId === 'other' && (
                      <div className="bg-black/40 p-5 rounded-3xl border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div>
                              <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Bank Name</label>
                              <input 
                                  type="text" 
                                  value={tempName} 
                                  onChange={e => setTempName(e.target.value)} 
                                  placeholder="My Bank"
                                  className="w-full bg-black p-4 rounded-2xl border border-white/10 text-white text-sm focus:border-sber-green focus:shadow-[0_0_15px_rgba(33,160,56,0.2)] outline-none transition-all placeholder-zinc-700"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Card Color</label>
                              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                  {['#21A038', '#EF3124', '#002882', '#FFDD2D', '#000000', '#BF5AF2', '#FF9500'].map(c => (
                                      <button
                                          key={c}
                                          onClick={() => setTempColor(c)}
                                          className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${tempColor === c ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`}
                                          style={{ backgroundColor: c }}
                                      />
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  <button 
                      onClick={saveWalletChanges}
                      className="w-full bg-white text-black font-bold py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-gray-200 transition-all active:scale-95 text-sm"
                  >
                      <Check size={18} strokeWidth={2.5} /> Save Changes
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

### File: `components\TitanSimulator.tsx`
```tsx
import React, { useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrainCircuit, Zap, AlertTriangle, Clock, Activity, ShieldAlert, Sparkles, ChevronLeft, ScanLine, Wallet, PiggyBank, Receipt } from 'lucide-react';
import { UserSettings, Transaction, TitanAnalysis } from '../types';
import { analyzeMultiverse, extractItemFromImage } from '../services/titanService';

interface Props {
  user: UserSettings;
  transactions: Transaction[];
  onBack: () => void;
}

export const TitanSimulator: React.FC<Props> = ({ user, transactions, onBack }) => {
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<TitanAnalysis | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalBills = user.recurringBills?.reduce((sum, b) => sum + b.amount, 0) || 0;

  const txt = {
      title: { en: "TITAN ENGINE", ar: "محرك التيتان", ru: "ДВИГАТЕЛЬ ТИТАН" },
      desire: { en: "What do you desire?", ar: "ماذا تريد أن تشتري؟", ru: "Что вы хотите купить?" },
      itemName: { en: "Item Name", ar: "اسم المنتج", ru: "Название товара" },
      itemPlaceholder: { en: "e.g. iPhone 16 Pro", ar: "مثلاً: آيفون 16", ru: "например, iPhone 16" },
      price: { en: "Price", ar: "السعر", ru: "Цена" },
      simulate: { en: "Simulate Future", ar: "محاكاة المستقبل", ru: "Симуляция будущего" },
      collapsing: { en: "Collapsing Timelines...", ar: "جاري تحليل المسارات...", ru: "Анализ временных линий..." },
      scanning: { en: "Scanning...", ar: "جاري المسح...", ru: "Сканирование..." },
      scanBtn: { en: "Scan Tag / Product", ar: "تصوير المنتج / السعر", ru: "Сканировать товар" },
      lifeEnergy: { en: "Life Energy Cost", ar: "تكلفة طاقة الحياة", ru: "Стоимость жизненной энергии" },
      hours: { en: "Hours of Work", ar: "ساعات عمل", ru: "Часов работы" },
      trajectories: { en: "Future Trajectories", ar: "المسارات المستقبلية", ru: "Будущие траектории" },
      risks: { en: "Critical Risks Detected", ar: "مخاطر حرجة مكتشفة", ru: "Обнаружены критические риски" },
      verdict: { en: "Titan Verdict", ar: "حكم التيتان", ru: "Вердикт Титана" },
      newSim: { en: "Run New Simulation", ar: "محاكاة جديدة", ru: "Новая симуляция" },
      quote: { 
          en: "\"The Titan Engine calculates not just the cost of money, but the cost of life energy and opportunity.\"",
          ar: "\"محرك التيتان لا يحسب تكلفة المال فحسب، بل يحسب تكلفة طاقة الحياة والفرص الضائعة.\"",
          ru: "\"Титан рассчитывает не только денежную стоимость, но и затраты жизненной энергии и упущенные возможности.\""
      },
      wallet: { en: "Spending", ar: "صرف", ru: "Расходы" },
      savings: { en: "Savings", ar: "تجميع", ru: "Сбережения" },
      bills: { en: "Bills", ar: "فواتير", ru: "Счета" },
  };

  const t = (key: keyof typeof txt) => txt[key][user.language];

  const handleSimulate = async () => {
    if (!item || !price) return;
    setLoading(true);
    try {
      const analysis = await analyzeMultiverse(user, transactions, item, parseFloat(price));
      setResult(analysis);
    } catch (e) {
      alert(user.language === 'ar' ? "حدث خطأ في المحرك الزمني." : "Temporal engine malfunction.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setScanning(true);
      try {
          const data = await extractItemFromImage(file, user.apiKey);
          if (data.name) setItem(data.name);
          if (data.price) setPrice(data.price.toString());
      } catch (error) {
          alert(user.language === 'ar' ? "فشل تحليل الصورة" : "Failed to scan image");
      } finally {
          setScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const getChartData = () => {
    if (!result) return [];
    const baseTimeline = result.scenarios[0].timeline;
    return baseTimeline.map((point, index) => {
        const collapsePoint = result.scenarios.find(s => s.id === 'collapse')?.timeline[index];
        const warriorPoint = result.scenarios.find(s => s.id === 'warrior')?.timeline[index];
        const wealthPoint = result.scenarios.find(s => s.id === 'wealth')?.timeline[index];
        return {
            date: point.date.slice(5),
            Collapse: collapsePoint?.balance || 0,
            Warrior: warriorPoint?.balance || 0,
            Wealth: wealthPoint?.balance || 0,
        };
    });
  };

  const chartData = getChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-strong border border-purple-500/30 p-4 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          <p className="text-zinc-400 text-xs font-mono mb-2">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                <span className="text-xs font-bold text-white w-20">{p.name}:</span>
                <span className="text-xs font-mono text-white">{Number(p.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    // Changed bg-[#030303] to bg-transparent to show the Nebula background from App.tsx
    <div className="min-h-[85vh] bg-transparent text-white font-sans selection:bg-purple-500/30 pb-32 animate-fade-in" dir={user.language === 'ar' ? 'rtl' : 'ltr'}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
            <button onClick={onBack} className="p-2 glass rounded-full hover:bg-white/10 transition-colors">
                <ChevronLeft size={20} className={user.language === 'ar' ? 'rotate-180' : ''} />
            </button>
            <div className="flex items-center gap-2">
                <BrainCircuit className="text-purple-500 animate-pulse" />
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400 tracking-wider font-mono drop-shadow-md">
                    {t('title')}
                </h2>
            </div>
            <div className="w-10" />
        </div>

        {!result ? (
            <div className="animate-slide-up">
                {/* Input Section */}
                <div className="glass-panel border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-purple-600/20 transition-colors duration-1000"></div>
                    
                    {/* Financial Status Bar */}
                    <div className="flex justify-between items-center gap-2 mb-8 p-3 rounded-2xl bg-black/40 border border-white/5 relative z-10 backdrop-blur-md">
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Wallet size={10} /> {t('wallet')}
                            </span>
                            <span className="text-white font-bold font-mono text-sm tabular-nums">{user.currentBalance.toLocaleString()}</span>
                        </div>
                        <div className="w-[1px] h-8 bg-white/10"></div>
                        <div className="flex-1 flex flex-col items-center">
                                <span className="text-[9px] text-sber-green uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <PiggyBank size={10} /> {t('savings')}
                                </span>
                                <span className="text-sber-green font-bold font-mono text-sm tabular-nums">{user.savingsBalance.toLocaleString()}</span>
                        </div>
                        <div className="w-[1px] h-8 bg-white/10"></div>
                        <div className="flex-1 flex flex-col items-center">
                                <span className="text-[9px] text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Receipt size={10} /> {t('bills')}
                                </span>
                                <span className="text-red-400 font-bold font-mono text-sm tabular-nums">-{totalBills.toLocaleString()}</span>
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-center mb-6 drop-shadow-lg">{t('desire')}</h3>
                    
                    {/* Scan Button */}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full mb-6 py-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center gap-3 text-zinc-400 hover:text-white hover:border-purple-500/50 hover:bg-black/60 transition-all group/scan relative z-10"
                    >
                        {scanning ? (
                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ScanLine size={20} className="group-hover/scan:text-purple-400" />
                        )}
                        <span className="font-bold text-sm tracking-wide">{scanning ? t('scanning') : t('scanBtn')}</span>
                    </button>
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleScanImage} />

                    <div className="space-y-6 relative z-10">
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mx-2 mb-1 block">{t('itemName')}</label>
                            <input 
                                type="text" 
                                value={item}
                                onChange={e => setItem(e.target.value)}
                                placeholder={t('itemPlaceholder')}
                                className="w-full bg-black/50 border border-zinc-800 rounded-2xl p-4 text-white placeholder-zinc-700 focus:border-purple-500 focus:shadow-[0_0_20px_rgba(168,85,247,0.2)] outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mx-2 mb-1 block">{t('price')} ({user.currency})</label>
                            <input 
                                type="number" 
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-black/50 border border-zinc-800 rounded-2xl p-4 text-3xl font-bold text-white placeholder-zinc-800 focus:border-purple-500 outline-none transition-all"
                            />
                        </div>

                        <button 
                            onClick={handleSimulate}
                            disabled={!item || !price || loading}
                            className="w-full h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-bold text-lg tracking-widest uppercase flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:shadow-[0_0_60px_rgba(147,51,234,0.5)] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 text-white"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="animate-pulse">{t('collapsing')}</span>
                                </div>
                            ) : (
                                <>
                                    {t('simulate')} <Zap className="fill-white" size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center px-6">
                    <p className="text-xs text-zinc-500 leading-relaxed font-mono italic">
                        {t('quote')}
                    </p>
                </div>
            </div>
        ) : (
            <div className="space-y-6 animate-slide-up">
                
                {/* 1. Life Energy Card */}
                <div className="glass-panel border border-purple-500/20 rounded-[2rem] p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-purple-500/5 blur-xl"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Activity size={14} /> {t('lifeEnergy')}
                            </h4>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-4xl font-bold text-white tabular-nums drop-shadow-md">{result.lifeEnergy.hoursOfWork.toFixed(1)}</span>
                                <span className="text-sm text-zinc-500 font-bold">{t('hours')}</span>
                            </div>
                            <p className="text-sm text-zinc-300 mt-3 border-l-2 border-purple-500 pl-3 italic">
                                "{result.lifeEnergy.sacrifice}"
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                            <Clock className="text-purple-400" size={24} />
                        </div>
                    </div>
                </div>

                {/* 2. Multiverse Chart */}
                <div className="glass-panel border border-white/5 rounded-[2rem] p-6 shadow-2xl">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Activity size={14} /> {t('trajectories')}
                    </h4>
                    
                    <div className="h-[250px] w-full -ml-2" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCollapse" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorWarrior" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#555" tick={{fontSize: 10}} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#555" tick={{fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <Tooltip content={<CustomTooltip />} />
                                
                                <Area type="monotone" dataKey="Collapse" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCollapse)" />
                                <Area type="monotone" dataKey="Warrior" stroke="#EAB308" strokeWidth={2} fillOpacity={1} fill="url(#colorWarrior)" />
                                <Area type="monotone" dataKey="Wealth" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorWealth)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex justify-between mt-4 px-2" dir="ltr">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                            <span className="text-[10px] text-zinc-400">Collapse</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                            <span className="text-[10px] text-zinc-400">Warrior</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-[10px] text-zinc-400">Wealth</span>
                        </div>
                    </div>
                </div>

                {/* 3. Risks & Verdict */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Risks */}
                    {result.risks.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-[1.5rem] p-5">
                            <h4 className="text-red-500 font-bold text-sm mb-3 flex items-center gap-2">
                                <ShieldAlert size={16} /> {t('risks')}
                            </h4>
                            <div className="space-y-2">
                                {result.risks.map((risk, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-red-300 bg-red-500/5 p-2 rounded-lg">
                                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                        <span>{risk.message} ({risk.date})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Verdict */}
                    <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-[1.5rem] p-6 relative overflow-hidden shadow-lg">
                         <div className="absolute top-0 right-0 p-4 opacity-20 animate-pulse-slow">
                             <Sparkles size={60} />
                         </div>
                         <h4 className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-2">{t('verdict')}</h4>
                         <p className="text-lg font-bold text-white leading-snug drop-shadow-md">
                             "{result.aiVerdict}"
                         </p>
                    </div>
                </div>

                <button 
                    onClick={() => { setResult(null); setItem(''); setPrice(''); }}
                    className="w-full py-4 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold glass"
                >
                    {t('newSim')}
                </button>
            </div>
        )}
    </div>
  );
};
```
---

### File: `components\TransactionItem.tsx`
```tsx
import React from 'react';
import { Transaction, Currency } from '../types';
import { CATEGORIES } from '../constants';
import * as Icons from 'lucide-react';

interface Props {
  transaction: Transaction;
  currency: Currency;
  language: 'en' | 'ar' | 'ru';
}

export const TransactionItem: React.FC<Props> = ({ transaction, currency, language }) => {
  const category = CATEGORIES.find(c => c.id === transaction.category) || CATEGORIES.find(c => c.id === 'general') || CATEGORIES[0];
  const IconComponent = (Icons as any)[category.icon] || Icons.HelpCircle;
  const isExpense = transaction.type === 'expense';
  const categoryName = language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en;
  
  return (
    <div className="group relative glass-card p-4 rounded-[1.8rem] flex items-center justify-between transition-all duration-500 hover:bg-white/5 hover:border-white/15 overflow-hidden active:scale-[0.98]">
      
      {/* Cinematic Shimmer Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none skew-x-12"></div>

      {/* Left Side: Icon & Info */}
      <div className="flex items-center gap-4 relative z-10">
        
        {/* Neon Glow Icon Container */}
        <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center relative transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 border border-white/5"
            style={{ 
                backgroundColor: `${category.color}10`, // 10% opacity
                boxShadow: `0 0 30px -5px ${category.color}25` // Colored Glow
            }}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md" style={{ backgroundColor: category.color }}></div>
            <IconComponent size={22} style={{ color: category.color }} strokeWidth={2.5} className="relative z-10 drop-shadow-md group-hover:text-white transition-colors" />
        </div>
        
        {/* Text Details */}
        <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-white text-base leading-none tracking-wide group-hover:text-primary transition-colors">
              {transaction.vendor || categoryName}
            </h3>
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-zinc-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 backdrop-blur-sm uppercase tracking-wider">
                    {categoryName}
                </span>
                {transaction.note && (
                    <span className="text-[10px] text-zinc-500 truncate max-w-[100px] sm:max-w-[150px] font-medium">
                        • {transaction.note}
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Right Side: Amount */}
      <div className="text-right relative z-10">
        <div className={`font-display font-bold text-lg tabular-nums tracking-tight drop-shadow-lg ${isExpense ? 'text-white' : 'text-secondary'}`}>
            {isExpense ? '-' : '+'}{transaction.amount.toLocaleString()} 
        </div>
        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest font-mono">
            {currency}
        </div>
      </div>
    </div>
  );
};
```
---

### File: `components\TransactionsPage.tsx`
```tsx
import React, { useState } from 'react';
import { List, Search, X, Filter, ArrowDownLeft, ArrowUpRight, Calendar, Sparkles } from 'lucide-react';
import { Transaction, UserSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { TransactionItem } from './TransactionItem';

interface Props {
  user: UserSettings;
  transactions: Transaction[];
}

type FilterType = 'all' | 'income' | 'expense';

export const TransactionsPage: React.FC<Props> = ({ user, transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const t = TRANSLATIONS[user.language];

  // Smart Filtering Logic
  const getFilteredTransactions = () => {
      return transactions.filter(t => {
        const matchesSearch = !searchTerm || (
            (t.vendor && t.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        const matchesType = filterType === 'all' || t.type === filterType;
        return matchesSearch && matchesType;
      });
  };

  const filteredData = getFilteredTransactions();

  // Grouping
  const getGroupedTransactions = () => {
    const sorted = [...filteredData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: Record<string, Transaction[]> = {};
    sorted.forEach(tx => {
      const dateKey = tx.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    return Object.keys(groups).map(date => ({ date, items: groups[date] }));
  };

  const FilterChip = ({ type, label, icon: Icon }: { type: FilterType, label: string, icon?: any }) => (
      <button
        onClick={() => setFilterType(type)}
        className={`
            relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 active:scale-95 border
            ${filterType === type 
            ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105' 
            : 'glass-card text-zinc-400 border-transparent hover:border-white/10 hover:text-white'
            }
        `}
      >
        {Icon && <Icon size={14} />}
        {label}
        {filterType === type && <div className="absolute inset-0 bg-white blur-md opacity-20 rounded-full animate-pulse"></div>}
      </button>
  );

  return (
    <div className="pb-32 min-h-[80vh] pt-2">
      
      {/* Sticky Header Area */}
      <div className="sticky top-0 z-30 glass-card border-b border-white/5 pb-5 pt-4 -mx-4 px-6 mb-6 rounded-b-[2rem] shadow-2xl backdrop-blur-xl transition-all">
          <div className="flex flex-col gap-5 animate-slide-up-fade">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full animate-pulse-glow"></div>
                        <List className="w-6 h-6 text-primary relative z-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-display font-bold text-white leading-none tracking-wide text-glow">
                            {t.transactions}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_5px_#10B981]"></span>
                            <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">{filteredData.length} RECORDS</p>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Neon Search Bar */}
              <div className="relative group">
                 <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                 <div className="relative bg-[#0F0E17] border border-white/10 rounded-2xl flex items-center shadow-inner group-focus-within:border-primary/50 transition-colors">
                     <div className="pl-4 pr-3 text-zinc-500 group-focus-within:text-primary transition-colors">
                        <Search size={18} />
                     </div>
                     <input 
                        type="text" 
                        placeholder={user.language === 'ar' ? "بحث..." : "Search history..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent py-4 text-white text-sm placeholder-zinc-600 focus:outline-none font-medium"
                     />
                     {searchTerm && (
                         <button onClick={() => setSearchTerm('')} className="p-3 text-zinc-500 hover:text-white transition-colors">
                             <X size={16} />
                         </button>
                     )}
                 </div>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                 <FilterChip type="all" label={user.language === 'ar' ? 'الكل' : 'All'} icon={Filter} />
                 <FilterChip type="expense" label={t.expense} icon={ArrowUpRight} />
                 <FilterChip type="income" label={t.income} icon={ArrowDownLeft} />
              </div>
          </div>
      </div>

      {/* Stats Summary (Conditional) */}
      {(searchTerm || filterType !== 'all') && (
        <div className="grid grid-cols-2 gap-3 mb-8 animate-scale-in px-2">
            <div className="glass-card p-5 rounded-[2rem] relative overflow-hidden group hover:border-secondary/30 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ArrowDownLeft size={48} className="text-secondary" />
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Income</p>
                    <p className="text-secondary font-display font-bold text-xl tabular-nums drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        +{filteredData.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0).toLocaleString()}
                    </p>
                </div>
            </div>
            <div className="glass-card p-5 rounded-[2rem] relative overflow-hidden group hover:border-red-500/30 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ArrowUpRight size={48} className="text-red-500" />
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Expense</p>
                    <p className="text-white font-display font-bold text-xl tabular-nums">
                        -{filteredData.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
      )}
      
      {/* Timeline List */}
      <div className="space-y-8 relative">
        {/* Timeline Vertical Line */}
        <div className="absolute left-[27px] top-4 bottom-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent"></div>

        {getGroupedTransactions().map((group, groupIdx) => {
            const date = new Date(group.date);
            return (
            <div key={group.date} className="animate-slide-up-fade" style={{ animationDelay: `${groupIdx * 100}ms` }}>
                
                {/* Date Header */}
                <div className="flex items-center gap-4 mb-4 pl-2 sticky top-48 z-10">
                    <div className="w-12 h-12 rounded-2xl glass-card flex flex-col items-center justify-center text-white shadow-lg border border-white/10 relative z-20 backdrop-blur-md">
                        <span className="text-lg font-display font-bold leading-none">{date.getDate()}</span>
                        <span className="text-[8px] font-bold text-zinc-500 uppercase">{date.toLocaleDateString(user.language, { weekday: 'short' })}</span>
                    </div>
                    <div className="glass-card px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                        <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
                            {date.toLocaleDateString(user.language, { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-3 pl-8 pr-1">
                {group.items.map((tx, itemIdx) => (
                    <div key={tx.id} className="animate-slide-up-fade" style={{ animationDelay: `${(groupIdx * 100) + (itemIdx * 50)}ms` }}>
                        <TransactionItem transaction={tx} currency={user.currency} language={user.language} />
                    </div>
                ))}
                </div>
            </div>
            );
        })}
      </div>
      
      {/* Empty State */}
      {filteredData.length === 0 && (
         <div className="flex flex-col items-center justify-center py-24 text-zinc-600 animate-scale-in">
             <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 glass-card border-dashed border-zinc-700">
                <Sparkles size={32} className="text-zinc-600 animate-pulse" />
             </div>
             <p className="text-sm font-display font-bold text-zinc-500 tracking-wide">No transactions found</p>
         </div>
      )}
    </div>
  );
};
```
---

### File: `public\manifest.json`
```json
{
  "short_name": "Masareefy",
  "name": "Masareefy: Smart Finance",
  "description": "Smart income and expense manager with AI receipt analysis.",
  "id": "/",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#030014",
  "background_color": "#030014",
  "icons": [
    {
      "src": "/app.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/app.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```
---

### File: `services\firebase.ts`
```ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, reauthenticateWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { UserSettings, Transaction } from "../types";

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

// Initialize Firestore
const db = getFirestore(app);

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const reauthenticateUser = async () => {
  try {
    if (auth.currentUser) {
      await reauthenticateWithPopup(auth.currentUser, googleProvider);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Re-authentication failed", error);
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

// --- Firestore Helpers ---

export const saveUserData = async (uid: string, userData: UserSettings, transactions?: Transaction[]) => {
  try {
    await setDoc(doc(db, "users", uid), {
      settings: userData,
      // We store transactions in the same doc for simplicity in this version, 
      // or you could use a subcollection. Storing inside main doc for now to save reads.
      transactions: transactions || [] 
    }, { merge: true });
  } catch (e) {
    console.error("Error saving user data: ", e);
  }
};

export const getUserData = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as { settings: UserSettings, transactions: Transaction[] };
    } else {
      return null;
    }
  } catch (e) {
    console.error("Error fetching user data: ", e);
    return null;
  }
};

export const deleteUserAccount = async (uid: string) => {
  try {
    // 1. Delete Firestore Data
    await deleteDoc(doc(db, "users", uid));

    // 2. Delete Auth User
    const user = auth.currentUser;
    if (user) {
      await user.delete();
    }
  } catch (error) {
    console.error("Error deleting account", error);
    throw error;
  }
};

export { auth, db };
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

export interface MagicInputResult {
  amount: number;
  category: string;
  vendor: string;
  date: string;
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

// --- 1. Magic Input Analysis ---
export const parseMagicInput = async (
  text: string, 
  apiKey: string, 
  language: string
): Promise<MagicInputResult> => {
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze this financial text: "${text}".
    Extract:
    1. Amount (number)
    2. Category (Infer strictly from the list below).
    3. Vendor (e.g. "KFC", "Uber", "Boss")
    4. Type (expense or income)
    5. Date (YYYY-MM-DD) - Default to today ${new Date().toISOString().split('T')[0]} if not specified.

    Language context: ${language}.
    
    ALLOWED CATEGORIES (IDs):
    food, groceries, transport, housing, utilities, health, education, travel, entertainment, shopping, personal_care, subscriptions, debt, gifts, salary, transfer, general.

    RULES:
    - If it's a utility bill (electricity, internet, water), use 'utilities'.
    - If it doesn't fit specific categories, use 'general'.
    - Do NOT invent new categories.

    Return JSON: { "amount": number, "category": string, "vendor": string, "type": "expense"|"income", "date": "YYYY-MM-DD" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    });
    return JSON.parse(cleanJson(response.text || '{}')) as MagicInputResult;
  } catch (e) {
    throw new Error("Magic input failed");
  }
};

// --- 2. Deep Financial Analysis ---
export const getDeepFinancialAnalysis = async (
  transactions: Transaction[],
  balance: number,
  currency: string,
  language: string,
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });

  const summary = {
    currentBalance: balance,
    currency,
    transactions: transactions.slice(0, 30).map(t => ({
      date: t.date,
      amount: t.amount,
      cat: t.category,
      type: t.type
    }))
  };

  const prompt = `
    Act as a senior financial advisor.
    Data: ${JSON.stringify(summary)}
    
    Task: Provide a strict, professional report.
    1. **Status**: Health check.
    2. **Burn Rate**: When will money run out?
    3. **Leaks**: Identify bad spending habits.
    4. **Advice**: 3 actionable steps.

    Language: ${language === 'ar' ? 'Arabic' : 'English'}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    });
    return response.text || "Report generation failed.";
  } catch (primaryError) {
    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [{ text: prompt }] },
        });
        return response.text || "Fallback report failed.";
    } catch (e) { throw e; }
  }
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  const ai = new GoogleGenAI({ apiKey });
  try {
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: 'Test' }] },
    });
    return true;
  } catch {
    try {
        await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [{ text: 'Test' }] },
        });
        return true;
    } catch { return false; }
  }
};

// --- 3. Onboarding Analysis ---
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
    Analyze these financial images for onboarding.
    1. Image 1 (Balance): Extract the total available balance number.
    2. Image 2 (Salary Slip/Notif): CRITICAL -> Extract the AMOUNT and the EXACT DATE of payment (YYYY-MM-DD).
    3. Others: Receipts/Expenses.

    Language: ${language}.
    
    ALLOWED CATEGORIES for transactions:
    food, groceries, transport, housing, utilities, health, education, travel, entertainment, shopping, personal_care, subscriptions, debt, gifts, salary, transfer, general.

    RULES:
    - Map expenses STRICTLY to the list above.
    - Use 'general' if unclear. Do NOT default to 'utilities' unless it's a bill.

    Return strictly JSON:
    {
      "currentBalance": number,
      "lastSalary": { "amount": number, "date": "YYYY-MM-DD" },
      "transactions": [{ "amount": number, "date": "YYYY-MM-DD", "vendor": string, "category": string, "type": "expense" | "income" }]
    }
  `;

  if (balanceFile) parts.push(await fileToGenerativePart(balanceFile));
  if (salaryFile) parts.push(await fileToGenerativePart(salaryFile));
  for (const file of expenseFiles) parts.push(await fileToGenerativePart(file));
  parts.push({ text: promptContext });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    const result = JSON.parse(cleanJson(response.text || '{}')) as OnboardingAnalysisResult;
    result.transactions = result.transactions.map(t => ({ ...t, category: t.category.toLowerCase() }));
    return result;
  } catch (primaryError) {
    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts },
        });
        const result = JSON.parse(cleanJson(response.text || '{}')) as OnboardingAnalysisResult;
        result.transactions = result.transactions.map(t => ({ ...t, category: t.category.toLowerCase() }));
        return result;
    } catch (e) { throw e; }
  }
};

// --- 4. Receipt Analysis ---
export const analyzeReceipt = async (
  file: File, 
  apiKey: string,
  language: string
): Promise<ReceiptAnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(file);

  const prompt = `
    Analyze this receipt/invoice.
    Extract:
    1. Amount (number)
    2. Date (YYYY-MM-DD)
    3. Vendor Name
    4. Category (Choose STRICTLY from the list below).
    5. Type (income/expense)

    ALLOWED CATEGORIES:
    food, groceries, transport, housing, utilities, health, education, travel, entertainment, shopping, personal_care, subscriptions, debt, gifts, salary, transfer, general.

    CRITICAL RULES:
    - Use 'utilities' ONLY for: Electricity, Water, Internet, Phone bills.
    - Use 'food' for restaurants, 'groceries' for supermarkets.
    - If unsure, use 'general'.

    Return JSON: { "amount": number, "date": "YYYY-MM-DD", "vendor": string, "category": string, "type": "income"|"expense" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    const result = JSON.parse(cleanJson(response.text || '{}')) as ReceiptAnalysisResult;
    if (result.category) result.category = result.category.toLowerCase();
    return result;
  } catch (primaryError) {
    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [imagePart, { text: prompt }] },
        });
        const result = JSON.parse(cleanJson(response.text || '{}')) as ReceiptAnalysisResult;
        if (result.category) result.category = result.category.toLowerCase();
        return result;
    } catch (e) { throw e; }
  }
};
```
---

### File: `services\titanService.ts`
```ts
import { GoogleGenAI } from "@google/genai";
import { Transaction, UserSettings, TitanAnalysis } from "../types";

const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// Helper for image processing
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

// --- 1. Vision: Extract Item & Price ---
export const extractItemFromImage = async (
  file: File,
  apiKey: string
): Promise<{ name: string; price: number }> => {
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(file);

  const prompt = `
    Analyze this image (price tag, product page, or receipt).
    Extract:
    1. Item Name (short and concise, e.g., "Sony Headphones").
    2. Price (numeric value only, ignore currency symbol).

    Return STRICT JSON: { "name": "string", "price": number }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (error) {
    console.error("Titan Vision Error:", error);
    throw new Error("Failed to scan image.");
  }
};

// --- 2. Titan Core: Multiverse Analysis ---
export const analyzeMultiverse = async (
  user: UserSettings,
  history: Transaction[],
  itemName: string,
  itemPrice: number
): Promise<TitanAnalysis> => {
  if (!user.apiKey) throw new Error("API Key missing");
  
  const ai = new GoogleGenAI({ apiKey: user.apiKey });

  // 1. Analyze Real Habits (Not Assumptions)
  const expenseStats: Record<string, number> = {};
  history.filter(t => t.type === 'expense').forEach(t => {
      const key = t.vendor ? t.vendor : t.category;
      expenseStats[key] = (expenseStats[key] || 0) + t.amount;
  });
  
  // Get top 3 money leaks
  const topHabits = Object.entries(expenseStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, amount]) => `${name} (${amount})`)
      .join(', ');

  // 2. Prepare Financial Context
  const today = new Date().toISOString().split('T')[0];
  const monthlyBills = user.recurringBills?.reduce((sum, b) => sum + b.amount, 0) || 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const spendingHistory = history
    .filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  const context = {
    spendingBalance: user.currentBalance, // Spending Wallet
    savingsBalance: user.savingsBalance, // Savings Wallet (Added)
    currency: user.currency,
    salary: user.lastSalaryAmount || 0,
    salaryDate: user.nextSalaryDate || "Unknown",
    monthlyFixedBills: monthlyBills,
    avgMonthlySpending: spendingHistory,
    topHabits: topHabits || "General Spending", 
    itemToBuy: itemName,
    itemPrice: itemPrice,
    today: today,
    language: user.language
  };

  const prompt = `
    Act as a "Titan Financial Simulator". I want to simulate the impact of buying "${itemName}" for ${itemPrice} ${user.currency}.
    
    Context: ${JSON.stringify(context)}
    
    CRITICAL INSTRUCTIONS:
    1. **Language**: The output JSON values MUST be in ${user.language === 'ar' ? 'Arabic' : user.language === 'ru' ? 'Russian' : 'English'}.
    2. **Habits**: Use "topHabits" (${context.topHabits}) for specific sacrifice suggestions.
    3. **Wallets Logic**: 
       - User has "Spending Wallet" (${context.spendingBalance}) and "Savings Wallet" (${context.savingsBalance}).
       - If 'itemPrice' > 'spendingBalance', the purchase implies **dipping into SAVINGS**. This is a major risk. Mention it in "Risks" and "The Collapse" description.
       - In "Wealth" scenario, simulate adding 'itemPrice' TO the existing 'savingsBalance' to show total potential growth (Compound interest effect on the total nest egg).
    
    Task: Generate a JSON report with 3 distinct timelines (3 months projection) and life energy analysis.

    1. **Scenario 1: Collapse (Red)**
       - User buys the item NOW.
       - If spending balance drops below 0, show it dropping into negative or indicate Savings depletion.
       - Event Label: "Savings Breach ⚠️" if savings are touched.
    
    2. **Scenario 2: Warrior (Yellow)**
       - User buys the item NOW.
       - But adopts "Austerity Mode" to recover the spent amount without touching savings if possible.
    
    3. **Scenario 3: Wealth (Green)**
       - User DOES NOT buy.
       - User invests this amount + keeps existing savings.
       - Show the trajectory of TOTAL Savings (${context.savingsBalance} + ${itemPrice}) growing over 3 months.

    4. **Life Energy**:
       - Calculate hours of work based on salary (${context.salary}). 
       - Suggest a SPECIFIC sacrifice based on "topHabits".

    5. **Risks**:
       - Will buying this cause missing a bill? (Bills total: ${monthlyBills}).
       - Will this break the savings lock?

    Return STRICT JSON matching this interface:
    {
      "scenarios": [
        { 
            "id": "collapse", 
            "name": "Name in User Lang", 
            "description": "Description in User Lang (Mention savings breach if applicable)", 
            "color": "#EF4444", 
            "finalBalance": number,
            "timeline": [{"date": "YYYY-MM-DD", "balance": number, "event": string | null}] 
        },
        { 
            "id": "warrior", 
            "name": "Name in User Lang", 
            "description": "Description in User Lang", 
            "color": "#EAB308", 
            "finalBalance": number,
            "timeline": [...] 
        },
        { 
            "id": "wealth", 
            "name": "Name in User Lang", 
            "description": "Description in User Lang", 
            "color": "#22C55E", 
            "finalBalance": number,
            "timeline": [...] 
        }
      ],
      "risks": [
        { "billName": string, "date": string, "severity": "high"|"critical", "message": "Message in User Lang" }
      ],
      "lifeEnergy": {
        "hoursOfWork": number,
        "daysOfLife": number,
        "sacrifice": "Sacrifice Advice in User Lang"
      },
      "aiVerdict": "Short advice in User Lang (max 20 words)."
    }

    Generate 10-15 timeline points per scenario.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    });

    const text = response.text || "{}";
    return JSON.parse(cleanJson(text)) as TitanAnalysis;
    
  } catch (error) {
    console.error("Titan Service Error:", error);
    throw new Error("Titan Simulation Failed.");
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
import React, { useState, useEffect } from 'react';
import { Globe, BrainCircuit } from 'lucide-react';
import { UserSettings, Transaction, ViewState, TransactionType, BudgetPlan, RecurringBill, WalletType } from './types';
import { TRANSLATIONS } from './constants';
import { OnboardingAnalysisResult } from './services/geminiService';
import { logoutUser, auth, saveUserData } from './services/firebase';

// Components
import { Dashboard } from './components/Dashboard';
import { Onboarding } from './components/Onboarding';
import { AIAdvisor } from './components/AIAdvisor';
import { Reports } from './components/Reports';
import { TransactionsPage } from './components/TransactionsPage';
import { AddTransactionPage } from './components/AddTransactionPage';
import { SettingsPage } from './components/SettingsPage';
import { Navigation } from './components/Navigation';
import { TitanSimulator } from './components/TitanSimulator';

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
        currentBalance: 0,
        savingsBalance: 0,
        spendingBankName: 'Main Bank',
        spendingBankColor: '#1C1C1E',
        spendingTextColor: '#FFFFFF',
        savingsBankName: 'Savings',
        savingsBankColor: '#21A038',
        savingsTextColor: '#FFFFFF',
        lastSalaryDate: undefined,
        salaryInterval: 30
      };
    } catch (e) {
      return {
        name: '',
        apiKey: '',
        currency: 'USD',
        language: 'en',
        isOnboarded: false,
        isGuest: false,
        currentBalance: 0,
        savingsBalance: 0,
        spendingBankName: 'Main Bank',
        spendingBankColor: '#1C1C1E',
        spendingTextColor: '#FFFFFF',
        savingsBankName: 'Savings',
        savingsBankColor: '#21A038',
        savingsTextColor: '#FFFFFF',
        lastSalaryDate: undefined,
        salaryInterval: 30
      };
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('masareefy_txs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [currentView, setCurrentView] = useState<ViewState>(user.isOnboarded ? 'dashboard' : 'onboarding');

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('masareefy_user', JSON.stringify(user));
    if (user.isOnboarded && !user.isGuest && auth.currentUser) {
        saveUserData(auth.currentUser.uid, user, transactions);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('masareefy_txs', JSON.stringify(transactions));
    if (user.isOnboarded && !user.isGuest && auth.currentUser) {
        saveUserData(auth.currentUser.uid, user, transactions);
    }
  }, [transactions]);

  useEffect(() => {
    document.documentElement.dir = user.language === 'ar' ? 'rtl' : 'ltr';
  }, [user.language]);

  const t = TRANSLATIONS[user.language];

  // --- Logic Handlers ---

  const handleRestoreData = (settings: UserSettings, txs: Transaction[]) => {
     setUser(settings);
     setTransactions(txs);
     setCurrentView('dashboard');
  };

  const handleOnboardingComplete = (
      result: OnboardingAnalysisResult, 
      nextSalaryDate: string, 
      nextSalaryAmount: number, 
      bills: RecurringBill[],
      savingsBalance: number,
      spendingBank: { name: string, color: string, textColor: string },
      savingsBank: { name: string, color: string, textColor: string }
  ) => {
    const newTransactions = result.transactions.map((tx, idx) => ({
      id: `init-${idx}`,
      amount: tx.amount,
      date: tx.date,
      vendor: tx.vendor,
      category: tx.category,
      type: tx.type === 'expense' ? TransactionType.EXPENSE : TransactionType.INCOME,
      wallet: 'spending' as WalletType,
      note: 'Imported'
    }));

    newTransactions.push({
      id: 'init-salary',
      amount: result.lastSalary.amount,
      date: result.lastSalary.date,
      vendor: 'Salary Deposit',
      category: 'salary',
      type: TransactionType.INCOME,
      wallet: 'spending' as WalletType,
      note: 'Last Salary'
    });

    if (savingsBalance > 0) {
        newTransactions.push({
            id: 'init-savings',
            amount: savingsBalance,
            date: new Date().toISOString().split('T')[0],
            vendor: 'Initial Savings',
            category: 'salary',
            type: TransactionType.INCOME,
            wallet: 'savings' as WalletType,
            note: 'Initial Balance'
        });
    }

    const newUserSettings: UserSettings = {
      ...user,
      isOnboarded: true,
      currentBalance: result.currentBalance,
      savingsBalance: savingsBalance,
      spendingBankName: spendingBank.name,
      spendingBankColor: spendingBank.color,
      spendingTextColor: spendingBank.textColor,
      savingsBankName: savingsBank.name,
      savingsBankColor: savingsBank.color,
      savingsTextColor: savingsBank.textColor,
      lastSalaryAmount: result.lastSalary.amount,
      lastSalaryDate: result.lastSalary.date,
      nextSalaryDate: nextSalaryDate,
      recurringBills: bills
    };

    setTransactions(newTransactions);
    setUser(newUserSettings);
    setCurrentView('dashboard');

    if (auth.currentUser) {
        saveUserData(auth.currentUser.uid, newUserSettings, newTransactions);
    }
  };

  const handlePlanSelection = (plan: BudgetPlan) => {
    setUser(u => ({ ...u, selectedPlan: plan.type, dailyLimit: plan.dailyLimit }));
    alert(`Active Plan: ${plan.type.toUpperCase()}`);
  };

  const handleUpdateBankName = (wallet: WalletType, newName: string) => {
      setUser(prev => ({
          ...prev,
          [wallet === 'spending' ? 'spendingBankName' : 'savingsBankName']: newName
      }));
  };

  const handlePayBill = (billId: string, date: string, deduct: boolean) => {
    const bill = user.recurringBills?.find(b => b.id === billId);
    if (!bill) return;

    const updatedBills = user.recurringBills?.map(b => 
       b.id === billId ? { ...b, lastPaidDate: date } : b
    );
    setUser(u => ({ ...u, recurringBills: updatedBills }));

    if (deduct) {
       const newTx: Transaction = {
          id: `bill-${Date.now()}`,
          amount: bill.amount,
          date: date,
          category: 'utilities',
          vendor: bill.name,
          note: 'Fixed Bill',
          type: TransactionType.EXPENSE,
          wallet: 'spending',
          isRecurring: true
       };
       setTransactions(prev => [newTx, ...prev]);
       setUser(prev => ({ ...prev, currentBalance: prev.currentBalance - bill.amount }));
    }
  };

  const handleAddBill = (name: string, amount: number) => {
    const newBill: RecurringBill = { id: Date.now().toString(), name, amount };
    setUser(prev => ({
        ...prev,
        recurringBills: [...(prev.recurringBills || []), newBill]
    }));
  };

  const handleDeleteBill = (id: string) => {
    if (confirm('Delete this bill?')) {
        setUser(prev => ({
            ...prev,
            recurringBills: (prev.recurringBills || []).filter(b => b.id !== id)
        }));
    }
  };

  const handleLogout = async () => {
      await logoutUser();
      localStorage.removeItem('masareefy_user');
      localStorage.removeItem('masareefy_txs');
      window.location.reload();
  };

  const handleSaveTransaction = (newTx: Transaction, transferAmount: number = 0) => {
    
    if (transferAmount > 0) {
        const transferOut: Transaction = {
            id: `transfer-out-${Date.now()}`,
            amount: transferAmount,
            date: newTx.date,
            category: 'transfer',
            vendor: 'Transfer to Spending',
            note: 'Auto-cover deficit',
            type: TransactionType.EXPENSE,
            wallet: 'savings'
        };
        const transferIn: Transaction = {
            id: `transfer-in-${Date.now()}`,
            amount: transferAmount,
            date: newTx.date,
            category: 'transfer',
            vendor: 'From Savings',
            note: 'Auto-cover deficit',
            type: TransactionType.INCOME,
            wallet: 'spending'
        };
        
        setTransactions(prev => [transferIn, transferOut, ...prev]);
        
        setUser(prev => ({
            ...prev,
            savingsBalance: prev.savingsBalance - transferAmount,
            currentBalance: prev.currentBalance + transferAmount
        }));
    }

    setTransactions(prev => [newTx, ...prev]);

    setUser(prev => {
        let newSpending = prev.currentBalance;
        let newSavings = prev.savingsBalance;

        if (newTx.wallet === 'spending') {
            if (newTx.type === TransactionType.INCOME) newSpending += newTx.amount;
            else newSpending -= newTx.amount;
        } else {
            if (newTx.type === TransactionType.INCOME) newSavings += newTx.amount;
            else newSavings -= newTx.amount;
        }

        let updatedLastSalaryDate = prev.lastSalaryDate;
        
        if (newTx.type === TransactionType.INCOME && newTx.wallet === 'spending' && newTx.amount > 100) {
            updatedLastSalaryDate = newTx.date;
        }

        return {
            ...prev,
            currentBalance: newSpending,
            savingsBalance: newSavings,
            lastSalaryDate: updatedLastSalaryDate
        };
    });

    setCurrentView('dashboard');
  };

  if (currentView === 'onboarding') {
    return <Onboarding user={user} setUser={setUser} onComplete={handleOnboardingComplete} onRestore={handleRestoreData} />;
  }

  return (
    // Clean, transparent container allowing global Aurora background to shine through
    <div className="min-h-screen bg-transparent text-white relative overflow-hidden font-sans selection:bg-primary/30 pb-40">
      
      {/* Header */}
      {currentView !== 'add' && (
        <div className="sticky top-0 z-40 glass-card border-b border-white/5 shadow-lg transition-all duration-300 rounded-b-3xl mx-2 mt-2">
          <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
            {/* User Profile */}
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-2xl shadow-md border border-white/10 object-cover" />
              ) : (
                  <div className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center text-sm font-bold shadow-md border border-white/10 font-display">
                  {user.name.charAt(0) || 'U'}
                  </div>
              )}
              <div className="flex flex-col">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none mb-1">{t.welcome}</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold font-display text-base tracking-wide text-white leading-none">{user.name.split(' ')[0]}</p>
                  {user.isGuest && <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 font-bold">GUEST</span>}
                </div>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
                {/* Titan Simulator Capsule */}
                <button 
                  onClick={() => setCurrentView('simulator')}
                  className="relative group flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-primary/40 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:border-primary transition-all active:scale-95 overflow-hidden"
                >
                    {/* Glowing Pulse Background */}
                    <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>
                    
                    <BrainCircuit size={16} className="text-primary group-hover:text-white transition-colors relative z-10" />
                    <span className="text-[10px] font-bold text-primary/80 group-hover:text-white uppercase tracking-wider relative z-10 hidden sm:block">Titan</span>
                </button>

                {/* Language Switcher */}
                <button 
                    onClick={() => setUser(u => ({...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en'}))}
                    className="w-10 h-10 flex items-center justify-center rounded-full glass-card hover:bg-white/10 active:scale-90 transition-all group"
                >
                  <Globe className="text-zinc-400 group-hover:text-white w-5 h-5 transition-colors" />
                </button>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-md mx-auto">
        <div key={currentView} className="animate-slide-up-fade px-4 pt-6">
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
              onUpdateBankName={handleUpdateBankName}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsPage user={user} transactions={transactions} />
          )}

          {currentView === 'add' && (
            <AddTransactionPage 
                user={user} 
                transactions={transactions} 
                onSave={handleSaveTransaction} 
                onBack={() => setCurrentView('dashboard')} 
            />
          )}

          {currentView === 'reports' && (
            <Reports transactions={transactions} language={user.language} />
          )}

          {currentView === 'settings' && (
            <SettingsPage user={user} setUser={setUser} onLogout={handleLogout} />
          )}

          {currentView === 'ai-advisor' && (
            <AIAdvisor user={user} transactions={transactions} onClose={() => setCurrentView('dashboard')} />
          )}

          {/* New Titan Simulator View */}
          {currentView === 'simulator' && (
            <TitanSimulator 
              user={user} 
              transactions={transactions} 
              onBack={() => setCurrentView('dashboard')} 
            />
          )}
        </div>
      </main>

      <Navigation currentView={currentView} onNavigate={setCurrentView} />
    </div>
  );
};

export default App;
```
---

### File: `constants.tsx`
```tsx
import { ExpenseCategory } from './types';
import { ShoppingCart, Utensils, Car, Home, Zap, HeartPulse, GraduationCap, Plane, Gift, Briefcase, Clapperboard, ShoppingBag, Smile, Repeat, Banknote, ArrowRightLeft, LayoutGrid } from 'lucide-react';

export const CATEGORIES: ExpenseCategory[] = [
  { id: 'food', name_en: 'Food & Dining', name_ar: 'طعام ومطاعم', name_ru: 'Еда и напитки', icon: 'Utensils', color: '#FF9F1C' }, // Neon Orange
  { id: 'groceries', name_en: 'Groceries', name_ar: 'بقالة / سوبرماركت', name_ru: 'Продукты', icon: 'ShoppingCart', color: '#2EC4B6' }, // Neon Teal
  { id: 'transport', name_en: 'Transport', name_ar: 'نقل ومواصلات', name_ru: 'Транспорт', icon: 'Car', color: '#3A86FF' }, // Neon Blue
  { id: 'housing', name_en: 'Housing', name_ar: 'سكن / إيجار', name_ru: 'Жилье', icon: 'Home', color: '#8338EC' }, // Electric Purple
  { id: 'utilities', name_en: 'Utilities', name_ar: 'فواتير وخدمات', name_ru: 'Коммунальные', icon: 'Zap', color: '#FFBD00' }, // Neon Yellow
  { id: 'health', name_en: 'Health', name_ar: 'صحة وعلاج', name_ru: 'Здоровье', icon: 'HeartPulse', color: '#FF006E' }, // Neon Pink
  { id: 'education', name_en: 'Education', name_ar: 'تعليم', name_ru: 'Образование', icon: 'GraduationCap', color: '#4CC9F0' }, // Bright Sky
  { id: 'travel', name_en: 'Travel', name_ar: 'سفر وسياحة', name_ru: 'Путешествия', icon: 'Plane', color: '#7209B7' }, // Deep Neon Purple
  { id: 'entertainment', name_en: 'Entertainment', name_ar: 'ترفيه وتسلية', name_ru: 'Развлечения', icon: 'Clapperboard', color: '#F72585' }, // Neon Magenta
  { id: 'shopping', name_en: 'Shopping', name_ar: 'تسوق وملابس', name_ru: 'Шопинг', icon: 'ShoppingBag', color: '#F15BB5' }, // Bubblegum Pink
  { id: 'personal_care', name_en: 'Personal Care', name_ar: 'عناية شخصية', name_ru: 'Личный уход', icon: 'Smile', color: '#9B5DE5' }, // Light Purple
  { id: 'subscriptions', name_en: 'Subscriptions', name_ar: 'اشتراكات', name_ru: 'Подписки', icon: 'Repeat', color: '#00BBF9' }, // Azure
  { id: 'debt', name_en: 'Loans & Debt', name_ar: 'قروض وديون', name_ru: 'Кредиты', icon: 'Banknote', color: '#EF476F' }, // Coral
  { id: 'gifts', name_en: 'Gifts & Charity', name_ar: 'هدايا وتبرعات', name_ru: 'Подарки', icon: 'Gift', color: '#FF5400' }, // Safety Orange
  { id: 'salary', name_en: 'Salary / Income', name_ar: 'راتب / دخل', name_ru: 'Зарплата', icon: 'Briefcase', color: '#06D6A0' }, // Neon Mint
  { id: 'transfer', name_en: 'Transfer', name_ar: 'تحويلات مالية', name_ru: 'Переводы', icon: 'ArrowRightLeft', color: '#118AB2' }, // Blue
  { id: 'general', name_en: 'General / Other', name_ar: 'عام / أخرى', name_ru: 'Разное', icon: 'LayoutGrid', color: '#9CA3AF' }, // Gray
];

export const RUSSIAN_BANKS = [
  { id: 'sber', name: 'Sberbank', color: '#21A038', textColor: '#FFFFFF', logo: '/banks/sber.png' },
  { id: 'tinkoff', name: 'T-Bank', color: '#FFDD2D', textColor: '#000000', logo: '/banks/Tinkif.png' },
  { id: 'alpha', name: 'Alfa-Bank', color: '#FF453A', textColor: '#FFFFFF', logo: '/banks/alpha.png' }, // Brighter Red
  { id: 'vtb', name: 'VTB', color: '#2F80ED', textColor: '#FFFFFF', logo: '/banks/vtb.png' }, // Brighter Blue
  { id: 'gazprom', name: 'Gazprombank', color: '#007AFF', textColor: '#FFFFFF', logo: '/banks/gazprom.png' }, // Brighter Blue
  { id: 'ozon', name: 'Ozon Bank', color: '#005BFF', textColor: '#FFFFFF', logo: '/banks/ozon.png' },
  { id: 'wb', name: 'Wildberries', color: '#E01E84', textColor: '#FFFFFF', logo: '/banks/wildberries.png' }, // Brighter Purple
  { id: 'psb', name: 'PSB', color: '#FF6B00', textColor: '#FFFFFF', logo: '/banks/psb.png' }, // Brighter Orange
  { id: 'spb', name: 'Bank St. Petersburg', color: '#FF3B30', textColor: '#FFFFFF', logo: '/banks/sankt.png' }, // Red
  { id: 'other', name: 'Custom Bank', color: '#1C1C1E', textColor: '#FFFFFF', logo: null },
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
    step_recurring_empty: "No bills added yet.",
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
    analyzing: "AI Analyzing Receipt...",
    save: "Save Transaction",
    cancel: "Cancel",
    confirm: "Confirm",
    category: "Category",
    amount: "Amount",
    date: "Date",
    vendor: "Vendor / Store",
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
    step_recurring_empty: "لم تتم إضافة فواتير بعد.",
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
    analyzing: "جاري تحليل الإيصال بالذكاء الاصطناعي...",
    save: "حفظ العملية",
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
    step_recurring_empty: "Счета еще не добавлены.",
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
    analyzing: "Анализ чека AI...",
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
    <meta name="theme-color" content="#030014" />
    <title>Masareefy</title>
    
    <!-- PWA Settings -->
    <link rel="icon" type="image/png" href="/app.png">
    <link rel="apple-touch-icon" href="/app.png">

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              background: '#030014',
              surface: '#0F0E17',
              primary: '#A855F7', // Purple
              secondary: '#10B981', // Emerald
              accent: '#F472B6', // Pink
            },
            fontFamily: {
              sans: ['Inter', 'Noto Sans Arabic', 'sans-serif'],
              display: ['Space Grotesk', 'Noto Sans Arabic', 'sans-serif'],
            },
            animation: {
              'float': 'float 8s ease-in-out infinite',
              'float-fast': 'float 4s ease-in-out infinite',
              'pulse-glow': 'pulseGlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              'slide-up-fade': 'slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              'shimmer': 'shimmer 3s linear infinite',
              'border-beam': 'borderBeam 4s linear infinite',
              'grain': 'grain 8s steps(10) infinite',
              'spotlight': 'spotlight 2s ease .75s 1 forwards',
            },
            keyframes: {
              float: {
                '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                '50%': { transform: 'translateY(-10px) rotate(1deg)' },
              },
              pulseGlow: {
                '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
                '50%': { opacity: '0.8', filter: 'brightness(1.2)' },
              },
              slideUpFade: {
                '0%': { opacity: '0', transform: 'translateY(40px) scale(0.95)' },
                '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
              },
              scaleIn: {
                '0%': { transform: 'scale(0.9)', opacity: '0' },
                '100%': { transform: 'scale(1)', opacity: '1' },
              },
              shimmer: {
                '0%': { backgroundPosition: '-1000px 0' },
                '100%': { backgroundPosition: '1000px 0' }
              },
              borderBeam: {
                '100%': { offsetDistance: '100%' },
              },
              grain: {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '10%': { transform: 'translate(-5%, -10%)' },
                '20%': { transform: 'translate(-15%, 5%)' },
                '30%': { transform: 'translate(7%, -25%)' },
                '40%': { transform: 'translate(-5%, 25%)' },
                '50%': { transform: 'translate(-15%, 10%)' },
                '60%': { transform: 'translate(15%, 0%)' },
                '70%': { transform: 'translate(0%, 15%)' },
                '80%': { transform: 'translate(3%, 35%)' },
                '90%': { transform: 'translate(-10%, 10%)' },
              },
              spotlight: {
                '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
                '100%': { opacity: '1', transform: 'translate(-50%,-40%) scale(1)' },
              }
            }
          }
        }
      }
    </script>
    <style>
      body {
        background-color: #030014;
        color: #ffffff;
        font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overscroll-behavior-y: none;
      }
      
      /* Cinematic Live Grain */
      .live-noise::before {
        content: "";
        position: fixed;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        opacity: 0.04;
        pointer-events: none;
        z-index: 9999;
        animation: grain 8s steps(10) infinite;
        mix-blend-mode: overlay;
      }

      /* Premium Aurora Background */
      .aurora-bg {
        background: 
          radial-gradient(circle at 50% 0%, rgba(120, 119, 198, 0.15), transparent 60%),
          radial-gradient(circle at 80% 10%, rgba(168, 85, 247, 0.15), transparent 50%), 
          radial-gradient(circle at 20% 10%, rgba(16, 185, 129, 0.15), transparent 50%);
        position: fixed;
        inset: 0;
        z-index: -1;
        filter: blur(80px);
        opacity: 0.8;
      }

      /* Advanced Glass Card */
      .glass-card {
        background: rgba(13, 13, 15, 0.6);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 
          0 4px 6px -1px rgba(0, 0, 0, 0.1), 
          0 2px 4px -1px rgba(0, 0, 0, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      
      .glass-card:hover {
        background: rgba(20, 20, 25, 0.7);
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: 
          0 20px 40px -10px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        transform: translateY(-2px) scale(1.005);
      }

      /* Neon Text Glow */
      .text-glow {
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
      }
      .text-glow-purple {
        text-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
      }

      /* Scrollbar hidden */
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
    <div class="live-noise"></div>
    <div class="aurora-bg"></div>
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
    "vite": "^6.2.0",
    "vite-plugin-pwa": "^0.21.1"
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
export type Currency = 'USD' | 'SAR' | 'RUB' | 'AED' | 'EGP';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export type WalletType = 'spending' | 'savings';

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
  // Spending Wallet Info
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
  salaryInterval?: number; // Days
  nextSalaryDate?: string; // Calculated
  
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

// --- Titan Simulator Types ---

export interface TimelinePoint {
  date: string;
  balance: number;
  event?: string; // e.g., "Salary", "Rent", "Collapse"
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
  daysOfLife: number; // e.g. 0.5 days
  sacrifice: string; // e.g. "30 cups of coffee"
}

export interface TitanAnalysis {
  scenarios: TitanScenario[];
  risks: RiskAlert[];
  lifeEnergy: LifeEnergy;
  aiVerdict: string; // The final advice
}

export type ViewState = 'dashboard' | 'transactions' | 'add' | 'reports' | 'settings' | 'onboarding' | 'ai-advisor' | 'simulator';
```
---

### File: `vite.config.ts`
```ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['app.png'],
          manifest: {
            short_name: "Masareefy",
            name: "Masareefy: Smart Finance",
            description: "Smart income and expense manager with AI receipt analysis.",
            theme_color: "#030014", // Deep Space Background
            background_color: "#030014", // Matching Background
            display: "standalone",
            orientation: "portrait",
            scope: "/",
            start_url: "/",
            icons: [
              {
                src: "/app.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable"
              },
              {
                src: "/app.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            maximumFileSizeToCacheInBytes: 4000000 // 4MB Limit to avoid build errors
          }
        })
      ],
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
- Total Files: 28
- Total Characters: 263565
- Estimated Tokens: ~65.892 (GPT-4 Context)
