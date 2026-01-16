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