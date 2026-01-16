import React, { useState, useEffect } from 'react';
import { UserSettings, Currency, Language, RecurringBill } from '../types';
import { TRANSLATIONS, RUSSIAN_BANKS } from '../constants';
import { validateApiKey, analyzeOnboardingData, OnboardingAnalysisResult } from '../services/geminiService';
import { signInWithGoogle, auth, getUserData } from '../services/firebase';
import { Wallet, Check, ImageIcon, DollarSign, Upload, Zap, ArrowRight, Plus, UserCircle2, Key, CheckCircle2, Loader2, Building2, PiggyBank, CalendarClock, ChevronDown, Sparkles } from 'lucide-react';

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

// --- Visual Components ---

const AuroraBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-purple-500/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
    </div>
);

const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative z-10 bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[2.5rem] p-8 ${className}`}>
        {children}
    </div>
);

// Helper: Bank Selector Component (Styled)
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
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-4 gap-3">
                {RUSSIAN_BANKS.filter(b => b.id !== 'other').map(bank => (
                    <button
                        key={bank.id}
                        type="button"
                        onClick={() => onSelect(bank.id)}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${selectedId === bank.id ? 'bg-white/10 border-sber-green shadow-[0_0_15px_rgba(33,160,56,0.3)] scale-105' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
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
                            {selectedId === bank.id && <div className="absolute -bottom-1 -right-1 bg-sber-green w-4 h-4 rounded-full border-2 border-black flex items-center justify-center"><Check size={8} /></div>}
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
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-4 animate-in slide-in-from-top-2">
                    <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold mb-2 block tracking-wider">Bank Name</label>
                        <input 
                            type="text" 
                            value={customName} 
                            onChange={e => setCustomName(e.target.value)} 
                            placeholder="My Bank"
                            className="w-full bg-black/50 p-3 rounded-xl border border-white/10 text-white text-sm focus:border-sber-green focus:ring-1 focus:ring-sber-green outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold mb-2 block tracking-wider">Card Color</label>
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

// Helper: Smart Calendar Grid (Styled)
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
      <div className="bg-gradient-to-b from-[#1C1C1E] to-black/80 p-5 rounded-3xl border border-white/10 animate-in fade-in zoom-in duration-500 shadow-xl">
         <div className="text-center font-bold mb-4 text-white flex justify-between items-center">
           <span className="text-xs text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1"><Sparkles size={12} /> Forecast</span>
           <span className="text-sm bg-white/5 px-3 py-1 rounded-full border border-white/5">{nextDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
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
                    ? 'bg-gradient-to-tr from-sber-green to-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(33,160,56,0.5)] scale-110' 
                    : 'text-zinc-400'
                 }`}
               >
                 {day}
               </div>
             )
           })}
         </div>
         <div className="mt-4 text-center bg-sber-green/10 p-3 rounded-xl border border-sber-green/20">
             <p className="text-xs text-sber-green font-medium">
                 Expected Deposit: <span className="font-bold text-white">{nextDate.toLocaleDateString()}</span>
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

  // --- Handlers (Logic kept same, UI changes only in Render) ---

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

  // --- Render ---

  if (isRestoring) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
              <AuroraBackground />
              <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 mb-6">
                    <Loader2 className="w-10 h-10 text-sber-green animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Restoring your data...</h2>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden font-sans">
        <AuroraBackground />
        
        {/* Step Indicator (Floating) */}
        {step > 0 && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-20">
            {[1,2,3,4,5,6,7].map(s => (
                <div 
                    key={s} 
                    className={`h-2 rounded-full transition-all duration-500 ${
                        s === step ? 'w-8 bg-sber-green shadow-[0_0_10px_rgba(33,160,56,0.5)]' : 
                        s < step ? 'w-2 bg-white/50' : 'w-2 bg-white/10'
                    }`} 
                />
            ))}
            </div>
        )}

        {/* Step 0: Welcome Screen */}
        {step === 0 && (
          <GlassCard className="w-full max-w-sm animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 bg-gradient-to-tr from-sber-green to-emerald-600 rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-[0_20px_40px_-10px_rgba(33,160,56,0.4)] relative">
              <div className="absolute inset-0 bg-white/20 rounded-[2rem] blur-xl opacity-50 animate-pulse"></div>
              <Wallet className="text-white w-10 h-10 relative z-10" />
            </div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">{t.welcome}</h1>
            <p className="text-zinc-400 mb-10 text-base font-light">{t.setup_title}</p>
            
            <button onClick={handleGoogleSignIn} className="w-full bg-white text-black font-bold p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-95 mb-4 shadow-lg group">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {t.sign_in_google}
            </button>
            <button onClick={() => { setUser(u => ({...u, isGuest: false, name: ''})); setStep(1); }} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-3 border border-white/10 transition-all active:scale-95 backdrop-blur-md">
                <UserCircle2 className="w-5 h-5 text-zinc-400" />
                {t.guest_mode}
            </button>
          </GlassCard>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
             <div className="text-left mb-8">
                 <h2 className="text-3xl font-bold mb-2 text-white">{t.enter_name}</h2>
                 <p className="text-zinc-400 text-sm">Let's personalize your experience.</p>
             </div>
             
             <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="text-left group">
                  <label className="text-xs text-zinc-500 ml-1 mb-2 block uppercase font-bold tracking-widest group-focus-within:text-sber-green transition-colors">{t.enter_name}</label>
                  <input type="text" className="w-full bg-black/50 p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:ring-1 focus:ring-sber-green outline-none text-white transition-all placeholder-zinc-700" placeholder="John Doe" value={user.name} onChange={e => setUser({...user, name: e.target.value})} required autoFocus />
              </div>

              <div className="text-left group">
                <label className="text-xs text-zinc-500 ml-1 mb-2 block uppercase font-bold tracking-widest group-focus-within:text-sber-green transition-colors">{t.enter_key}</label>
                <div className="relative">
                    <input type="password" className={`w-full bg-black/50 p-4 pr-14 rounded-2xl border outline-none text-white transition-all placeholder-zinc-700 ${keyStatus === 'valid' ? 'border-sber-green ring-1 ring-sber-green' : keyStatus === 'invalid' ? 'border-red-500' : 'border-white/10 focus:border-sber-green'}`} placeholder="AI Studio Key" value={user.apiKey} onChange={e => { setUser({...user, apiKey: e.target.value}); setKeyStatus('idle'); }} required />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button type="button" onClick={checkApiKey} disabled={!user.apiKey} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${keyStatus === 'valid' ? 'bg-sber-green text-white shadow-[0_0_15px_rgba(33,160,56,0.5)]' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>
                            {keyStatus === 'valid' ? <CheckCircle2 size={20} /> : <Key size={20} />}
                        </button>
                    </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                 <select className="flex-1 bg-black/50 p-4 rounded-2xl border border-white/10 text-white outline-none focus:border-sber-green appearance-none" value={user.currency} onChange={e => setUser({...user, currency: e.target.value as Currency})}>
                    <option value="USD">USD ($)</option>
                    <option value="SAR">SAR (﷼)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="RUB">RUB (₽)</option>
                 </select>
                 <select className="flex-1 bg-black/50 p-4 rounded-2xl border border-white/10 text-white outline-none focus:border-sber-green appearance-none" value={user.language} onChange={e => setUser({...user, language: e.target.value as Language})}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                    <option value="ru">Русский</option>
                 </select>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-sber-green to-emerald-600 hover:to-emerald-500 font-bold p-4 rounded-2xl mt-4 flex justify-center gap-2 items-center shadow-lg shadow-emerald-900/50 transition-all active:scale-95" disabled={isValidating}>
                {isValidating ? <Loader2 className="animate-spin" /> : <>{t.start} <ArrowRight size={20} /></>}
              </button>
             </form>
          </GlassCard>
        )}

        {/* Step 2: Balance */}
        {step === 2 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold mb-2 text-white">{t.step_balance}</h2>
            <p className="text-zinc-400 mb-8 text-sm">{t.step_balance_desc}</p>
            <div 
                className={`h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${balanceFile ? 'border-sber-green bg-sber-green/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`} 
                onClick={() => document.getElementById('balanceInput')?.click()}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${balanceFile ? 'bg-sber-green text-white shadow-[0_0_20px_rgba(33,160,56,0.4)]' : 'bg-white/5 text-zinc-500 group-hover:scale-110'}`}>
                 {balanceFile ? <Check size={32} /> : <ImageIcon size={32} />}
              </div>
              <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">{balanceFile ? balanceFile.name : t.upload_image}</span>
              <input id="balanceInput" type="file" accept="image/*" className="hidden" onChange={(e) => setBalanceFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(3)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold shadow-lg shadow-white/10 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100" disabled={!balanceFile}>Next Step</button>
          </GlassCard>
        )}

        {/* Step 3: Salary */}
        {step === 3 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold mb-2 text-white">{t.step_salary}</h2>
            <p className="text-zinc-400 mb-8 text-sm">Upload last salary slip to detect date.</p>
            <div 
                className={`h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${salaryFile ? 'border-sber-green bg-sber-green/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`} 
                onClick={() => document.getElementById('salaryInput')?.click()}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${salaryFile ? 'bg-sber-green text-white shadow-[0_0_20px_rgba(33,160,56,0.4)]' : 'bg-white/5 text-zinc-500 group-hover:scale-110'}`}>
                 {salaryFile ? <Check size={32} /> : <DollarSign size={32} />}
              </div>
              <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">{salaryFile ? salaryFile.name : t.upload_image}</span>
              <input id="salaryInput" type="file" accept="image/*" className="hidden" onChange={(e) => setSalaryFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold shadow-lg shadow-white/10 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100" disabled={!salaryFile}>Next Step</button>
          </GlassCard>
        )}

        {/* Step 4: Expenses */}
        {step === 4 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold mb-2 text-white">{t.step_expenses}</h2>
            <p className="text-zinc-400 mb-8 text-sm">Upload multiple receipts to learn habits.</p>
            <div 
                className={`h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${expenseFiles.length ? 'border-sber-green bg-sber-green/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`} 
                onClick={() => document.getElementById('expensesInput')?.click()}
            >
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${expenseFiles.length ? 'bg-sber-green text-white shadow-[0_0_20px_rgba(33,160,56,0.4)]' : 'bg-white/5 text-zinc-500 group-hover:scale-110'}`}>
                 {expenseFiles.length ? <span className="font-bold text-lg">{expenseFiles.length}</span> : <Upload size={32} />}
               </div>
               <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">{expenseFiles.length ? 'Files Selected' : 'Upload Receipts'}</span>
               <input id="expensesInput" type="file" accept="image/*" multiple className="hidden" onChange={(e) => setExpenseFiles(Array.from(e.target.files || []))} />
            </div>
            <button onClick={() => setStep(5)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold shadow-lg shadow-white/10 hover:bg-gray-200 transition-all active:scale-95">Next Step</button>
          </GlassCard>
        )}

        {/* Step 5: Recurring Bills */}
        {step === 5 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
             <h2 className="text-2xl font-bold mb-2 text-white">{t.step_recurring}</h2>
             <p className="text-zinc-400 mb-6 text-sm">Rent, Internet, Netflix, etc.</p>
             
             <div className="bg-black/30 p-4 rounded-2xl border border-white/5 mb-6 space-y-3">
                <input type="text" placeholder={t.bill_name} value={newBillName} onChange={e => setNewBillName(e.target.value)} className="w-full bg-black/50 p-3 rounded-xl border border-white/10 outline-none text-sm text-white focus:border-sber-green" />
                <div className="flex gap-2">
                   <input type="number" placeholder={t.bill_amount} value={newBillAmount} onChange={e => setNewBillAmount(e.target.value)} className="w-full bg-black/50 p-3 rounded-xl border border-white/10 outline-none text-sm text-white focus:border-sber-green" />
                   <button onClick={() => { if(newBillName && newBillAmount) { setRecurringBills([...recurringBills, { id: Date.now().toString(), name: newBillName, amount: Number(newBillAmount) }]); setNewBillName(''); setNewBillAmount(''); } }} className="bg-sber-green p-3 rounded-xl text-white hover:bg-green-600 transition-colors"><Plus /></button>
                </div>
                {recurringBills.length > 0 && (
                    <div className="space-y-2 pt-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {recurringBills.map(b => (
                            <div key={b.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                <span className="text-sm font-medium">{b.name}</span> 
                                <span className="text-xs font-bold text-zinc-400">{b.amount}</span>
                            </div>
                        ))}
                    </div>
                )}
             </div>
             <button onClick={handleStartAnalysis} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:to-indigo-500 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition-all active:scale-95">
                 Analyze All <Zap size={18} className="fill-current" />
             </button>
          </GlassCard>
        )}

        {/* Step 6: Loading */}
        {step === 6 && (
           <div className="flex flex-col items-center justify-center animate-in fade-in duration-700">
              <div className="relative">
                  <div className="absolute inset-0 bg-sber-green/20 blur-xl rounded-full"></div>
                  <Loader2 className="w-20 h-20 text-sber-green animate-spin relative z-10" />
              </div>
              <h2 className="text-2xl font-bold mt-8 text-white">{t.analyzing_all}</h2>
              <p className="text-zinc-400 mt-2 text-sm">AI is building your profile...</p>
           </div>
        )}

        {/* Step 7: Final Review */}
        {step === 7 && analysisResult && (
           <div className="w-full max-w-sm animate-in slide-in-from-bottom duration-700 pb-10">
              <h2 className="text-3xl font-bold mb-2 text-white">{t.step_review}</h2>
              <p className="text-zinc-400 mb-8 text-sm">Configure your smart wallets.</p>
              
              <div className="space-y-4">
                 {/* 1. Spending Wallet Config */}
                 <div className="bg-[#1C1C1E] p-5 rounded-[2rem] border border-white/10 space-y-4 shadow-xl">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2 text-zinc-300">
                            <Wallet size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Spending</span>
                        </div>
                        <span className="font-mono font-bold text-white text-xl">{analysisResult.currentBalance.toLocaleString()}</span>
                    </div>

                    <div className="pt-1">
                        <button 
                            onClick={() => setShowSpendingBankEdit(!showSpendingBankEdit)}
                            className="w-full flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all group"
                        >
                            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Bank Account</span>
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
                 <div className="bg-[#1C1C1E] p-5 rounded-[2rem] border border-white/10 space-y-4 shadow-xl">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 text-sber-green">
                            <PiggyBank size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Savings Pot</span>
                        </div>
                        <input 
                            type="number" 
                            value={savingsInitial} 
                            onChange={e => setSavingsInitial(Number(e.target.value))}
                            className="bg-black/50 text-white w-28 text-right p-2 rounded-xl text-lg font-bold border border-white/10 outline-none focus:border-sber-green transition-all"
                            placeholder="0.00"
                        />
                    </div>
                    
                    <div className="pt-2">
                            <button 
                                onClick={() => setShowSavingsBankEdit(!showSavingsBankEdit)}
                                className="w-full flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all group"
                            >
                                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Bank Account</span>
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
                 <div className="bg-[#1C1C1E] p-5 rounded-[2rem] border border-white/10 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarClock className="text-purple-400 w-5 h-5" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Salary Cycle</span>
                    </div>
                    
                    <div className="mb-4 flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5">
                        <p className="text-xs text-zinc-400">Last detected salary:</p>
                        <p className="text-white font-mono font-bold">
                            {analysisResult.lastSalary.date}
                        </p>
                    </div>

                    <div className="mb-6">
                        <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Pay Interval (Days)</label>
                        <input 
                            type="number" 
                            value={salaryInterval} 
                            onChange={e => setSalaryInterval(Number(e.target.value))}
                            className="w-full bg-black/50 text-white p-3 rounded-xl border border-white/10 text-center font-bold text-lg outline-none focus:border-purple-500 transition-all"
                        />
                    </div>

                    <SmartCalendar lastSalaryDate={analysisResult.lastSalary.date} interval={salaryInterval} />
                 </div>

                 <button onClick={handleFinalize} className="w-full bg-white text-black p-4 rounded-2xl mt-4 font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-gray-200 transition-all active:scale-95 text-lg">
                    {t.confirm_setup}
                 </button>
              </div>
           </div>
        )}
    </div>
  );
};