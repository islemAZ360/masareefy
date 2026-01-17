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

  // --- AI: Scan Receipt (With Death Calculation) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user.isGuest || !user.apiKey) { alert(t.guest_warning); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoadingMsg(t.analyzing);
    try {
      const result = await analyzeReceipt(file, user.apiKey, user.language);
      
      // Update UI
      setAmountStr(result.amount.toString());
      setDate(result.date);
      setVendor(result.vendor);
      setType(result.type as TransactionType);
      if (CATEGORIES.some(c => c.id === result.category)) setSelectedCategory(result.category);

      // --- THE DEATH CALCULATION LOGIC ---
      if (result.type === 'expense' && user.dailyLimit && user.dailyLimit > 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          // Calculate what has been spent today so far
          const spentToday = transactions
              .filter(tx => tx.type === 'expense' && tx.wallet === 'spending' && tx.date.startsWith(todayStr))
              .reduce((sum, tx) => sum + tx.amount, 0);
          
          const newTotal = spentToday + result.amount;
          
          if (newTotal > user.dailyLimit) {
              // Danger Mode
              const currentMoney = user.currentBalance || 0;
              const burnRate = newTotal; 
              const daysToDeath = burnRate > 0 ? (currentMoney / burnRate) : 0;
              
              const msg = user.language === 'ar'
                ? `⚠️ خطر! لقد تجاوزت حدك اليومي.\nإذا استمريت بهذا المعدل (${newTotal} يومياً)، سينفد مالك بالكامل خلال ${daysToDeath.toFixed(0)} يوم. 💀`
                : `⚠️ DANGER! You exceeded your daily limit.\nIf you continue spending ${newTotal} daily, you will go BROKE in ${daysToDeath.toFixed(0)} days. 💀`;
              
              alert(msg);
          } else {
              // Safe Mode
              const saved = user.dailyLimit - newTotal;
              const msg = user.language === 'ar'
                ? `✅ ممتاز! أنت في الأمان.\nلقد وفرت ${saved.toLocaleString()} من ميزانية اليوم.`
                : `✅ Great job! You are safe.\nYou saved ${saved.toLocaleString()} from today's budget.`;
              
              alert(msg);
          }
      }
      // -----------------------------------

    } catch (err) { 
        alert("Failed to analyze receipt. Please try again."); 
    } finally { 
        setLoadingMsg(null); 
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
            relative h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-medium transition-all duration-150 active:scale-90 select-none
            ${main 
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]' 
                : danger 
                    ? 'glass text-red-500 hover:bg-red-500/20' 
                    : 'glass text-white hover:bg-white/10'
            }
        `}
      >
          {children}
      </button>
  );

  const ToolButton = ({ icon: Icon, label, onClick, active = false }: any) => (
      <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 h-14 rounded-2xl transition-all active:scale-95 border ${active ? 'bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'glass border-transparent text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
          <Icon size={18} />
          <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </button>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white overflow-y-auto overflow-x-hidden relative">
      
      {/* 1. Top Bar */}
      <div className="pt-4 px-4 pb-2 flex items-center justify-between z-10 animate-slide-down shrink-0">
          <button onClick={onBack} className="p-3 glass rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft size={20} />
          </button>
          
          <div className="glass p-1 rounded-full flex relative overflow-hidden">
              <div 
                className={`absolute top-1 bottom-1 w-1/2 bg-white/10 rounded-full transition-all duration-300 ${type === 'income' ? 'left-1/2' : 'left-0'}`}
              ></div>
              <button 
                onClick={() => setType(TransactionType.EXPENSE)}
                className={`relative z-10 px-6 py-2 rounded-full text-xs font-bold transition-all ${type === 'expense' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-zinc-500'}`}
              >
                {t.expense}
              </button>
              <button 
                onClick={() => setType(TransactionType.INCOME)}
                className={`relative z-10 px-6 py-2 rounded-full text-xs font-bold transition-all ${type === 'income' ? 'text-sber-green drop-shadow-[0_0_8px_rgba(33,160,56,0.5)]' : 'text-zinc-500'}`}
              >
                {t.income}
              </button>
          </div>
          <div className="w-10" /> 
      </div>

      {loadingMsg ? (
         <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
             <div className="w-28 h-28 bg-sber-green/10 rounded-full flex items-center justify-center border border-sber-green/30 mb-6 relative">
                 <div className="absolute inset-0 rounded-full border-4 border-sber-green border-t-transparent animate-spin"></div>
                 <Wand2 className="w-10 h-10 text-sber-green animate-pulse" />
             </div>
             <p className="font-bold text-sber-green text-lg tracking-wide animate-pulse">{loadingMsg}</p>
         </div>
      ) : showMagicInput ? (
         <div className="flex-1 px-6 flex flex-col justify-center animate-scale-in">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Wand2 className="text-purple-400 animate-pulse" /> Magic Input
                </h3>
                <button onClick={() => setShowMagicInput(false)} className="p-2 glass rounded-full"><X size={20} /></button>
             </div>
             <textarea 
                value={magicText}
                onChange={e => setMagicText(e.target.value)}
                className="w-full h-48 glass-strong rounded-[2rem] p-6 text-white border border-white/10 focus:border-purple-500 focus:shadow-[0_0_30px_rgba(168,85,247,0.2)] outline-none resize-none mb-6 text-xl placeholder-zinc-600 leading-relaxed transition-all"
                placeholder="Ex: Spent 150 on Groceries at Lulu..."
                autoFocus
             />
             <button onClick={handleMagicAnalysis} className="w-full py-5 rounded-[1.5rem] bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg shadow-[0_0_30px_rgba(147,51,234,0.4)] active:scale-95 transition-transform hover:shadow-[0_0_50px_rgba(147,51,234,0.6)]">
                 Analyze Text
             </button>
         </div>
      ) : (
         <>
            {/* 2. Display Area (Updated Height & Spacing) */}
            <div className="flex-1 flex flex-col items-center justify-center py-6 pb-8 relative z-10 animate-scale-in shrink-0 min-h-[220px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        {/* Glow Behind Number */}
                        <div className={`absolute inset-0 blur-[60px] opacity-30 ${type === 'expense' ? 'bg-white' : 'bg-sber-green'}`}></div>
                        
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className={`text-7xl sm:text-8xl font-bold tracking-tighter tabular-nums drop-shadow-2xl ${type === 'expense' ? 'text-white' : 'text-sber-green'}`}>
                                {amountStr}
                            </span>
                            <span className="text-2xl text-zinc-500 font-medium">{user.currency}</span>
                        </div>
                    </div>

                    {/* Wallet Selector Pill */}
                    <div className="flex gap-3 mt-2">
                        <button 
                            onClick={() => setWallet('spending')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${wallet === 'spending' ? 'bg-zinc-800 border-white/30 text-white shadow-lg shadow-white/5' : 'border-transparent bg-transparent text-zinc-600 hover:text-zinc-400'}`}
                        >
                            <Wallet size={14} /> Spending
                        </button>
                        <button 
                            onClick={() => setWallet('savings')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${wallet === 'savings' ? 'bg-[#0f2e1b] border-sber-green/50 text-sber-green shadow-lg shadow-sber-green/10' : 'border-transparent bg-transparent text-zinc-600 hover:text-zinc-400'}`}
                        >
                            <PiggyBank size={14} /> Savings
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Category Strip */}
            <div className="mb-6 pl-4 z-10 animate-slide-up shrink-0 relative" style={{ animationDelay: '0.1s' }}>
                <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 pr-4 items-center">
                    {CATEGORIES.map(cat => {
                        const Icon = (Icons as any)[cat.icon] || Icons.Circle;
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex flex-col items-center gap-2 min-w-[4.5rem] transition-all duration-300 group ${isSelected ? 'scale-110 -translate-y-1' : 'opacity-60 hover:opacity-100'}`}
                            >
                                <div 
                                    className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-all relative overflow-hidden`}
                                    style={{ 
                                        backgroundColor: isSelected ? cat.color : '#1C1C1E', 
                                        border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                        boxShadow: isSelected ? `0 10px 30px -10px ${cat.color}80` : 'none'
                                    }}
                                >
                                    {isSelected && <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>}
                                    <Icon size={22} className="text-white relative z-10" />
                                </div>
                                <span className={`text-[10px] font-bold truncate max-w-full tracking-wide ${isSelected ? 'text-white drop-shadow-md' : 'text-zinc-500'}`}>
                                    {user.language === 'ar' ? cat.name_ar : cat.name_en}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 4. Tools & Keypad Container (Compact) */}
            <div className="glass-panel rounded-t-[2.5rem] p-5 pb-32 border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] z-20 animate-slide-up shrink-0" style={{ animationDelay: '0.2s' }}>
                
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
                        icon={PenLine} label={note ? "Edit" : "Note"} 
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

                {/* Keypad Grid (Tight Spacing) */}
                <div className="grid grid-cols-4 gap-3">
                    <NumpadButton onClick={() => handleNumPress('1')}>1</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('2')}>2</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('3')}>3</NumpadButton>
                    <button 
                        onClick={handleDelete} 
                        className="glass rounded-[1.5rem] flex items-center justify-center text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                    >
                        <Delete size={24} />
                    </button>

                    <NumpadButton onClick={() => handleNumPress('4')}>4</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('5')}>5</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('6')}>6</NumpadButton>
                    
                    {/* Big Save Button */}
                    <button 
                        onClick={handleSave}
                        disabled={parseFloat(amountStr) === 0}
                        className={`row-span-2 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 duration-300 ${
                            parseFloat(amountStr) > 0 
                            ? (type === 'expense' ? 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:shadow-[0_0_60px_rgba(255,255,255,0.6)]' : 'bg-sber-green text-white shadow-[0_0_40px_rgba(33,160,56,0.4)] hover:shadow-[0_0_60px_rgba(33,160,56,0.6)]') 
                            : 'glass-strong text-zinc-600'
                        }`}
                    >
                        <Check size={32} strokeWidth={3} />
                    </button>

                    <NumpadButton onClick={() => handleNumPress('7')}>7</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('8')}>8</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('9')}>9</NumpadButton>

                    <NumpadButton onClick={() => handleNumPress('.')}>.</NumpadButton>
                    <NumpadButton onClick={() => handleNumPress('0')}>0</NumpadButton>
                    <div className="flex items-center justify-center">
                        <span className="text-[10px] text-zinc-600 font-mono tracking-widest opacity-50">v2.5</span>
                    </div>
                </div>
            </div>

            {/* Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setShowNoteModal(false)} />
                    <div className="relative w-full max-w-sm glass-strong border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-slide-up shadow-2xl">
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6"></div>
                        <h3 className="text-xl font-bold text-white mb-6 text-center">Add Details</h3>
                        <input 
                            type="text" 
                            placeholder="Vendor Name (e.g. Starbucks)" 
                            value={vendor}
                            onChange={e => setVendor(e.target.value)}
                            className="w-full bg-black/50 p-5 rounded-2xl border border-white/10 text-white mb-4 outline-none focus:border-white/30 transition-all placeholder-zinc-600"
                            autoFocus
                        />
                        <textarea 
                            placeholder="Additional notes..." 
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="w-full bg-black/50 p-5 rounded-2xl border border-white/10 text-white h-32 resize-none outline-none focus:border-white/30 transition-all placeholder-zinc-600"
                        />
                        <button onClick={() => setShowNoteModal(false)} className="w-full bg-white text-black font-bold py-5 rounded-2xl mt-6 shadow-lg hover:bg-gray-200 transition-colors">Done</button>
                    </div>
                </div>
            )}

            {/* Date Modal */}
            {showDateModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setShowDateModal(false)} />
                    <div className="relative w-full max-w-sm glass-strong border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-slide-up shadow-2xl">
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6"></div>
                        <h3 className="text-xl font-bold text-white mb-6 text-center">Select Date</h3>
                        <input 
                            type="date" 
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-black/50 p-5 rounded-2xl border border-white/10 text-white outline-none focus:border-white/30 text-center text-xl font-bold transition-all"
                        />
                        <button onClick={() => setShowDateModal(false)} className="w-full bg-white text-black font-bold py-5 rounded-2xl mt-6 shadow-lg hover:bg-gray-200 transition-colors">Confirm</button>
                    </div>
                </div>
            )}
         </>
      )}
    </div>
  );
};