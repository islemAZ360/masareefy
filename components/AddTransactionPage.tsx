import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Image as ImageIcon, Calendar, Tag, Delete, Check, Wand2, Wallet, PiggyBank, X, Sparkles, Receipt, PenLine } from 'lucide-react';
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
      } catch (e) { alert("Could not understand text."); }
      finally { setLoadingMsg(null); }
  };

  // --- SAVE Logic ---
  const handleSave = () => {
    const amountVal = parseFloat(amountStr);
    if (amountVal <= 0) return;
    
    let transferNeeded = 0;

    // Smart Affordability Check
    if (type === TransactionType.EXPENSE && wallet === 'spending') {
        const currentBal = user.currentBalance || 0;
        if (amountVal > currentBal) {
            const deficit = amountVal - currentBal;
            const savings = user.savingsBalance || 0;

            if (savings >= deficit) {
                const confirmTransfer = window.confirm(
                    user.language === 'ar' 
                    ? `⚠️ رصيد الصرف غير كافٍ!\nينقصك ${deficit.toLocaleString()} ${user.currency}.\n\nهل تريد سحب هذا الفرق تلقائياً من محفظة التجميع لإتمام العملية؟`
                    : `⚠️ Insufficient Spending Balance!\nYou need ${deficit.toLocaleString()} ${user.currency} more.\n\nAuto-transfer from Savings to proceed?`
                );
                if (confirmTransfer) transferNeeded = deficit;
                else return;
            } else {
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

  // --- Components ---

  const NumpadButton = ({ children, onClick, main = false, danger = false }: any) => (
      <button 
        onClick={onClick}
        className={`
            relative h-[4.5rem] rounded-[1.5rem] flex items-center justify-center text-2xl font-medium transition-all duration-100 active:scale-90 select-none
            ${main 
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]' 
                : danger 
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                    : 'bg-[#1C1C1E] text-white hover:bg-[#2C2C2E] border border-white/5'
            }
        `}
      >
          {children}
      </button>
  );

  const ToolButton = ({ icon: Icon, label, onClick, active = false }: any) => (
      <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 h-14 rounded-2xl transition-all active:scale-95 border ${active ? 'bg-white/10 border-white text-white' : 'bg-[#1C1C1E] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
          <Icon size={18} />
          <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </button>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050505] text-white overflow-hidden relative">
      
      {/* 1. Top Bar */}
      <div className="pt-4 px-4 pb-2 flex items-center justify-between z-10">
          <button onClick={onBack} className="p-3 bg-[#1C1C1E] rounded-full border border-white/5 hover:bg-white/10 transition-colors">
              <ChevronLeft size={20} />
          </button>
          
          <div className="bg-[#1C1C1E] p-1 rounded-full border border-white/10 flex">
              <button 
                onClick={() => setType(TransactionType.EXPENSE)}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${type === 'expense' ? 'bg-white text-black shadow-lg' : 'text-zinc-500'}`}
              >
                {t.expense}
              </button>
              <button 
                onClick={() => setType(TransactionType.INCOME)}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${type === 'income' ? 'bg-sber-green text-white shadow-lg' : 'text-zinc-500'}`}
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
         <div className="flex-1 px-6 flex flex-col justify-center animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Wand2 className="text-purple-400" /> Magic Input
                </h3>
                <button onClick={() => setShowMagicInput(false)} className="p-2 bg-white/5 rounded-full"><X size={20} /></button>
             </div>
             <textarea 
                value={magicText}
                onChange={e => setMagicText(e.target.value)}
                className="w-full h-48 bg-[#1C1C1E] rounded-[2rem] p-6 text-white border border-white/10 focus:border-purple-500 outline-none resize-none mb-6 text-xl placeholder-zinc-600 leading-relaxed"
                placeholder="Ex: Spent 150 on Groceries at Lulu..."
                autoFocus
             />
             <button onClick={handleMagicAnalysis} className="w-full py-5 rounded-[1.5rem] bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg shadow-lg shadow-purple-600/30 active:scale-95 transition-transform">
                 Analyze Text
             </button>
         </div>
      ) : (
         <>
            {/* 2. Display Area */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[180px] relative z-10">
                <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-300">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-7xl font-bold tracking-tighter tabular-nums ${type === 'expense' ? 'text-white' : 'text-sber-green'}`}>
                            {amountStr}
                        </span>
                        <span className="text-2xl text-zinc-500 font-medium">{user.currency}</span>
                    </div>

                    {/* Wallet Selector Pill */}
                    <div className="flex gap-2 mt-2">
                        <button 
                            onClick={() => setWallet('spending')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${wallet === 'spending' ? 'bg-zinc-800 border-white/20 text-white shadow-sm' : 'border-transparent bg-transparent text-zinc-600'}`}
                        >
                            <Wallet size={12} /> Spending
                        </button>
                        <button 
                            onClick={() => setWallet('savings')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${wallet === 'savings' ? 'bg-[#0f2e1b] border-sber-green/30 text-sber-green shadow-sm' : 'border-transparent bg-transparent text-zinc-600'}`}
                        >
                            <PiggyBank size={12} /> Savings
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Category Strip */}
            <div className="mb-2 pl-4 z-10">
                <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 pr-4">
                    {CATEGORIES.map(cat => {
                        const Icon = (Icons as any)[cat.icon] || Icons.Circle;
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex flex-col items-center gap-1.5 min-w-[4.5rem] transition-all duration-300 group ${isSelected ? 'scale-105' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
                            >
                                <div 
                                    className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shadow-lg transition-all ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'group-hover:bg-white/10'}`}
                                    style={{ backgroundColor: isSelected ? cat.color : '#1C1C1E', border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
                                >
                                    <Icon size={22} className="text-white" />
                                </div>
                                <span className={`text-[10px] font-bold truncate max-w-full ${isSelected ? 'text-white' : 'text-zinc-500'}`}>
                                    {user.language === 'ar' ? cat.name_ar : cat.name_en}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 4. Tools & Keypad Container */}
            <div className="bg-[#0A0A0A] rounded-t-[2.5rem] p-4 pb-8 border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
                
                {/* Tools Row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                    <ToolButton 
                        icon={Wand2} label="Magic" 
                        onClick={() => setShowMagicInput(true)} 
                        active={false}
                    />
                    <ToolButton 
                        icon={Camera} label="Scan" 
                        onClick={() => fileInputRef.current?.click()} 
                        active={false}
                    />
                    <ToolButton 
                        icon={PenLine} label={note ? "Edit Note" : "Note"} 
                        onClick={() => setShowNoteModal(true)} 
                        active={!!note}
                    />
                    <ToolButton 
                        icon={Calendar} label={date === new Date().toISOString().split('T')[0] ? "Today" : date.slice(5)} 
                        onClick={() => setShowDateModal(true)} 
                        active={date !== new Date().toISOString().split('T')[0]}
                    />
                </div>

                {/* Hidden File Input */}
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

                {/* Keypad Grid */}
                <div className="grid grid-cols-4 gap-3">
                    <NumpadButton onClick={() => handleNumPress('1')}>1</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('2')}>2</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('3')}>3</NumpadButton>
                    <button 
                        onClick={handleDelete} 
                        className="bg-[#1C1C1E] rounded-[1.5rem] flex items-center justify-center text-red-400 hover:bg-red-500/10 active:scale-90 transition-all border border-white/5"
                    >
                        <Delete size={24} />
                    </button>

                    <NumpadButton onClick={() => handleNumPress('4')}>4</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('5')}>5</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('6')}>6</NumpadButton>
                    {/* Big Save Button Spanning 2 Rows */}
                    <button 
                        onClick={handleSave}
                        disabled={parseFloat(amountStr) === 0}
                        className={`row-span-2 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                            parseFloat(amountStr) > 0 
                            ? (type === 'expense' ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.3)]' : 'bg-sber-green text-white shadow-[0_0_25px_rgba(33,160,56,0.3)]') 
                            : 'bg-zinc-800 text-zinc-600'
                        }`}
                    >
                        <Check size={32} strokeWidth={3} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{t.save}</span>
                    </button>

                    <NumpadButton onClick={() => handleNumPress('7')}>7</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('8')}>8</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('9')}>9</NumpadButton>

                    <NumpadButton onClick={() => handleNumPress('.')}>.</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('0')}>0</NumpadButton>
                    <div className="flex items-center justify-center">
                        <span className="text-xs text-zinc-600 font-mono">v2.0</span>
                    </div>
                </div>
            </div>

            {/* Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4">
                    <div className="absolute inset-0" onClick={() => setShowNoteModal(false)} />
                    <div className="relative w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] p-6 animate-in slide-in-from-bottom-full">
                        <h3 className="text-lg font-bold text-white mb-4">Add Note & Vendor</h3>
                        <input 
                            type="text" 
                            placeholder="Vendor Name (e.g. Starbucks)" 
                            value={vendor}
                            onChange={e => setVendor(e.target.value)}
                            className="w-full bg-black/50 p-4 rounded-xl border border-white/10 text-white mb-3 outline-none focus:border-white/30"
                            autoFocus
                        />
                        <textarea 
                            placeholder="Additional notes..." 
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="w-full bg-black/50 p-4 rounded-xl border border-white/10 text-white h-24 resize-none outline-none focus:border-white/30"
                        />
                        <button onClick={() => setShowNoteModal(false)} className="w-full bg-white text-black font-bold py-4 rounded-xl mt-4">Done</button>
                    </div>
                </div>
            )}

            {/* Date Modal */}
            {showDateModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4">
                    <div className="absolute inset-0" onClick={() => setShowDateModal(false)} />
                    <div className="relative w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] p-6 animate-in slide-in-from-bottom-full">
                        <h3 className="text-lg font-bold text-white mb-4">Select Date</h3>
                        <input 
                            type="date" 
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-black/50 p-4 rounded-xl border border-white/10 text-white outline-none focus:border-white/30 text-center text-lg"
                        />
                        <button onClick={() => setShowDateModal(false)} className="w-full bg-white text-black font-bold py-4 rounded-xl mt-4">Confirm</button>
                    </div>
                </div>
            )}
         </>
      )}
    </div>
  );
};