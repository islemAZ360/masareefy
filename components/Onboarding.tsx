import React, { useState, useEffect } from 'react';
import { UserSettings, Currency, Language, RecurringBill } from '../types';
import { TRANSLATIONS, RUSSIAN_BANKS } from '../constants';
import { validateApiKey, analyzeOnboardingData, OnboardingAnalysisResult } from '../services/geminiService';
import { signInWithGoogle, auth, getUserData } from '../services/firebase';
import { Wallet, Check, ImageIcon, DollarSign, Upload, Zap, ArrowRight, Plus, UserCircle2, Key, CheckCircle2, Loader2, PiggyBank, CalendarClock, ChevronDown, Sparkles, ScanLine, Smartphone, CreditCard, ShieldCheck } from 'lucide-react';

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

const AmbientBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#000000]">
        <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-purple-900/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-emerald-900/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay"></div>
    </div>
);

const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative z-10 bg-[#09090b]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-8 overflow-hidden ${className}`}>
        {/* Holographic Edge */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        {children}
    </div>
);

// Helper: Bank Selector Component (Modern Tiles)
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
            <div className="grid grid-cols-4 gap-3 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {RUSSIAN_BANKS.filter(b => b.id !== 'other').map(bank => (
                    <button
                        key={bank.id}
                        type="button"
                        onClick={() => onSelect(bank.id)}
                        className={`group flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-300 border ${selectedId === bank.id ? 'bg-white/10 border-sber-green shadow-[0_0_15px_rgba(33,160,56,0.3)] scale-105' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}
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
                    className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all border ${isCustom ? 'bg-white/10 border-sber-green shadow-lg scale-105' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}
                >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-zinc-800 text-white border border-white/10">
                        <Plus size={16} />
                    </div>
                </button>
            </div>

            {isCustom && (
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-4 animate-in slide-in-from-top-2">
                    <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Bank Name</label>
                        <input 
                            type="text" 
                            value={customName} 
                            onChange={e => setCustomName(e.target.value)} 
                            placeholder="My Bank"
                            className="w-full bg-black p-3 rounded-xl border border-white/10 text-white text-sm focus:border-sber-green focus:shadow-[0_0_15px_rgba(33,160,56,0.2)] outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Card Color</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {['#21A038', '#EF3124', '#002882', '#FFDD2D', '#000000', '#BF5AF2', '#FF9500'].map(c => (
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

// Helper: Smart Calendar Grid (Modern)
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
      <div className="bg-black/40 p-5 rounded-3xl border border-white/5 animate-in fade-in zoom-in duration-500">
         <div className="flex justify-between items-center mb-4">
           <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1">
               <Sparkles size={10} /> Prediction
           </span>
           <span className="text-xs font-bold text-white bg-white/5 px-3 py-1 rounded-full border border-white/5">
               {nextDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
           </span>
         </div>
         <div className="grid grid-cols-7 gap-1 text-center mb-2">
           {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-[9px] text-zinc-600 font-bold">{d}</div>)}
           {days.map((day, idx) => {
             if (!day) return <div key={idx}></div>;
             const isNextPayday = day === nextDate.getDate();
             return (
               <div 
                 key={idx}
                 className={`text-[10px] h-7 w-7 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${
                    isNextPayday 
                    ? 'bg-sber-green text-white font-bold shadow-[0_0_10px_rgba(33,160,56,0.6)] scale-110' 
                    : 'text-zinc-500'
                 }`}
               >
                 {day}
               </div>
             )
           })}
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

  // Spending Bank State
  const [spendingBankId, setSpendingBankId] = useState<string>('other');
  const [customSpendingName, setCustomSpendingName] = useState('Main Account');
  const [customSpendingColor, setCustomSpendingColor] = useState('#1C1C1E');
  const [showSpendingBankEdit, setShowSpendingBankEdit] = useState(true);

  // Savings Bank State
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

  // Reusable File Upload "Scanner"
  const ScannerZone = ({ label, file, onChange, icon: Icon, subLabel }: any) => (
      <div 
        onClick={onChange}
        className={`relative h-48 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden group transition-all duration-300 ${file ? 'bg-sber-green/5 border-sber-green/30' : 'bg-black/30 hover:bg-white/5'}`}
      >
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
         {/* Scanner Line Animation */}
         <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent translate-y-[-10px] group-hover:translate-y-[200px] transition-transform duration-[1.5s] ease-linear"></div>
         
         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${file ? 'bg-sber-green text-white shadow-[0_0_20px_rgba(33,160,56,0.4)] scale-110' : 'bg-white/5 text-zinc-500 group-hover:scale-105 group-hover:bg-white/10'}`}>
             {file ? <Check size={32} /> : <Icon size={32} strokeWidth={1.5} />}
         </div>
         <p className="text-sm font-bold text-white z-10">{file ? (file.name || "File Uploaded") : label}</p>
         <p className="text-[10px] text-zinc-500 z-10 mt-1 uppercase tracking-wider">{subLabel}</p>
      </div>
  );

  // --- Render ---

  if (isRestoring) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
              <AmbientBackground />
              <div className="relative z-10 flex flex-col items-center">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 mb-6 relative">
                    <div className="absolute inset-0 border-2 border-sber-green rounded-full border-t-transparent animate-spin"></div>
                    <Loader2 className="w-10 h-10 text-sber-green animate-pulse" />
                  </div>
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Restoring Neural Data...</h2>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] flex flex-col items-center justify-start sm:justify-center px-6 pt-28 pb-20 text-center text-white relative overflow-y-auto overflow-x-hidden font-sans">
        <AmbientBackground />
        
        {/* Step Indicator (Floating HUD) */}
        {step > 0 && (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 flex gap-1 p-1.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 z-50 shadow-2xl">
                {[1,2,3,4,5,6,7].map(s => (
                    <div 
                        key={s} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                            s === step ? 'w-8 bg-sber-green shadow-[0_0_10px_rgba(33,160,56,0.5)]' : 
                            s < step ? 'w-2 bg-white/40' : 'w-2 bg-white/10'
                        }`} 
                    />
                ))}
            </div>
        )}

        {/* Step 0: Welcome Screen */}
        {step === 0 && (
          <GlassCard className="w-full max-w-sm animate-in fade-in zoom-in duration-700 my-auto">
            <div className="relative w-32 h-32 mx-auto mb-8 group">
               <div className="absolute inset-0 bg-sber-green/20 blur-[50px] rounded-full animate-pulse-slow"></div>
               <img 
                 src="/app.png" 
                 alt="Masareefy" 
                 className="relative z-10 w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 rounded-[2.5rem]"
               />
            </div>
            
            <h1 className="text-4xl font-black mb-3 tracking-tighter text-white">
                Masareefy<span className="text-sber-green">.AI</span>
            </h1>
            <p className="text-zinc-400 mb-10 text-sm font-medium leading-relaxed max-w-[80%] mx-auto">
                Next-gen financial operating system powered by Neural Titan Engine.
            </p>
            
            <button onClick={handleGoogleSignIn} className="w-full bg-white text-black font-bold p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-95 mb-3 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {t.sign_in_google}
            </button>
            <button onClick={() => { setUser(u => ({...u, isGuest: false, name: ''})); setStep(1); }} className="w-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-3 border border-white/5 transition-all active:scale-95">
                <UserCircle2 className="w-5 h-5" />
                {t.guest_mode}
            </button>
          </GlassCard>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
             <div className="text-left mb-8">
                 <h2 className="text-3xl font-bold mb-2 text-white">{t.enter_name}</h2>
                 <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Identify yourself to the system.</p>
             </div>
             
             <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="text-left group">
                  <label className="text-[10px] text-zinc-500 ml-1 mb-2 block uppercase font-bold tracking-[0.2em] group-focus-within:text-sber-green transition-colors">{t.enter_name}</label>
                  <input type="text" className="w-full bg-black/50 p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:shadow-[0_0_20px_rgba(33,160,56,0.2)] outline-none text-white transition-all placeholder-zinc-800 font-medium" placeholder="Ex: John Doe" value={user.name} onChange={e => setUser({...user, name: e.target.value})} required autoFocus />
              </div>

              <div className="text-left group">
                <label className="text-[10px] text-zinc-500 ml-1 mb-2 block uppercase font-bold tracking-[0.2em] group-focus-within:text-sber-green transition-colors">{t.enter_key}</label>
                <div className="relative">
                    <input type="password" className={`w-full bg-black/50 p-4 pr-14 rounded-2xl border outline-none text-white transition-all placeholder-zinc-800 font-mono ${keyStatus === 'valid' ? 'border-sber-green shadow-[0_0_20px_rgba(33,160,56,0.2)]' : keyStatus === 'invalid' ? 'border-red-500' : 'border-white/10 focus:border-sber-green'}`} placeholder="AI Studio Key" value={user.apiKey} onChange={e => { setUser({...user, apiKey: e.target.value}); setKeyStatus('idle'); }} required />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button type="button" onClick={checkApiKey} disabled={!user.apiKey} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${keyStatus === 'valid' ? 'bg-sber-green text-white shadow-lg' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>
                            {keyStatus === 'valid' ? <CheckCircle2 size={18} /> : <Key size={18} />}
                        </button>
                    </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                 <div className="flex-1 relative">
                     <div className="absolute top-2 left-3 text-[8px] text-zinc-500 font-bold uppercase">Currency</div>
                     <select className="w-full bg-black/50 pt-6 pb-2 px-3 rounded-2xl border border-white/10 text-white outline-none focus:border-sber-green appearance-none text-sm font-bold" value={user.currency} onChange={e => setUser({...user, currency: e.target.value as Currency})}>
                        <option value="USD">USD ($)</option>
                        <option value="SAR">SAR (﷼)</option>
                        <option value="AED">AED (د.إ)</option>
                        <option value="RUB">RUB (₽)</option>
                     </select>
                 </div>
                 <div className="flex-1 relative">
                     <div className="absolute top-2 left-3 text-[8px] text-zinc-500 font-bold uppercase">Language</div>
                     <select className="w-full bg-black/50 pt-6 pb-2 px-3 rounded-2xl border border-white/10 text-white outline-none focus:border-sber-green appearance-none text-sm font-bold" value={user.language} onChange={e => setUser({...user, language: e.target.value as Language})}>
                        <option value="en">English</option>
                        <option value="ar">العربية</option>
                        <option value="ru">Русский</option>
                     </select>
                 </div>
              </div>

              <button type="submit" className="w-full bg-white text-black font-bold p-4 rounded-2xl mt-4 flex justify-center gap-2 items-center shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-gray-200 transition-all active:scale-95" disabled={isValidating}>
                {isValidating ? <Loader2 className="animate-spin" /> : <>{t.start} <ArrowRight size={20} /></>}
              </button>
             </form>
          </GlassCard>
        )}

        {/* Step 2: Balance */}
        {step === 2 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold mb-2 text-white">{t.step_balance}</h2>
            <p className="text-zinc-500 mb-8 text-xs font-mono uppercase tracking-wide">Data Source: Banking App Screenshot</p>
            
            <ScannerZone 
                label={t.upload_image} 
                subLabel="Current Balance"
                file={balanceFile} 
                onChange={() => document.getElementById('balanceInput')?.click()} 
                icon={Smartphone}
            />
            <input id="balanceInput" type="file" accept="image/*" className="hidden" onChange={(e) => setBalanceFile(e.target.files?.[0] || null)} />
            
            <button onClick={() => setStep(3)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold shadow-lg disabled:opacity-50 disabled:active:scale-100 transition-all hover:scale-[1.02]" disabled={!balanceFile}>Confirm Data</button>
          </GlassCard>
        )}

        {/* Step 3: Salary */}
        {step === 3 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold mb-2 text-white">{t.step_salary}</h2>
            <p className="text-zinc-500 mb-8 text-xs font-mono uppercase tracking-wide">Data Source: Payslip / SMS</p>
            
            <ScannerZone 
                label={t.upload_image} 
                subLabel="Last Salary Notification"
                file={salaryFile} 
                onChange={() => document.getElementById('salaryInput')?.click()} 
                icon={CreditCard}
            />
            <input id="salaryInput" type="file" accept="image/*" className="hidden" onChange={(e) => setSalaryFile(e.target.files?.[0] || null)} />
            
            <button onClick={() => setStep(4)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold shadow-lg disabled:opacity-50 disabled:active:scale-100 transition-all hover:scale-[1.02]" disabled={!salaryFile}>Confirm Data</button>
          </GlassCard>
        )}

        {/* Step 4: Expenses */}
        {step === 4 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold mb-2 text-white">{t.step_expenses}</h2>
            <p className="text-zinc-500 mb-8 text-xs font-mono uppercase tracking-wide">Upload multiple to train AI.</p>
            
            <div 
                onClick={() => document.getElementById('expensesInput')?.click()}
                className={`relative h-56 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden group transition-all duration-300 ${expenseFiles.length ? 'bg-sber-green/5 border-sber-green/30' : 'bg-black/30 hover:bg-white/5'}`}
            >
               <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent translate-y-[-10px] group-hover:translate-y-[220px] transition-transform duration-[2s] ease-linear"></div>
               
               <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${expenseFiles.length ? 'bg-sber-green text-white shadow-[0_0_30px_rgba(33,160,56,0.4)] scale-110' : 'bg-white/5 text-zinc-500 group-hover:bg-white/10'}`}>
                 {expenseFiles.length ? <span className="font-bold text-2xl">{expenseFiles.length}</span> : <ScanLine size={32} strokeWidth={1.5} />}
               </div>
               <span className="text-sm font-bold text-white z-10">{expenseFiles.length ? 'Receipts Scanned' : 'Bulk Scan'}</span>
               <input id="expensesInput" type="file" accept="image/*" multiple className="hidden" onChange={(e) => setExpenseFiles(Array.from(e.target.files || []))} />
            </div>
            
            <button onClick={() => setStep(5)} className="w-full bg-white text-black p-4 rounded-2xl mt-8 font-bold shadow-lg transition-all hover:scale-[1.02]">Proceed</button>
          </GlassCard>
        )}

        {/* Step 5: Recurring Bills */}
        {step === 5 && (
          <GlassCard className="w-full max-w-sm animate-in slide-in-from-right duration-500">
             <h2 className="text-2xl font-bold mb-2 text-white">{t.step_recurring}</h2>
             <p className="text-zinc-500 mb-6 text-xs font-mono uppercase tracking-wide">Manual Entry: Fixed Obligations</p>
             
             <div className="bg-black/40 p-4 rounded-[1.5rem] border border-white/5 mb-6 space-y-3">
                <input type="text" placeholder={t.bill_name} value={newBillName} onChange={e => setNewBillName(e.target.value)} className="w-full bg-black/50 p-3 rounded-xl border border-white/10 outline-none text-sm text-white focus:border-sber-green placeholder-zinc-700" />
                <div className="flex gap-2">
                   <div className="relative flex-1">
                     <input type="number" placeholder={t.bill_amount} value={newBillAmount} onChange={e => setNewBillAmount(e.target.value)} className="w-full bg-black/50 p-3 rounded-xl border border-white/10 outline-none text-sm text-white focus:border-sber-green placeholder-zinc-700" />
                   </div>
                   <button onClick={() => { if(newBillName && newBillAmount) { setRecurringBills([...recurringBills, { id: Date.now().toString(), name: newBillName, amount: Number(newBillAmount) }]); setNewBillName(''); setNewBillAmount(''); } }} className="bg-white text-black p-3 rounded-xl hover:bg-gray-200 transition-colors"><Plus /></button>
                </div>
                
                {/* Bills List */}
                {recurringBills.length > 0 && (
                    <div className="space-y-2 pt-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {recurringBills.map(b => (
                            <div key={b.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 animate-in slide-in-from-left">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                    <span className="text-xs font-medium">{b.name}</span>
                                </div>
                                <span className="text-xs font-bold text-white font-mono">{b.amount}</span>
                            </div>
                        ))}
                    </div>
                )}
             </div>
             <button onClick={handleStartAnalysis} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_50px_rgba(147,51,234,0.5)] transition-all active:scale-95">
                 Initialize Neural Engine <Zap size={18} className="fill-white" />
             </button>
          </GlassCard>
        )}

        {/* Step 6: Loading (Matrix Effect) */}
        {step === 6 && (
           <div className="flex flex-col items-center justify-center animate-in fade-in duration-700 my-auto">
              <div className="relative w-32 h-32 mb-8">
                  <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full animate-spin-slow"></div>
                  <div className="absolute inset-4 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
                  </div>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-wide">{t.analyzing_all}</h2>
              <div className="mt-4 flex flex-col gap-2 items-center">
                  <span className="text-xs text-purple-400 font-mono animate-pulse">OCR SCANNING...</span>
                  <span className="text-xs text-indigo-400 font-mono animate-pulse" style={{ animationDelay: '0.5s' }}>PATTERN RECOGNITION...</span>
                  <span className="text-xs text-sber-green font-mono animate-pulse" style={{ animationDelay: '1s' }}>BUILDING PROFILE...</span>
              </div>
           </div>
        )}

        {/* Step 7: Final Review */}
        {step === 7 && analysisResult && (
           <div className="w-full max-w-sm animate-in slide-in-from-bottom duration-700 pb-24 relative z-10">
              <h2 className="text-3xl font-bold mb-2 text-white">System Ready</h2>
              <p className="text-zinc-500 mb-8 text-xs font-mono uppercase">Verify Configuration</p>
              
              <div className="space-y-4">
                 {/* 1. Spending Wallet Config */}
                 <div className="bg-[#121212] p-5 rounded-[2rem] border border-white/10 space-y-4 shadow-xl relative overflow-hidden z-10">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet size={64} /></div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2 text-zinc-300">
                            <Wallet size={16} /> <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Spending</span>
                        </div>
                        <span className="font-mono font-bold text-white text-lg">{analysisResult.currentBalance.toLocaleString()}</span>
                    </div>

                    <div className="pt-1">
                        <button 
                            onClick={() => setShowSpendingBankEdit(!showSpendingBankEdit)}
                            className="w-full flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all group"
                        >
                            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Bank Integration</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: customSpendingColor }}></div>
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
                 <div className="bg-[#121212] p-5 rounded-[2rem] border border-white/10 space-y-4 shadow-xl relative overflow-hidden z-10">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-sber-green"><PiggyBank size={64} /></div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 text-sber-green">
                            <PiggyBank size={16} /> <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Savings Pot</span>
                        </div>
                        <input 
                            type="number" 
                            value={savingsInitial} 
                            onChange={e => setSavingsInitial(Number(e.target.value))}
                            className="bg-black/50 text-white w-28 text-right p-2 rounded-xl text-lg font-bold border border-white/10 outline-none focus:border-sber-green transition-all font-mono"
                            placeholder="0.00"
                        />
                    </div>
                    
                    <div className="pt-2">
                            <button 
                                onClick={() => setShowSavingsBankEdit(!showSavingsBankEdit)}
                                className="w-full flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all group"
                            >
                                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Bank Integration</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: customSavingsColor }}></div>
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
                 <div className="bg-[#121212] p-5 rounded-[2rem] border border-white/10 shadow-xl relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarClock className="text-purple-400 w-4 h-4" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Salary Cycle</span>
                    </div>
                    
                    <div className="mb-4 flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Last Detected</p>
                        <p className="text-white font-mono font-bold text-sm">
                            {analysisResult.lastSalary.date}
                        </p>
                    </div>

                    <div className="mb-6">
                        <label className="text-[9px] text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Interval (Days)</label>
                        <input 
                            type="number" 
                            value={salaryInterval} 
                            onChange={e => setSalaryInterval(Number(e.target.value))}
                            className="w-full bg-black/50 text-white p-3 rounded-xl border border-white/10 text-center font-bold text-lg outline-none focus:border-purple-500 transition-all font-mono"
                        />
                    </div>

                    <SmartCalendar lastSalaryDate={analysisResult.lastSalary.date} interval={salaryInterval} />
                 </div>

                 <button onClick={handleFinalize} className="w-full bg-white text-black p-4 rounded-2xl mt-4 font-bold shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:bg-gray-200 transition-all active:scale-95 text-sm uppercase tracking-widest relative z-10">
                    {t.confirm_setup}
                 </button>
              </div>
           </div>
        )}
    </div>
  );
};