# Project Code Dump
Generated: 16/1/2026, 03:09:11

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
  ├── TransactionItem.tsx
  └── TransactionsPage.tsx
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

### File: `components\AddTransactionPage.tsx`
```tsx
import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, Image as ImageIcon, Calendar, Tag, CreditCard, Delete, Check, Wand2, Wallet, PiggyBank, X } from 'lucide-react';
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
  const [showDetails, setShowDetails] = useState(false);
  
  // Magic Input State
  const [showMagicInput, setShowMagicInput] = useState(false);
  const [magicText, setMagicText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
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

  // --- AI: Scan Receipt ---
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
      setShowDetails(true);
    } catch (err) { alert("Failed to analyze receipt."); } 
    finally { setLoadingMsg(null); }
  };

  // --- AI: Magic Input ---
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
          setShowDetails(true);
      } catch (e) { alert("Could not understand text."); }
      finally { setLoadingMsg(null); }
  };

  // --- SAVE Logic (The Smart Brain) ---
  const handleSave = () => {
    const amountVal = parseFloat(amountStr);
    if (amountVal <= 0) return;
    
    let transferNeeded = 0;

    // 1. SMART AFFORDABILITY CHECK
    // Only applies if: Expense AND Spending Wallet
    if (type === TransactionType.EXPENSE && wallet === 'spending') {
        const currentBal = user.currentBalance || 0;
        
        if (amountVal > currentBal) {
            const deficit = amountVal - currentBal;
            const savings = user.savingsBalance || 0;

            if (savings >= deficit) {
                // Suggest Transfer
                const confirmTransfer = window.confirm(
                    user.language === 'ar' 
                    ? `⚠️ رصيد الصرف غير كافٍ!\nينقصك ${deficit.toLocaleString()} ${user.currency}.\n\nهل تريد سحب هذا الفرق تلقائياً من محفظة التجميع لإتمام العملية؟`
                    : `⚠️ Insufficient Spending Balance!\nYou need ${deficit.toLocaleString()} ${user.currency} more.\n\nAuto-transfer this amount from Savings to proceed?`
                );

                if (confirmTransfer) {
                    transferNeeded = deficit;
                } else {
                    return; // User cancelled
                }
            } else {
                // Broke Logic
                alert(user.language === 'ar' ? "عذراً، لا يوجد رصيد كافٍ حتى في التجميع! 💀" : "Critical: Insufficient funds in both wallets. 💀");
                return;
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

  return (
    <div className="flex flex-col h-[90vh] pb-6 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
              <ChevronLeft className="text-white" />
          </button>
          
          {/* Type Segmented Control */}
          <div className="bg-[#1C1C1E] p-1 rounded-xl flex border border-white/10">
              <button 
                onClick={() => setType(TransactionType.EXPENSE)}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${type === 'expense' ? 'bg-white text-black shadow-lg' : 'text-gray-500'}`}
              >
                {t.expense}
              </button>
              <button 
                onClick={() => setType(TransactionType.INCOME)}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${type === 'income' ? 'bg-sber-green text-white shadow-lg' : 'text-gray-500'}`}
              >
                {t.income}
              </button>
          </div>
          <div className="w-10" /> 
      </div>

      {loadingMsg ? (
         <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
             <div className="w-24 h-24 bg-sber-green/10 rounded-full flex items-center justify-center border border-sber-green mb-6 relative">
                 <div className="absolute inset-0 rounded-full border-4 border-sber-green border-t-transparent animate-spin"></div>
                 <Wand2 className="w-10 h-10 text-sber-green" />
             </div>
             <p className="font-bold text-sber-green text-lg tracking-wide">{loadingMsg}</p>
         </div>
      ) : showMagicInput ? (
         <div className="flex-1 px-4 flex flex-col justify-center animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Wand2 className="text-purple-400" /> Magic Input
                </h3>
                <button onClick={() => setShowMagicInput(false)} className="p-2 bg-white/5 rounded-full"><X size={16} /></button>
             </div>
             <textarea 
                value={magicText}
                onChange={e => setMagicText(e.target.value)}
                className="w-full h-40 bg-[#1C1C1E] rounded-[1.5rem] p-5 text-white border border-white/10 focus:border-purple-500 outline-none resize-none mb-6 text-lg placeholder-zinc-600"
                placeholder="Ex: Spent 150 on Groceries at Lulu..."
                autoFocus
             />
             <button onClick={handleMagicAnalysis} className="w-full py-4 rounded-2xl bg-purple-600 text-white font-bold text-lg shadow-lg shadow-purple-600/20 active:scale-95 transition-transform">
                 Analyze Text
             </button>
         </div>
      ) : (
         <>
            {/* Amount & Wallet Display */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[140px]">
                <div className="flex items-baseline gap-1 mb-6 animate-in zoom-in duration-300">
                    <span className={`text-6xl font-bold tracking-tighter ${type === 'expense' ? 'text-white' : 'text-sber-green'}`}>
                        {amountStr}
                    </span>
                    <span className="text-xl text-zinc-500 font-medium">{user.currency}</span>
                </div>

                {/* Wallet Selector (Chips) */}
                <div className="flex gap-2 bg-[#1C1C1E] p-1.5 rounded-2xl border border-white/5">
                    <button 
                        onClick={() => setWallet('spending')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${wallet === 'spending' ? 'bg-zinc-800 border-white/20 text-white shadow-sm' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Wallet size={14} /> Spending
                    </button>
                    <button 
                        onClick={() => setWallet('savings')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${wallet === 'savings' ? 'bg-[#0f2e1b] border-sber-green/30 text-sber-green shadow-sm' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <PiggyBank size={14} /> Savings
                    </button>
                </div>
            </div>

            {/* Categories */}
            <div className="mb-4">
                <div className="flex gap-3 overflow-x-auto no-scrollbar px-2 py-2">
                    {CATEGORIES.map(cat => {
                        const Icon = (Icons as any)[cat.icon] || Icons.Circle;
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex flex-col items-center gap-2 min-w-[70px] transition-all duration-300 ${isSelected ? 'scale-110 -translate-y-1' : 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0'}`}
                            >
                                <div 
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                                    style={{ backgroundColor: cat.color }}
                                >
                                    <Icon size={24} className="text-white" />
                                </div>
                                <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-zinc-500'}`}>
                                    {user.language === 'ar' ? cat.name_ar : cat.name_en}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Action Bar */}
            <div className="px-2 mb-2 grid grid-cols-4 gap-2">
                <button onClick={() => setShowMagicInput(true)} className="col-span-1 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 rounded-2xl flex flex-col items-center justify-center text-purple-400 font-bold text-[10px] py-2 transition-colors">
                    <Wand2 size={18} className="mb-1" /> Magic
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="col-span-1 bg-[#1C1C1E] border border-white/5 hover:bg-white/5 rounded-2xl flex flex-col items-center justify-center text-sber-green font-bold text-[10px] py-2 transition-colors">
                    <Camera size={18} className="mb-1" /> Scan
                </button>
                <button onClick={() => setShowDetails(!showDetails)} className="col-span-2 bg-[#1C1C1E] border border-white/5 hover:bg-white/5 rounded-2xl flex items-center justify-center gap-2 text-zinc-300 font-bold text-xs py-2 transition-colors">
                    <Tag size={16} /> {showDetails ? 'Less Details' : 'Add Note / Vendor'}
                </button>
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

            {/* Details (Collapsible) */}
            {showDetails && (
                <div className="bg-[#1C1C1E] mx-2 mb-2 p-3 rounded-2xl border border-white/5 space-y-2 animate-in slide-in-from-top-2">
                <div className="flex gap-2">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-black/50 text-white p-3 rounded-xl border border-white/10 text-xs w-1/3 outline-none focus:border-sber-green" />
                    <input type="text" placeholder="Vendor" value={vendor} onChange={e => setVendor(e.target.value)} className="bg-black/50 text-white p-3 rounded-xl border border-white/10 text-xs w-2/3 outline-none focus:border-sber-green" />
                </div>
                <input type="text" placeholder="Note..." value={note} onChange={e => setNote(e.target.value)} className="w-full bg-black/50 text-white p-3 rounded-xl border border-white/10 text-xs outline-none focus:border-sber-green" />
                </div>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-4 gap-2 px-2 pb-2 mt-auto">
                <div className="col-span-3 grid grid-cols-3 gap-2">
                    {[1,2,3,4,5,6,7,8,9,'.',0].map(n => (
                        <button key={n} onClick={() => handleNumPress(n.toString())} className="h-14 bg-[#1C1C1E] rounded-2xl text-xl font-bold text-white hover:bg-white/10 active:scale-95 transition-all">
                            {n}
                        </button>
                    ))}
                    <button onClick={handleDelete} className="h-14 bg-[#1C1C1E] rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-500/10 active:scale-95 transition-all">
                        <Delete size={20} />
                    </button>
                </div>
                <div className="col-span-1">
                    <button 
                        onClick={handleSave}
                        disabled={parseFloat(amountStr) === 0}
                        className={`w-full h-full rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                            parseFloat(amountStr) > 0 
                            ? (type === 'expense' ? 'bg-white text-black shadow-lg shadow-white/20' : 'bg-sber-green text-white shadow-lg shadow-sber-green/20') 
                            : 'bg-zinc-800 text-zinc-600'
                        }`}
                    >
                        <Check size={28} strokeWidth={3} />
                        <span className="text-[10px] font-bold uppercase">{t.save}</span>
                    </button>
                </div>
            </div>
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
import { BrainCircuit, Loader2, X, Download, Lock, Sparkles, ChevronRight, Bot } from 'lucide-react';
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

  useEffect(() => {
    if (!report && !user.isGuest) generateReport();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-300" 
        onClick={onClose}
      />

      {/* Main Card */}
      <div className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 duration-500">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1C1C1E]/50 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Bot className="text-white w-7 h-7" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 {user.language === 'ar' ? 'المستشار المالي' : 'AI Financial Advisor'}
                 <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/10 font-mono">BETA</span>
               </h2>
               <p className="text-xs text-gray-400">Powered by Gemini 2.0</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 scrollbar-hide">
            {user.isGuest || !user.apiKey ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                        <Lock className="w-10 h-10 text-zinc-600" />
                    </div>
                    <div className="max-w-xs mx-auto">
                        <h3 className="text-xl font-bold text-white mb-2">Feature Locked</h3>
                        <p className="text-gray-400 text-sm">
                            {user.language === 'ar' 
                            ? 'المستشار الذكي يتطلب مفتاح API. يرجى إضافته من الإعدادات.' 
                            : 'AI Advisor requires a valid Gemini API Key. Please add one in Settings.'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-8">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-indigo-500/30 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                        <Sparkles className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                    </div>
                    <p className="text-gray-400 animate-pulse text-sm text-center max-w-xs font-medium">
                        {user.language === 'ar' 
                            ? 'جاري تحليل نفقاتك، وكشف الأخطاء، وإعداد خطة احترافية...' 
                            : 'Analyzing spending patterns, finding leaks, and generating report...'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className={`prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-indigo-400 prose-ul:list-disc prose-li:marker:text-indigo-500 max-w-none ${user.language === 'ar' ? 'text-right' : 'text-left'}`} dir={user.language === 'ar' ? 'rtl' : 'ltr'}>
                        <ReactMarkdown
                            components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mb-6 pb-4 border-b border-white/10 flex items-center gap-2" {...props} />,
                                h2: ({node, ...props}) => <div className="mt-8 mb-4 flex items-center gap-3"><div className="w-1 h-6 bg-indigo-500 rounded-full"></div><h2 className="text-lg font-bold text-white m-0" {...props} /></div>,
                                ul: ({node, ...props}) => <ul className="bg-[#1C1C1E] p-5 rounded-2xl border border-white/5 space-y-2 my-4" {...props} />,
                                li: ({node, ...props}) => <li className="text-sm text-gray-300 pl-2" {...props} />,
                                strong: ({node, ...props}) => <strong className="text-indigo-300 font-bold" {...props} />,
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
            <div className="p-6 border-t border-white/5 bg-[#1C1C1E]/80 backdrop-blur-md flex gap-4">
                <button 
                    onClick={handleDownload}
                    className="flex-1 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white font-bold py-4 rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Download size={18} />
                    {t.download_report}
                </button>
                <button 
                    onClick={onClose}
                    className="flex-1 bg-white text-black hover:bg-gray-200 font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    {t.close_report}
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
import React, { useState, useEffect } from 'react';
import { UserSettings, Transaction, TransactionType, BudgetPlan, WalletType } from '../types';
import { TRANSLATIONS } from '../constants';
import { Wallet, ArrowUpRight, ArrowDownLeft, Sparkles, TrendingUp, CalendarClock, ChevronRight, Zap, PiggyBank, Skull, AlertTriangle, Repeat } from 'lucide-react';
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
  const [activeCard, setActiveCard] = useState<WalletType>('spending');

  // --- Logic: Financial Health ---
  const transactionsAfterSnapshot = transactions.filter(t => !t.id.startsWith('init-'));
  
  // Calculate Wallet Balances
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

  // --- Logic: Burn Rate & Doom Alert ---
  const calculateBurnRate = () => {
      // Analyze last 10 days of spending
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

  // --- Logic: Subscription Detective ---
  const findPossibleSubscriptions = () => {
      // Simple heuristic: Same amount repeated > 1 time
      const counts: Record<number, number> = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
          counts[t.amount] = (counts[t.amount] || 0) + 1;
      });
      const subAmount = Object.keys(counts).find(k => counts[Number(k)] > 1 && Number(k) > 0);
      return subAmount ? Number(subAmount) : null;
  };
  const detectedSub = findPossibleSubscriptions();


  // --- Greeting ---
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  // --- UI Components ---
  
  const VisaCard = ({ type, balance, bankName, isActive, onClick }: { type: WalletType, balance: number, bankName: string, isActive: boolean, onClick: () => void }) => (
      <div 
        onClick={onClick}
        className={`absolute inset-0 rounded-[2rem] p-6 flex flex-col justify-between transition-all duration-500 cursor-pointer shadow-2xl border border-white/10 overflow-hidden ${
            isActive 
            ? 'z-20 scale-100 translate-y-0 opacity-100' 
            : 'z-10 scale-95 -translate-y-4 opacity-60 hover:opacity-80'
        } ${type === 'spending' ? 'bg-[#1C1C1E]' : 'bg-[#0f2e1b]'}`}
      >
         {/* Noise & Decoration */}
         <div className="absolute inset-0 opacity-[0.1] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
         {type === 'savings' && <div className="absolute top-0 right-0 w-40 h-40 bg-sber-green/20 blur-[50px] rounded-full"></div>}

         <div className="relative z-10 flex justify-between items-start">
             <div>
                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">{type === 'spending' ? 'Main Account' : 'Savings Pot'}</p>
                <h2 className="text-4xl font-extrabold text-white tracking-tighter tabular-nums">
                    {balance.toLocaleString()} <span className="text-lg text-zinc-500 font-normal">{user.currency}</span>
                </h2>
             </div>
             <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 ${type === 'spending' ? 'bg-white/5' : 'bg-sber-green/20'}`}>
                 {type === 'spending' ? <Wallet className="text-white w-5 h-5" /> : <PiggyBank className="text-sber-green w-5 h-5" />}
             </div>
         </div>

         <div className="relative z-10">
             <div className="flex justify-between items-end">
                 <p className="font-mono text-sm text-zinc-400 tracking-wider">**** **** **** {user.apiKey ? user.apiKey.slice(-4) : '1234'}</p>
                 <p className="font-bold text-white text-sm">{bankName}</p>
             </div>
         </div>
      </div>
  );

  return (
    <div className="space-y-6 pb-24">
      
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
      <div className="relative h-[220px] w-full perspective-1000">
          <VisaCard 
            type="savings" 
            balance={savingsBalance} 
            bankName={user.bankName} 
            isActive={activeCard === 'savings'} 
            onClick={() => setActiveCard('savings')}
          />
          <VisaCard 
            type="spending" 
            balance={spendingBalance} 
            bankName={user.bankName} 
            isActive={activeCard === 'spending'} 
            onClick={() => setActiveCard('spending')}
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

      {/* 3. The Doom Alert (Burn Rate) */}
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
        className={`flex flex-col items-center gap-1 transition-all duration-300 group ${isActive ? 'text-white -translate-y-1' : 'text-zinc-500 hover:text-gray-300'}`}
      >
        <div className={`absolute -bottom-6 w-1 h-1 rounded-full bg-white transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
        <Icon size={24} strokeWidth={isActive ? 3 : 2} className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`} />
      </button>
    );
  };

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
       <nav className="bg-[#161618]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] px-8 py-4 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)] flex items-center gap-8 pointer-events-auto transition-transform duration-300">
          
          <NavItem view="dashboard" icon={Home} />
          <NavItem view="transactions" icon={List} />

          {/* Central Add Button */}
          <button 
              onClick={() => onNavigate('add')}
              className="w-16 h-16 bg-white text-black rounded-[1.2rem] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 -mt-10 border-4 border-[#050505] relative z-20 group"
          >
              <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>

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
import { TRANSLATIONS } from '../constants';
import { validateApiKey, analyzeOnboardingData, OnboardingAnalysisResult } from '../services/geminiService';
import { signInWithGoogle, auth, getUserData } from '../services/firebase';
import { Wallet, Check, ImageIcon, DollarSign, Upload, Zap, ArrowRight, Plus, Trash2, UserCircle2, ChevronLeft, Globe, Key, CheckCircle2, XCircle, Loader2, Building2, PiggyBank, CalendarClock } from 'lucide-react';

interface Props {
  user: UserSettings;
  setUser: React.Dispatch<React.SetStateAction<UserSettings>>;
  onComplete: (result: OnboardingAnalysisResult, nextSalaryDate: string, nextSalaryAmount: number, bills: RecurringBill[]) => void;
  onRestore: (settings: UserSettings, transactions: any[]) => void;
}

// Helper: Smart Calendar Grid
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
    
    // Generate view based on Next Date month
    const year = nextDate.getFullYear();
    const month = nextDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-zinc-800 animate-in fade-in zoom-in duration-500">
         <div className="text-center font-bold mb-4 text-white flex justify-between items-center">
           <span className="text-xs text-gray-500 uppercase tracking-wider">Next Payday</span>
           <span>{nextDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
         </div>
         <div className="grid grid-cols-7 gap-1 text-center">
           {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[10px] text-zinc-600 font-bold">{d}</div>)}
           {days.map((day, idx) => {
             if (!day) return <div key={idx}></div>;
             
             const isNextPayday = day === nextDate.getDate();
             
             return (
               <div 
                 key={idx}
                 className={`text-sm py-2 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isNextPayday 
                    ? 'bg-sber-green text-white font-bold shadow-[0_0_15px_rgba(33,160,56,0.5)] scale-110' 
                    : 'text-zinc-500'
                 }`}
               >
                 {day}
               </div>
             )
           })}
         </div>
         <div className="mt-4 text-center">
             <p className="text-xs text-sber-green font-medium animate-pulse">
                 Your salary will arrive on {nextDate.toLocaleDateString()}
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

  // Files
  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [salaryFile, setSalaryFile] = useState<File | null>(null);
  const [expenseFiles, setExpenseFiles] = useState<File[]>([]);
  
  // Data
  const [analysisResult, setAnalysisResult] = useState<OnboardingAnalysisResult | null>(null);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');

  // Salary Logic State
  const [salaryInterval, setSalaryInterval] = useState<number>(30); // Default 30 days
  const [savingsInitial, setSavingsInitial] = useState<number>(0);

  useEffect(() => {
    document.documentElement.dir = user.language === 'ar' ? 'rtl' : 'ltr';
  }, [user.language]);

  useEffect(() => {
    if (process.env.API_KEY && !user.apiKey) {
      setUser(prev => ({ ...prev, apiKey: process.env.API_KEY || '' }));
    }
  }, []);

  // --- Handlers ---

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
                // Continue as new user if read fails but auth works
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
    if (!user.name.trim() || !user.bankName.trim()) return alert("Please fill all fields");
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

  const handleFinalize = () => {
      if (!analysisResult) return;
      
      // Calculate Next Date
      const lastDate = new Date(analysisResult.lastSalary.date);
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + salaryInterval);
      const nextSalaryDateStr = nextDate.toISOString().split('T')[0];

      // Update User Context with new fields
      setUser(u => ({
          ...u,
          salaryInterval: salaryInterval,
          savingsBalance: savingsInitial
      }));

      onComplete(analysisResult, nextSalaryDateStr, analysisResult.lastSalary.amount, recurringBills);
  };

  // --- Render ---

  if (isRestoring) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
              <Loader2 className="w-12 h-12 text-sber-green animate-spin mb-4" />
              <h2 className="text-xl font-bold">Checking database...</h2>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
        
        {/* Step Indicator */}
        {step > 0 && (
            <div className="absolute top-10 left-0 right-0 flex justify-center gap-2 px-6">
            {[1,2,3,4,5,6,7].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-sber-green' : 'bg-zinc-800'}`} />
            ))}
            </div>
        )}

        {/* Step 0: Auth */}
        {step === 0 && (
          <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-gradient-to-tr from-sber-green to-emerald-600 rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-sber-green/20">
              <Wallet className="text-white w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold mb-3">{t.welcome}</h1>
            <p className="text-zinc-400 mb-10 text-lg">{t.setup_title}</p>
            
            <button onClick={handleGoogleSignIn} className="w-full bg-white text-black font-bold p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all mb-4">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                {t.sign_in_google}
            </button>
            <button onClick={() => { setUser(u => ({...u, isGuest: false, name: ''})); setStep(1); }} className="w-full bg-zinc-900 text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-3 border border-zinc-800">
                <UserCircle2 className="w-6 h-6 text-zinc-400" />
                {t.guest_mode}
            </button>
          </div>
        )}

        {/* Step 1: Profile & Bank Name */}
        {step === 1 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
             <h2 className="text-3xl font-bold mb-2 text-left">{t.enter_name}</h2>
             <p className="text-zinc-400 mb-8 text-left text-sm">Let's set up your profile and bank.</p>
             
             <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="text-left">
                  <label className="text-xs text-zinc-500 ml-1 mb-2 block uppercase font-bold">{t.enter_name}</label>
                  <input type="text" className="w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 focus:border-sber-green outline-none text-white" placeholder="John Doe" value={user.name} onChange={e => setUser({...user, name: e.target.value})} required />
              </div>

              {/* NEW: Bank Name Input */}
              <div className="text-left">
                  <label className="text-xs text-zinc-500 ml-1 mb-2 block uppercase font-bold">Bank Name</label>
                  <div className="relative">
                    <input type="text" className="w-full bg-zinc-900/50 p-4 pl-12 rounded-2xl border border-zinc-800 focus:border-sber-green outline-none text-white" placeholder="e.g. AlRajhi Bank" value={user.bankName || ''} onChange={e => setUser({...user, bankName: e.target.value})} required />
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  </div>
              </div>

              <div className="text-left">
                <label className="text-xs text-zinc-500 ml-1 mb-2 block uppercase font-bold">{t.enter_key}</label>
                <div className="relative">
                    <input type="password" className={`w-full bg-zinc-900/50 p-4 pr-14 rounded-2xl border outline-none text-white ${keyStatus === 'valid' ? 'border-sber-green' : keyStatus === 'invalid' ? 'border-red-500' : 'border-zinc-800'}`} placeholder="AI Studio Key" value={user.apiKey} onChange={e => { setUser({...user, apiKey: e.target.value}); setKeyStatus('idle'); }} required />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button type="button" onClick={checkApiKey} disabled={!user.apiKey} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${keyStatus === 'valid' ? 'bg-sber-green text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                            {keyStatus === 'valid' ? <CheckCircle2 size={18} /> : <Key size={18} />}
                        </button>
                    </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                 <select className="flex-1 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-white outline-none" value={user.currency} onChange={e => setUser({...user, currency: e.target.value as Currency})}>
                    <option value="USD">USD ($)</option>
                    <option value="SAR">SAR (﷼)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="RUB">RUB (₽)</option>
                 </select>
                 <select className="flex-1 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-white outline-none" value={user.language} onChange={e => setUser({...user, language: e.target.value as Language})}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                    <option value="ru">Русский</option>
                 </select>
              </div>

              <button type="submit" className="w-full bg-sber-green hover:bg-green-600 font-bold p-4 rounded-2xl mt-4 flex justify-center gap-2 items-center" disabled={isValidating}>
                {isValidating ? <Loader2 className="animate-spin" /> : <>{t.start} <ArrowRight size={20} /></>}
              </button>
             </form>
          </div>
        )}

        {/* Step 2: Balance */}
        {step === 2 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right">
            <h2 className="text-2xl font-bold mb-2">{t.step_balance}</h2>
            <p className="text-zinc-400 mb-8 text-sm">{t.step_balance_desc}</p>
            <div className={`h-56 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors ${balanceFile ? 'border-sber-green bg-sber-green/10' : 'border-zinc-700'}`} onClick={() => document.getElementById('balanceInput')?.click()}>
              {balanceFile ? <Check className="w-12 h-12 text-sber-green" /> : <ImageIcon className="w-12 h-12 text-zinc-500" />}
              <span className="text-sm mt-2 text-zinc-400">{balanceFile ? balanceFile.name : t.upload_image}</span>
              <input id="balanceInput" type="file" accept="image/*" className="hidden" onChange={(e) => setBalanceFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(3)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold" disabled={!balanceFile}>Next</button>
          </div>
        )}

        {/* Step 3: Salary */}
        {step === 3 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right">
            <h2 className="text-2xl font-bold mb-2">{t.step_salary}</h2>
            <p className="text-zinc-400 mb-8 text-sm">Upload last salary slip to detect the date.</p>
            <div className={`h-56 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors ${salaryFile ? 'border-sber-green bg-sber-green/10' : 'border-zinc-700'}`} onClick={() => document.getElementById('salaryInput')?.click()}>
              {salaryFile ? <Check className="w-12 h-12 text-sber-green" /> : <DollarSign className="w-12 h-12 text-zinc-500" />}
              <span className="text-sm mt-2 text-zinc-400">{salaryFile ? salaryFile.name : t.upload_image}</span>
              <input id="salaryInput" type="file" accept="image/*" className="hidden" onChange={(e) => setSalaryFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold" disabled={!salaryFile}>Next</button>
          </div>
        )}

        {/* Step 4: Expenses */}
        {step === 4 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right">
            <h2 className="text-2xl font-bold mb-2">{t.step_expenses}</h2>
            <div className={`h-56 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer ${expenseFiles.length ? 'border-sber-green bg-sber-green/10' : 'border-zinc-700'}`} onClick={() => document.getElementById('expensesInput')?.click()}>
               {expenseFiles.length ? <span className="font-bold text-sber-green">{expenseFiles.length} files</span> : <Upload className="w-12 h-12 text-zinc-500" />}
               <input id="expensesInput" type="file" accept="image/*" multiple className="hidden" onChange={(e) => setExpenseFiles(Array.from(e.target.files || []))} />
            </div>
            <button onClick={() => setStep(5)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold">Next</button>
          </div>
        )}

        {/* Step 5: Recurring */}
        {step === 5 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right">
             <h2 className="text-2xl font-bold mb-6">{t.step_recurring}</h2>
             <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 mb-6 space-y-3">
                <input type="text" placeholder={t.bill_name} value={newBillName} onChange={e => setNewBillName(e.target.value)} className="w-full bg-black p-3 rounded-xl border border-zinc-700 outline-none" />
                <div className="flex gap-2">
                   <input type="number" placeholder={t.bill_amount} value={newBillAmount} onChange={e => setNewBillAmount(e.target.value)} className="w-full bg-black p-3 rounded-xl border border-zinc-700 outline-none" />
                   <button onClick={() => { if(newBillName && newBillAmount) { setRecurringBills([...recurringBills, { id: Date.now().toString(), name: newBillName, amount: Number(newBillAmount) }]); setNewBillName(''); setNewBillAmount(''); } }} className="bg-sber-green p-3 rounded-xl"><Plus className="text-white" /></button>
                </div>
                <div className="space-y-2 pt-2">
                    {recurringBills.map(b => (
                        <div key={b.id} className="flex justify-between p-2 bg-black rounded-lg border border-zinc-800"><span className="text-sm">{b.name}</span> <span className="text-xs text-zinc-500">{b.amount}</span></div>
                    ))}
                </div>
             </div>
             <button onClick={handleStartAnalysis} className="w-full bg-sber-green hover:bg-green-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2">Analyze All <Zap size={18} /></button>
          </div>
        )}

        {/* Step 6: Loading */}
        {step === 6 && (
           <div className="flex flex-col items-center justify-center animate-in fade-in">
              <Loader2 className="w-16 h-16 text-sber-green animate-spin mb-4" />
              <h2 className="text-xl font-bold">{t.analyzing_all}</h2>
           </div>
        )}

        {/* Step 7: Review & Smart Salary Logic */}
        {step === 7 && analysisResult && (
           <div className="w-full max-w-sm animate-in slide-in-from-bottom pb-10">
              <h2 className="text-2xl font-bold mb-1">{t.step_review}</h2>
              <p className="text-zinc-400 mb-6 text-sm">Configure your cycle and savings.</p>
              
              <div className="space-y-4">
                 {/* 1. Balances */}
                 <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-zinc-800 space-y-3">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Wallet size={16} /> <span className="text-xs font-bold uppercase">Spending</span>
                        </div>
                        <span className="font-mono font-bold text-white">{analysisResult.currentBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sber-green">
                            <PiggyBank size={16} /> <span className="text-xs font-bold uppercase">Savings</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={savingsInitial} 
                                onChange={e => setSavingsInitial(Number(e.target.value))}
                                className="bg-black/50 text-white w-20 text-right p-1 rounded-md text-sm border border-zinc-700 outline-none focus:border-sber-green"
                            />
                        </div>
                    </div>
                 </div>

                 {/* 2. Smart Salary Interval */}
                 <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarClock className="text-purple-400 w-5 h-5" />
                        <span className="text-sm font-bold text-white">Salary Cycle</span>
                    </div>
                    
                    <div className="mb-4">
                        <p className="text-xs text-zinc-500 mb-1">AI detected last salary on:</p>
                        <p className="text-white font-mono bg-black/40 p-2 rounded-lg inline-block border border-zinc-800">
                            {analysisResult.lastSalary.date}
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="text-xs text-zinc-400 block mb-2">How often do you get paid? (Days)</label>
                        <input 
                            type="number" 
                            value={salaryInterval} 
                            onChange={e => setSalaryInterval(Number(e.target.value))}
                            className="w-full bg-black/50 text-white p-3 rounded-xl border border-zinc-700 text-center font-bold outline-none focus:border-purple-500"
                        />
                    </div>

                    {/* 3. Visual Calendar Animation */}
                    <SmartCalendar lastSalaryDate={analysisResult.lastSalary.date} interval={salaryInterval} />
                 </div>

                 <button onClick={handleFinalize} className="w-full bg-white text-black p-4 rounded-2xl mt-4 font-bold shadow-lg">
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
import { Check, Calendar, X, Plus, Trash2, AlertCircle } from 'lucide-react';

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
            className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
        >
            <Plus className="w-6 h-6 text-zinc-500 mb-2" />
            <p className="text-xs text-zinc-500 font-medium">Tap to add fixed bills</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
            {bills.map(bill => {
            const isPaid = bill.lastPaidDate && bill.lastPaidDate.startsWith(currentMonth);
            return (
                <div 
                key={bill.id}
                onClick={() => !isPaid && setSelectedBill(bill)}
                className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${
                    isPaid 
                    ? 'bg-sber-green/5 border-sber-green/20 opacity-60' 
                    : 'bg-[#1C1C1E] border-white/5 hover:border-white/10 active:scale-[0.98]'
                }`}
                >
                <div className="flex items-center gap-4 z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isPaid ? 'bg-sber-green text-white' : 'bg-white/5 text-zinc-400'}`}>
                        {isPaid ? <Check size={18} strokeWidth={3} /> : <Calendar size={18} />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isPaid ? 'text-zinc-500 line-through' : 'text-white'}`}>{bill.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">
                            {isPaid ? `Paid: ${bill.lastPaidDate}` : 'Due this month'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 z-10">
                    <span className={`font-bold text-sm ${isPaid ? 'text-zinc-500' : 'text-white'}`}>
                        {bill.amount} <span className="text-[10px] opacity-50">{user.currency}</span>
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
                className="w-full py-3 rounded-xl border border-dashed border-white/10 text-xs font-bold text-zinc-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
                <Plus size={14} /> Add Bill
            </button>
        </div>
      )}

      {/* Payment Modal */}
      {selectedBill && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedBill(null)} />
            <div className="relative bg-[#1C1C1E] border border-white/10 w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300">
               <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6 sm:hidden" />
               
               <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-sber-green/10 rounded-full flex items-center justify-center mx-auto mb-4 text-sber-green">
                      <Check size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{t.confirm_payment}</h3>
                  <p className="text-sm text-gray-400">Mark <span className="text-white font-bold">{selectedBill.name}</span> as paid?</p>
               </div>

               <div className="space-y-4">
                  <div className="bg-black/40 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                      <span className="text-sm text-gray-400">Amount</span>
                      <span className="text-lg font-bold text-white">{selectedBill.amount} {user.currency}</span>
                  </div>

                  <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-2 mb-1 block">Date</label>
                        <input 
                            type="date" 
                            value={payDate}
                            onChange={(e) => setPayDate(e.target.value)}
                            className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 text-sm outline-none focus:border-sber-green"
                        />
                      </div>
                  </div>

                  <div 
                    onClick={() => setDeduct(!deduct)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${deduct ? 'bg-sber-green/10 border-sber-green/50' : 'bg-black/40 border-white/5'}`}
                  >
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${deduct ? 'bg-sber-green border-sber-green' : 'border-zinc-600'}`}>
                        {deduct && <Check size={12} className="text-white" />}
                     </div>
                     <span className="text-sm font-medium text-gray-300">{t.deduct_balance}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button onClick={() => setSelectedBill(null)} className="py-3 rounded-xl font-bold text-sm bg-zinc-800 text-white">Cancel</button>
                      <button onClick={confirmPayment} className="py-3 rounded-xl font-bold text-sm bg-sber-green text-white shadow-lg shadow-sber-green/20">Confirm</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Add Bill Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAdding(false)} />
            <div className="relative bg-[#1C1C1E] border border-white/10 w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300">
               <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6 sm:hidden" />
               
               <h3 className="text-xl font-bold text-white mb-6 text-center">{t.add_bill}</h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] text-gray-500 font-bold uppercase ml-2 mb-1 block">{t.bill_name}</label>
                     <input 
                        type="text"
                        placeholder="e.g. Netflix"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:outline-none transition-colors"
                        autoFocus
                     />
                  </div>
                  <div>
                     <label className="text-[10px] text-gray-500 font-bold uppercase ml-2 mb-1 block">{t.bill_amount}</label>
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
                     className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-2xl font-bold text-sm shadow-lg mt-2 disabled:opacity-50"
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
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { Transaction, Language } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { AlertTriangle, TrendingUp, DollarSign, PieChart as PieIcon, ArrowRight } from 'lucide-react';

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
    const catKey = curr.category || 'utilities';
    acc[catKey] = (acc[catKey] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(dataMap).map(catId => {
    const category = CATEGORIES.find(c => c.id === catId) || CATEGORIES[4];
    const name = language === 'ar' ? category.name_ar : category.name_en;
    return {
      name,
      value: dataMap[catId],
      color: category.color,
      icon: category.icon
    };
  }).sort((a, b) => b.value - a.value);

  // Weekly Trend Data
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
  const topCategory = pieData.length > 0 ? pieData[0] : null;

  return (
    <div className="space-y-6 pb-24">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-2 mb-2">
         <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20">
             <PieIcon className="w-6 h-6 text-sber-green" />
         </div>
         <h2 className="text-2xl font-bold text-white leading-none">{t.reports}</h2>
      </div>

      {/* 1. Smart Insight Card (The "Headline") */}
      {hasData && topCategory && (
        <div className="bg-gradient-to-br from-[#1C1C1E] to-black p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-red-400">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Top Spending</span>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="text-3xl font-bold text-white mb-1">{topCategory.name}</h3>
                        <p className="text-sm text-gray-400">
                            {((topCategory.value / totalExpenses) * 100).toFixed(0)}% of your expenses
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-mono font-bold text-white">{topCategory.value.toLocaleString()}</p>
                    </div>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full mt-4 overflow-hidden">
                    <div 
                        className="h-full bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                        style={{ width: `${(topCategory.value / totalExpenses) * 100}%` }}
                    />
                </div>
            </div>
        </div>
      )}

      {/* 2. Donut Chart Section */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] border border-white/5">
        <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-sber-green" /> Spending Distribution
        </h3>
        
        {hasData ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Chart */}
                <div className="h-[220px] w-[220px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                cornerRadius={8}
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: number) => value.toLocaleString()}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-gray-500 font-bold uppercase">Total</span>
                        <span className="text-xl font-bold text-white tabular-nums">{totalExpenses.toLocaleString()}</span>
                    </div>
                </div>

                {/* Categories List */}
                <div className="flex-1 w-full space-y-4">
                    {pieData.slice(0, 4).map((cat, idx) => (
                        <div key={idx} className="group">
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                    <span className="text-sm font-medium text-gray-200">{cat.name}</span>
                                </div>
                                <span className="text-sm font-bold text-white">{cat.value.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(cat.value / totalExpenses) * 100}%`, backgroundColor: cat.color }}
                                />
                            </div>
                        </div>
                    ))}
                    {pieData.length > 4 && (
                        <button className="w-full text-xs text-gray-500 py-2 hover:text-white transition-colors flex items-center justify-center gap-1">
                            View All Categories <ArrowRight size={12} />
                        </button>
                    )}
                </div>
            </div>
        ) : (
            <div className="py-10 text-center text-gray-500">No data to display.</div>
        )}
      </div>

      {/* 3. Weekly Trend (Bar Chart) */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] border border-white/5">
         <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" /> Weekly Activity
         </h3>
         
         <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={12}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#333" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#52525b" 
                        tick={{fill: '#71717a', fontSize: 10}} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                    />
                    <Tooltip 
                        cursor={{fill: '#ffffff', opacity: 0.05, radius: 4}}
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                    />
                    <Bar 
                        dataKey="amount" 
                        fill="url(#barGradient)" 
                        radius={[10, 10, 10, 10]} 
                    />
                </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

    </div>
  );
};
```
---

### File: `components\SettingsPage.tsx`
```tsx
import React, { useState } from 'react';
import { Settings, Globe, ChevronRight, Key, CheckCircle, LogOut, User, Shield, Coins, AlertTriangle, Loader2 } from 'lucide-react';
import { UserSettings, Currency, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { validateApiKey } from '../services/geminiService';

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

  const SettingRow = ({ icon: Icon, title, value, onClick, color = "text-gray-400" }: any) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-zinc-900 border border-white/5 ${color}`}>
                <Icon size={18} />
            </div>
            <span className="font-medium text-gray-200 text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs font-medium">{value}</span>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
        </div>
    </button>
  );

  return (
    <div className="pb-24 space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-2 mb-4">
          <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20">
              <Settings className="w-6 h-6 text-sber-green" />
          </div>
          <h2 className="text-2xl font-bold text-white leading-none">{t.settings}</h2>
      </div>

      {/* Profile Section */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] border border-white/5 flex items-center gap-4">
          <div className="relative">
            {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full border-2 border-zinc-800" />
            ) : (
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                    <span className="text-2xl font-bold text-gray-400">{user.name.charAt(0)}</span>
                </div>
            )}
            {user.isGuest && (
                <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-black">
                    GUEST
                </div>
            )}
          </div>
          <div>
              <h3 className="text-lg font-bold text-white">{user.name || 'Guest User'}</h3>
              <p className="text-xs text-gray-400 font-mono mt-1 truncate max-w-[200px]">
                  ID: {user.apiKey ? '••••' + user.apiKey.slice(-4) : 'No API Key'}
              </p>
          </div>
      </div>
      
      {/* General Settings */}
      <div className="space-y-2">
          <h3 className="px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Preferences</h3>
          <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 overflow-hidden">
            <SettingRow 
                icon={Globe} 
                title="Language" 
                value={user.language === 'ar' ? 'العربية' : user.language === 'ru' ? 'Русский' : 'English'} 
                color="text-purple-400"
                onClick={() => setUser(u => ({...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en'}))}
            />
            <div className="h-[1px] bg-white/5 mx-4" />
            <SettingRow 
                icon={Coins} 
                title="Currency" 
                value={user.currency} 
                color="text-yellow-400"
                onClick={() => {
                    const currencies: Currency[] = ['USD', 'SAR', 'AED', 'RUB'];
                    const nextIdx = (currencies.indexOf(user.currency) + 1) % currencies.length;
                    setUser(u => ({...u, currency: currencies[nextIdx]}));
                }}
            />
          </div>
      </div>

      {/* AI Settings */}
      <div className="space-y-2">
          <h3 className="px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Intelligence</h3>
          <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 overflow-hidden p-1">
             <button 
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors rounded-[1.8rem]"
             >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-sber-green">
                        <Key size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm block">Gemini API Key</span>
                        <span className="text-[10px] text-zinc-500 block">Required for AI analysis</span>
                    </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${showKeyInput ? 'rotate-90' : ''}`} />
             </button>

             {showKeyInput && (
                 <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                     <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                        {t.change_key_desc}
                     </p>
                     <div className="flex gap-2">
                        <input 
                            type="password" 
                            placeholder="Paste new API Key" 
                            value={editingKey}
                            onChange={(e) => setEditingKey(e.target.value)}
                            className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-sber-green outline-none"
                        />
                        <button 
                            onClick={handleUpdateApiKey}
                            disabled={!editingKey || isValidatingKey}
                            className="bg-white text-black px-4 rounded-xl font-bold text-xs disabled:opacity-50"
                        >
                            {isValidatingKey ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save'}
                        </button>
                     </div>
                 </div>
             )}
          </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-2 pt-4">
          <button 
            onClick={onLogout}
            className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 p-4 rounded-[1.5rem] flex items-center justify-center gap-2 transition-all group"
          >
            <LogOut size={18} className="text-red-500" />
            <span className="font-bold text-red-500 text-sm">{t.sign_out}</span>
          </button>
          
          <div className="text-center pt-4">
              <p className="text-[10px] text-zinc-600 font-mono">Masareefy v2.0.0 (Premium)</p>
              <p className="text-[9px] text-zinc-700 mt-1">Built with Gemini & Firebase</p>
          </div>
      </div>

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
  // Find category or default to 'utilities' to prevent crashes
  const category = CATEGORIES.find(c => c.id === transaction.category) || CATEGORIES.find(c => c.id === 'utilities')!;
  
  // Resolve Icon dynamically safely
  const IconComponent = (Icons as any)[category.icon] || Icons.HelpCircle;

  const isExpense = transaction.type === 'expense';
  
  // Format Date logic if needed, currently we rely on list grouping headers for date
  // We can add time if available in ISO string, else just show category name as subtext
  
  return (
    <div className="group relative overflow-hidden bg-[#1C1C1E] hover:bg-[#2C2C2E] rounded-2xl p-4 transition-all duration-300 border border-white/5 hover:border-white/10 active:scale-[0.98]">
      {/* Decorative Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          {/* Icon Box with Dynamic Color Glow */}
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-300"
            style={{ 
                background: `linear-gradient(135deg, ${category.color}20, ${category.color}05)`,
                border: `1px solid ${category.color}30`,
                boxShadow: `0 4px 12px ${category.color}15`
            }}
          >
            <IconComponent size={22} style={{ color: category.color }} strokeWidth={2.5} />
          </div>
          
          {/* Details */}
          <div className="flex flex-col">
            <h3 className="font-bold text-white text-base leading-tight">
              {transaction.vendor || (language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en)}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
                {/* Category Tag */}
                <span className="text-[10px] text-zinc-400 font-bold bg-zinc-900/80 px-2 py-0.5 rounded-md border border-white/5">
                    {language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en}
                </span>
                {/* Note truncation */}
                {transaction.note && (
                    <span className="text-xs text-zinc-600 truncate max-w-[120px]">• {transaction.note}</span>
                )}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
            <div className={`font-bold text-lg tabular-nums tracking-tight ${isExpense ? 'text-white' : 'text-sber-green'}`}>
                {isExpense ? '-' : '+'}{transaction.amount.toLocaleString()} 
                <span className="text-xs font-medium text-zinc-500 ml-0.5 align-top opacity-70">{currency}</span>
            </div>
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
import { List, Search, X, Filter, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Transaction, UserSettings, TransactionType } from '../types';
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
        // 1. Text Search
        const matchesSearch = !searchTerm || (
            (t.vendor && t.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        // 2. Type Filter
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
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 border ${
            filterType === type 
            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
            : 'bg-zinc-900/50 text-gray-400 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800'
        }`}
      >
        {Icon && <Icon size={14} />}
        {label}
      </button>
  );

  return (
    <div className="pb-24 min-h-[80vh]">
      
      {/* Sticky Header Area */}
      <div className="sticky top-0 z-30 bg-[#050505]/95 backdrop-blur-xl pb-4 pt-2 -mx-6 px-6 border-b border-white/5 transition-all">
          <div className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20">
                        <List className="w-6 h-6 text-sber-green" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white leading-none">{t.transactions}</h2>
                        <p className="text-xs text-gray-400 mt-1">{filteredData.length} records</p>
                    </div>
                 </div>
              </div>

              {/* Search Bar */}
              <div className="relative group">
                 <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-500 group-focus-within:text-sber-green transition-colors" />
                 </div>
                 <input 
                    type="text" 
                    placeholder={user.language === 'ar' ? "ابحث عن متجر، ملاحظة..." : "Search merchant, notes..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-sber-green/50 transition-all placeholder-zinc-600 shadow-sm"
                 />
                 {searchTerm && (
                     <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white">
                         <X className="w-4 h-4" />
                     </button>
                 )}
              </div>

              {/* Filter Chips Row */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                 <FilterChip type="all" label={user.language === 'ar' ? 'الكل' : 'All'} icon={Filter} />
                 <FilterChip type="expense" label={t.expense} icon={ArrowUpRight} />
                 <FilterChip type="income" label={t.income} icon={ArrowDownLeft} />
              </div>
          </div>
      </div>

      {/* Stats Summary (Conditional) */}
      {(searchTerm || filterType !== 'all') && (
        <div className="grid grid-cols-2 gap-3 mt-4 mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><ArrowDownLeft size={40} /></div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Income</p>
                <p className="text-sber-green font-bold text-lg tabular-nums">
                    +{filteredData.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0).toLocaleString()}
                </p>
            </div>
            <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><ArrowUpRight size={40} /></div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Expense</p>
                <p className="text-white font-bold text-lg tabular-nums">
                    -{filteredData.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0).toLocaleString()}
                </p>
            </div>
        </div>
      )}
      
      {/* Transactions List */}
      <div className="mt-4">
        {getGroupedTransactions().map((group, idx) => {
            const date = new Date(group.date);
            return (
            <div key={group.date} className="mb-6 animate-in slide-in-from-bottom-5 fade-in" style={{animationDelay: `${idx * 50}ms`}}>
                <div className="flex items-center gap-3 mb-3 pl-1">
                    <span className="text-xl font-bold text-white tracking-tighter tabular-nums bg-white/10 w-10 h-10 flex items-center justify-center rounded-xl border border-white/5">
                        {date.getDate()}
                    </span>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                            {date.toLocaleDateString(user.language, { month: 'long' })}
                        </span>
                        <span className="text-[10px] text-gray-600 font-bold uppercase">
                            {date.toLocaleDateString(user.language, { weekday: 'long' })}
                        </span>
                    </div>
                </div>
                <div className="space-y-3">
                {group.items.map(tx => (
                    <TransactionItem key={tx.id} transaction={tx} currency={user.currency} language={user.language} />
                ))}
                </div>
            </div>
            );
        })}
      </div>
      
      {/* Empty State */}
      {filteredData.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 text-gray-500 opacity-50">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5 border-dashed">
                <Search size={32} strokeWidth={1.5} />
             </div>
             <p className="text-sm font-medium">No transactions found.</p>
             <p className="text-xs text-gray-600 mt-1">Try adjusting your filters.</p>
         </div>
      )}
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
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
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
    2. Category (infer from context, e.g. "kfc" -> food, "salary" -> salary)
    3. Vendor (e.g. "KFC", "Uber", "Boss")
    4. Type (expense or income)
    5. Date (YYYY-MM-DD) - Default to today ${new Date().toISOString().split('T')[0]} if not specified.

    Language context: ${language}.
    Categories: food, groceries, transport, housing, utilities, health, education, travel, entertainment, shopping, personal_care, subscriptions, debt, gifts, salary.

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
  
  // Note: We removed Bank Name extraction as requested. 
  // We focus heavily on LAST SALARY DATE.
  let promptContext = `
    Analyze these financial images for onboarding.
    1. Image 1 (Balance): Extract the total available balance number.
    2. Image 2 (Salary Slip/Notif): CRITICAL -> Extract the AMOUNT and the EXACT DATE of payment (YYYY-MM-DD). This date is very important for scheduling.
    3. Others: Receipts.

    Language: ${language}.
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
    2. Date (YYYY-MM-DD) - CRITICAL: Look for the transaction date. If it's a salary slip, find the payday.
    3. Vendor Name
    4. Category (Infer context: "Payroll/Deposit" -> salary, "McD" -> food)
    5. Type (income/expense)

    Categories: food, groceries, transport, housing, utilities, health, education, travel, entertainment, shopping, personal_care, subscriptions, debt, gifts, salary.

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

### File: `.env.local`
```local
GEMINI_API_KEY=PLACEHOLDER_API_KEY

```
---

### File: `App.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
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
        bankName: 'Bank',
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
        bankName: 'Bank',
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

  const handleOnboardingComplete = (result: OnboardingAnalysisResult, nextSalaryDate: string, nextSalaryAmount: number, bills: RecurringBill[]) => {
    // Note: We use 'spending' wallet for initial balance
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

    const newUserSettings: UserSettings = {
      ...user,
      isOnboarded: true,
      currentBalance: result.currentBalance,
      // savingsBalance is set in Onboarding component step
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
       
       // Deduct from Spending Balance immediately
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

  // --- THE SMART TRANSACTION HANDLER ---
  const handleSaveTransaction = (newTx: Transaction, transferAmount: number = 0) => {
    
    // 1. Handle Automatic Transfer (Smart Logic)
    if (transferAmount > 0) {
        // Create internal transfer records
        const transferOut: Transaction = {
            id: `transfer-out-${Date.now()}`,
            amount: transferAmount,
            date: newTx.date,
            category: 'transport', // System category
            vendor: 'Transfer to Spending',
            note: 'Auto-cover deficit',
            type: TransactionType.EXPENSE,
            wallet: 'savings'
        };
        const transferIn: Transaction = {
            id: `transfer-in-${Date.now()}`,
            amount: transferAmount,
            date: newTx.date,
            category: 'salary',
            vendor: 'From Savings',
            note: 'Auto-cover deficit',
            type: TransactionType.INCOME,
            wallet: 'spending'
        };
        
        setTransactions(prev => [transferIn, transferOut, ...prev]);
        
        // Update Balances
        setUser(prev => ({
            ...prev,
            savingsBalance: prev.savingsBalance - transferAmount,
            currentBalance: prev.currentBalance + transferAmount
        }));
    }

    // 2. Add the Main Transaction
    setTransactions(prev => [newTx, ...prev]);

    // 3. Update Specific Wallet Balance
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

        // 4. Smart Salary Update Logic
        // If Income added to Spending, assume it's salary or income that resets the cycle
        // Only if amount is significant (> 100) to avoid small deposits resetting the date
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
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans selection:bg-sber-green/30 pb-32">
      
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#050505]">
          <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-sber-green/5 rounded-full blur-[150px] opacity-30 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-emerald-900/10 rounded-full blur-[120px] opacity-20"></div>
      </div>

      {/* Header */}
      {currentView !== 'add' && (
        <div className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 shadow-sm transition-all duration-300">
          <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-2xl shadow-lg shadow-black/50 object-cover border border-white/10" />
              ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center text-sm font-bold shadow-lg shadow-black/50 border border-white/10">
                  {user.name.charAt(0) || 'U'}
                  </div>
              )}
              <div className="flex flex-col">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">{t.welcome}</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base tracking-wide text-white leading-none">{user.name.split(' ')[0]}</p>
                  {user.isGuest && <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 font-bold">GUEST</span>}
                </div>
              </div>
            </div>
            <button 
                onClick={() => setUser(u => ({...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en'}))}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all border border-white/5 group"
            >
              <Globe className="text-gray-400 group-hover:text-white w-5 h-5 transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-md mx-auto">
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
        </div>
      </main>

      {/* Navigation */}
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
import { ShoppingCart, Utensils, Car, Home, Zap, HeartPulse, GraduationCap, Plane, Gift, Briefcase, Clapperboard, ShoppingBag, Smile, Repeat, Banknote } from 'lucide-react';

export const CATEGORIES: ExpenseCategory[] = [
  { id: 'food', name_en: 'Food & Dining', name_ar: 'طعام ومطاعم', name_ru: 'Еда и напитки', icon: 'Utensils', color: '#FF9500' },
  { id: 'groceries', name_en: 'Groceries', name_ar: 'بقالة / سوبرماركت', name_ru: 'Продукты', icon: 'ShoppingCart', color: '#30D158' },
  { id: 'transport', name_en: 'Transport', name_ar: 'نقل ومواصلات', name_ru: 'Транспорт', icon: 'Car', color: '#0A84FF' },
  { id: 'housing', name_en: 'Housing', name_ar: 'سكن / إيجار', name_ru: 'Жилье', icon: 'Home', color: '#BF5AF2' },
  { id: 'utilities', name_en: 'Utilities', name_ar: 'فواتير وخدمات', name_ru: 'Коммунальные', icon: 'Zap', color: '#FFD60A' },
  { id: 'health', name_en: 'Health', name_ar: 'صحة وعلاج', name_ru: 'Здоровье', icon: 'HeartPulse', color: '#FF375F' },
  { id: 'education', name_en: 'Education', name_ar: 'تعليم', name_ru: 'Образование', icon: 'GraduationCap', color: '#64D2FF' },
  { id: 'travel', name_en: 'Travel', name_ar: 'سفر وسياحة', name_ru: 'Путешествия', icon: 'Plane', color: '#5E5CE6' },
  { id: 'entertainment', name_en: 'Entertainment', name_ar: 'ترفيه وتسلية', name_ru: 'Развлечения', icon: 'Clapperboard', color: '#FF2D55' },
  { id: 'shopping', name_en: 'Shopping', name_ar: 'تسوق وملابس', name_ru: 'Шопинг', icon: 'ShoppingBag', color: '#FF9F0A' },
  { id: 'personal_care', name_en: 'Personal Care', name_ar: 'عناية شخصية', name_ru: 'Личный уход', icon: 'Smile', color: '#E4A4C3' },
  { id: 'subscriptions', name_en: 'Subscriptions', name_ar: 'اشتراكات', name_ru: 'Подписки', icon: 'Repeat', color: '#AC8E68' },
  { id: 'debt', name_en: 'Loans & Debt', name_ar: 'قروض وديون', name_ru: 'Кредиты', icon: 'Banknote', color: '#8E8E93' },
  { id: 'gifts', name_en: 'Gifts & Charity', name_ar: 'هدايا وتبرعات', name_ru: 'Подарки', icon: 'Gift', color: '#FF453A' },
  { id: 'salary', name_en: 'Salary / Income', name_ar: 'راتب / دخل', name_ru: 'Зарплата', icon: 'Briefcase', color: '#21A038' },
];

export const RUSSIAN_BANKS = [
  { id: 'sber', name: 'Sberbank', color: '#21A038', textColor: '#FFFFFF' },
  { id: 'tinkoff', name: 'T-Bank', color: '#FFDD2D', textColor: '#000000' },
  { id: 'alpha', name: 'Alfa-Bank', color: '#EF3124', textColor: '#FFFFFF' },
  { id: 'vtb', name: 'VTB', color: '#002882', textColor: '#FFFFFF' },
  { id: 'raiffeisen', name: 'Raiffeisen', color: '#FFF200', textColor: '#000000' },
  { id: 'gazprom', name: 'Gazprombank', color: '#00468C', textColor: '#FFFFFF' },
  { id: 'ozon', name: 'Ozon Bank', color: '#005BFF', textColor: '#FFFFFF' },
  { id: 'yandex', name: 'Yandex Pay', color: '#FC3F1D', textColor: '#FFFFFF' },
  { id: 'pochta', name: 'Pochta Bank', color: '#13308D', textColor: '#FFFFFF' },
  { id: 'sovcom', name: 'Sovcombank', color: '#FF4D00', textColor: '#FFFFFF' },
  { id: 'psb', name: 'PSB', color: '#F26722', textColor: '#FFFFFF' },
  { id: 'mts', name: 'MTS Bank', color: '#E30611', textColor: '#FFFFFF' },
  { id: 'other', name: 'Custom Bank', color: '#1C1C1E', textColor: '#FFFFFF' },
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
  currentBalance: number; 
  
  // Savings Wallet Info
  savingsBankName: string;
  savingsBankColor: string;
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
- Total Files: 25
- Total Characters: 153737
- Estimated Tokens: ~38.435 (GPT-4 Context)
