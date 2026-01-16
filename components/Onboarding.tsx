import React, { useState, useEffect } from 'react';
import { UserSettings, Currency, Language, RecurringBill } from '../types';
import { TRANSLATIONS, RUSSIAN_BANKS } from '../constants';
import { validateApiKey, analyzeOnboardingData, OnboardingAnalysisResult } from '../services/geminiService';
import { signInWithGoogle, auth, getUserData } from '../services/firebase';
import { Wallet, Check, ImageIcon, DollarSign, Upload, Zap, ArrowRight, Plus, UserCircle2, Key, CheckCircle2, Loader2, Building2, PiggyBank, CalendarClock, ChevronDown } from 'lucide-react';

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

// Helper: Bank Selector Component
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
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
                {RUSSIAN_BANKS.filter(b => b.id !== 'other').map(bank => (
                    <button
                        key={bank.id}
                        type="button"
                        onClick={() => onSelect(bank.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border ${selectedId === bank.id ? 'bg-white/10 border-sber-green scale-105' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
                    >
                        <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg"
                            style={{ backgroundColor: bank.color, color: bank.textColor }}
                        >
                            {bank.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[9px] text-zinc-400 truncate w-full">{bank.name}</span>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onSelect('other')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border ${isCustom ? 'bg-white/10 border-sber-green scale-105' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
                >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] bg-zinc-700 text-white">
                        ...
                    </div>
                    <span className="text-[9px] text-zinc-400">Custom</span>
                </button>
            </div>

            {isCustom && (
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2 space-y-3">
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Bank Name</label>
                        <input 
                            type="text" 
                            value={customName} 
                            onChange={e => setCustomName(e.target.value)} 
                            placeholder="My Bank"
                            className="w-full bg-black p-2 rounded-lg border border-zinc-700 text-white text-sm focus:border-sber-green outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Card Color</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {['#21A038', '#EF3124', '#002882', '#FFDD2D', '#000000', '#BF5AF2', '#FF9500'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCustomColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform ${customColor === c ? 'border-white scale-110' : 'border-transparent'}`}
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

  // Spending Bank State - Default Custom/Open
  const [spendingBankId, setSpendingBankId] = useState<string>('other');
  const [customSpendingName, setCustomSpendingName] = useState('Main Account');
  const [customSpendingColor, setCustomSpendingColor] = useState('#1C1C1E');
  const [showSpendingBankEdit, setShowSpendingBankEdit] = useState(true);

  // Savings Bank State - Default Custom/Open
  const [savingsBankId, setSavingsBankId] = useState<string>('other');
  const [customSavingsName, setCustomSavingsName] = useState('Savings Pot');
  const [customSavingsColor, setCustomSavingsColor] = useState('#21A038');
  const [showSavingsBankEdit, setShowSavingsBankEdit] = useState(true);

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
    if (!user.name.trim()) return alert("Please enter your name");
    
    // Bank selection moved to step 7
    
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

      // Validate Custom Names
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

        {/* Step 1: Profile ONLY */}
        {step === 1 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300 pb-20">
             <h2 className="text-3xl font-bold mb-2 text-left">{t.enter_name}</h2>
             <p className="text-zinc-400 mb-6 text-left text-sm">Let's set up your profile.</p>
             
             <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="text-left">
                  <label className="text-xs text-zinc-500 ml-1 mb-2 block uppercase font-bold">{t.enter_name}</label>
                  <input type="text" className="w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 focus:border-sber-green outline-none text-white" placeholder="John Doe" value={user.name} onChange={e => setUser({...user, name: e.target.value})} required />
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

        {/* Steps 2-6 (Files) remain the same */}
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
              <p className="text-zinc-400 mb-6 text-sm">Configure your cycle and wallets.</p>
              
              <div className="space-y-4">
                 {/* 1. Spending Wallet Config */}
                 <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-zinc-800 space-y-3">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Wallet size={16} /> <span className="text-xs font-bold uppercase">Spending</span>
                        </div>
                        <span className="font-mono font-bold text-white">{analysisResult.currentBalance.toLocaleString()}</span>
                    </div>

                    <div className="pt-2">
                        <button 
                        onClick={() => setShowSpendingBankEdit(!showSpendingBankEdit)}
                        className="w-full flex justify-between items-center text-[10px] text-zinc-500 hover:text-white transition-colors"
                        >
                            <span>Bank: <span className="text-white font-bold">{spendingBankId === 'other' ? customSpendingName || 'Custom' : RUSSIAN_BANKS.find(b => b.id === spendingBankId)?.name}</span></span>
                            <ChevronDown size={12} className={`transition-transform ${showSpendingBankEdit ? 'rotate-180' : ''}`} />
                        </button>

                        {showSpendingBankEdit && (
                            <div className="mt-3 border-t border-white/5 pt-3">
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
                 <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-zinc-800 space-y-3">
                    <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2 text-sber-green">
                            <PiggyBank size={16} /> <span className="text-xs font-bold uppercase">Savings</span>
                        </div>
                        <input 
                            type="number" 
                            value={savingsInitial} 
                            onChange={e => setSavingsInitial(Number(e.target.value))}
                            className="bg-black/50 text-white w-24 text-right p-1 rounded-md text-sm border border-zinc-700 outline-none focus:border-sber-green"
                            placeholder="0.00"
                        />
                    </div>
                    
                    <div className="border-t border-white/5 pt-2 mt-2">
                            <button 
                            onClick={() => setShowSavingsBankEdit(!showSavingsBankEdit)}
                            className="w-full flex justify-between items-center text-[10px] text-zinc-500 hover:text-white transition-colors"
                            >
                                <span>Bank: <span className="text-white font-bold">{savingsBankId === 'other' ? customSavingsName || 'Custom' : RUSSIAN_BANKS.find(b => b.id === savingsBankId)?.name}</span></span>
                                <ChevronDown size={12} className={`transition-transform ${showSavingsBankEdit ? 'rotate-180' : ''}`} />
                            </button>

                            {showSavingsBankEdit && (
                                <div className="mt-3">
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