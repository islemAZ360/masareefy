import React, { useState, useEffect } from 'react';
import { UserSettings, Currency, Language, RecurringBill, Transaction, TransactionType } from '../types';
import { TRANSLATIONS } from '../constants';
import { validateApiKey, analyzeOnboardingData, OnboardingAnalysisResult } from '../services/geminiService';
import { signInWithGoogle, auth } from '../services/firebase';
import { Wallet, Check, ImageIcon, DollarSign, Upload, Zap, ArrowRight, Plus, Trash2, UserCircle2, Lock, ChevronLeft, Globe, Key, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  user: UserSettings;
  setUser: React.Dispatch<React.SetStateAction<UserSettings>>;
  onComplete: (result: OnboardingAnalysisResult, nextSalaryDate: string, nextSalaryAmount: number, bills: RecurringBill[]) => void;
}

// Helper: Calendar Grid
const CalendarGrid = ({ 
    selectedDate, 
    onSelectDate 
  }: { 
    selectedDate: string, 
    onSelectDate: (d: string) => void 
  }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
  
    // Next month preview
    const nextMonthDays = 35 - days.length;
    for(let i=1; i<= nextMonthDays; i++) days.push(`N-${i}`);
  
    return (
      <div className="bg-sber-card p-4 rounded-xl border border-zinc-800">
         <div className="text-center font-bold mb-4 text-white">
           {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
         </div>
         <div className="grid grid-cols-7 gap-1 text-center">
           {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-xs text-gray-500 mb-2">{d}</div>)}
           {days.map((day, idx) => {
             if (!day) return <div key={idx}></div>;
             if (typeof day === 'string') return <div key={idx} className="text-gray-700 text-sm py-2">{day.split('-')[1]}</div>;
             
             const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
             const isSelected = selectedDate === dateStr;
             
             return (
               <button 
                 key={idx}
                 onClick={() => onSelectDate(dateStr)}
                 className={`text-sm py-2 rounded-full transition-colors ${isSelected ? 'bg-sber-green text-white font-bold' : 'text-gray-300 hover:bg-zinc-800'}`}
               >
                 {day}
               </button>
             )
           })}
         </div>
      </div>
    );
  };

export const Onboarding: React.FC<Props> = ({ user, setUser, onComplete }) => {
  const t = TRANSLATIONS[user.language];
  // 0: Auth Selection, 1: Profile Details, 2: Bal, 3: Sal, 4: Exp, 5: Bills, 6: Analyze, 7: Plan
  const [step, setStep] = useState(0); 
  const [isValidating, setIsValidating] = useState(false);
  
  // API Key Validation State
  const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [salaryFile, setSalaryFile] = useState<File | null>(null);
  const [expenseFiles, setExpenseFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<OnboardingAnalysisResult | null>(null);
  
  // Recurring Bills State
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');

  // Planning State
  const [plannedNextSalaryDate, setPlannedNextSalaryDate] = useState<string>('');
  const [plannedNextSalaryAmount, setPlannedNextSalaryAmount] = useState<number>(0);

  // Update text direction when language changes
  useEffect(() => {
    document.documentElement.dir = user.language === 'ar' ? 'rtl' : 'ltr';
  }, [user.language]);

  // Pre-fill API Key from Env if available
  useEffect(() => {
    if (process.env.API_KEY && !user.apiKey) {
      setUser(prev => ({ ...prev, apiKey: process.env.API_KEY || '' }));
    }
  }, []);

  // --- Actions ---

  const toggleLanguage = () => {
    const nextLang = user.language === 'en' ? 'ar' : user.language === 'ar' ? 'ru' : 'en';
    setUser(prev => ({ ...prev, language: nextLang }));
  };

  const handleGoogleSignIn = async () => {
    // Check if auth is initialized before attempting sign-in
    if (!auth) {
        alert("Google Sign-In is unavailable because Firebase is not configured.");
        return;
    }
    
    try {
        const googleUser = await signInWithGoogle();
        if (googleUser) {
            setUser(prev => ({
                ...prev,
                name: googleUser.displayName || prev.name,
                email: googleUser.email || undefined,
                photoURL: googleUser.photoURL || undefined,
                isGuest: false
            }));
            setStep(1); // Move to Profile Setup
        }
    } catch (e) {
        console.error("Google Sign in failed", e);
        alert("Google Sign In failed. Please check your internet or configuration.");
    }
  };

  const handleGuestSelect = () => {
    // Treat "Guest" as manual setup user (Not strictly isGuest=true to allow AI features if key provided)
    setUser(prev => ({ ...prev, isGuest: false, name: '' })); 
    setStep(1); // Move to Profile Setup
  };

  const checkApiKey = async () => {
    if (!user.apiKey.trim()) return;
    setKeyStatus('validating');
    try {
        const isValid = await validateApiKey(user.apiKey.trim());
        setKeyStatus(isValid ? 'valid' : 'invalid');
    } catch (e) {
        setKeyStatus('invalid');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user.name.trim()) return alert(t.enter_name);
    if (!user.apiKey.trim()) return alert(t.enter_key);
    
    // If already validated, proceed
    if (keyStatus === 'valid') {
        setStep(2);
        return;
    }
    
    setIsValidating(true);
    try {
      const isValid = await validateApiKey(user.apiKey.trim());
      if (isValid) {
        setUser(u => ({ ...u, apiKey: u.apiKey.trim() }));
        setStep(2); // Move to Balance Upload
      } else {
        setKeyStatus('invalid');
        alert(t.invalid_key_error);
      }
    } catch { 
        alert("Error connecting to API"); 
    } finally { 
        setIsValidating(false); 
    }
  };

  const handleAddBill = () => {
    if (newBillName && newBillAmount) {
      setRecurringBills([...recurringBills, {
        id: Date.now().toString(),
        name: newBillName,
        amount: Number(newBillAmount)
      }]);
      setNewBillName('');
      setNewBillAmount('');
    }
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
      setPlannedNextSalaryAmount(result.lastSalary.amount);
      
      const lastDate = new Date(result.lastSalary.date);
      let nextDate = new Date(lastDate);
      if (result.salaryFrequencyInferred === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (result.salaryFrequencyInferred === 'bi-weekly') nextDate.setDate(nextDate.getDate() + 14);
      else nextDate.setDate(nextDate.getDate() + 7);
      
      setPlannedNextSalaryDate(nextDate.toISOString().split('T')[0]);
      setStep(7);
    } catch (e) {
      console.error(e);
      alert("Failed to analyze images.");
      setStep(2);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
        
        {/* Language Switcher - Always Visible */}
        <div className="absolute top-6 right-6 z-50">
            <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 hover:border-sber-green transition-all shadow-lg active:scale-95"
            >
                <Globe className="w-4 h-4 text-sber-green" />
                <span className="text-sm font-bold uppercase">{user.language}</span>
            </button>
        </div>

        {/* Step Indicator */}
        {step > 0 && (
            <div className="absolute top-10 left-0 right-0 flex justify-center gap-2">
            {[1,2,3,4,5,6,7].map(s => (
                <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s <= step ? 'w-8 bg-sber-green' : 'w-4 bg-gray-800'}`} />
            ))}
            </div>
        )}

        {/* Step 0: Auth Selection (Landing) */}
        {step === 0 && (
          <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500 relative">
            <div className="w-24 h-24 bg-gradient-to-tr from-sber-green to-emerald-600 rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-sber-green/20">
              <Wallet className="text-white w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight">{t.welcome}</h1>
            <p className="text-gray-400 mb-10 text-lg">{t.setup_title}</p>
            
            <div className="space-y-4">
                 {/* Google Sign In */}
                 <button 
                    onClick={handleGoogleSignIn}
                    className="w-full bg-white text-black font-bold p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] transform hover:-translate-y-0.5"
                 >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                    <span className="text-base">{t.sign_in_google}</span>
                 </button>

                 {/* Guest Mode / Manual Entry */}
                 <button 
                    onClick={handleGuestSelect}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-3 transition-all border border-zinc-800 hover:border-zinc-700"
                 >
                    <UserCircle2 className="w-6 h-6 text-gray-400" />
                    <span className="text-base">{t.guest_mode}</span>
                 </button>
            </div>
            {/* Removed the bottom 'Or continue manually...' text as requested */}
          </div>
        )}

        {/* Step 1: Profile Setup */}
        {step === 1 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
             <div className="flex justify-start mb-6">
                 <button onClick={() => setStep(0)} className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-zinc-800">
                     <ChevronLeft size={20} />
                 </button>
             </div>
             
             <h2 className="text-3xl font-bold mb-2 text-left">{t.enter_name}</h2>
             <p className="text-gray-400 mb-8 text-left text-sm">Please provide your details and API key to continue.</p>
             
             <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="text-left group">
                  <label className="text-xs text-gray-500 ml-1 mb-2 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">{t.enter_name}</label>
                  <input type="text" className="w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 focus:border-sber-green focus:outline-none text-white transition-all placeholder-zinc-700" placeholder="e.g. John Doe" value={user.name} onChange={e => setUser({...user, name: e.target.value})} required />
              </div>

              {/* API Key Input - Always Visible now */}
              <div className="text-left group">
                <label className="text-xs text-gray-500 ml-1 mb-2 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">{t.enter_key}</label>
                <div className="relative">
                    <input 
                        type="password" 
                        className={`w-full bg-zinc-900/50 p-4 pr-14 rounded-2xl border focus:outline-none text-white transition-all placeholder-zinc-700 ${
                            keyStatus === 'valid' ? 'border-sber-green focus:border-sber-green' : 
                            keyStatus === 'invalid' ? 'border-red-500 focus:border-red-500' : 
                            'border-zinc-800 focus:border-sber-green'
                        }`} 
                        placeholder="AI Studio Key" 
                        value={user.apiKey} 
                        onChange={e => {
                            setUser({...user, apiKey: e.target.value});
                            setKeyStatus('idle');
                        }} 
                        disabled={isValidating}
                        required
                    />
                    {/* Validation Button inside Input */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {keyStatus === 'validating' ? (
                             <div className="w-8 h-8 flex items-center justify-center">
                                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             </div>
                        ) : (
                            <button 
                                type="button"
                                onClick={checkApiKey}
                                title="Verify API Key"
                                disabled={!user.apiKey}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                    keyStatus === 'valid' ? 'bg-sber-green text-white' : 
                                    keyStatus === 'invalid' ? 'bg-red-500 text-white' : 
                                    'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
                                }`}
                            >
                                {keyStatus === 'valid' ? <CheckCircle2 size={18} /> : 
                                 keyStatus === 'invalid' ? <XCircle size={18} /> : 
                                 <Key size={18} />}
                            </button>
                        )}
                    </div>
                </div>
                {keyStatus === 'valid' && <p className="text-xs text-sber-green mt-1 ml-1">Key verified successfully</p>}
                {keyStatus === 'invalid' && <p className="text-xs text-red-500 mt-1 ml-1">Invalid API Key</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left group">
                    <label className="text-xs text-gray-500 ml-1 mb-2 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">{t.select_currency}</label>
                    <select className="w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 focus:border-sber-green focus:outline-none text-white appearance-none transition-all" value={user.currency} onChange={e => setUser({...user, currency: e.target.value as Currency})}>
                        <option value="USD">USD ($)</option>
                        <option value="SAR">SAR (﷼)</option>
                        <option value="RUB">RUB (₽)</option>
                    </select>
                </div>
                <div className="text-left group">
                    <label className="text-xs text-gray-500 ml-1 mb-2 block uppercase tracking-wider font-bold group-focus-within:text-sber-green transition-colors">Language</label>
                    <select className="w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 focus:border-sber-green focus:outline-none text-white appearance-none transition-all" value={user.language} onChange={e => setUser({...user, language: e.target.value as Language})}>
                        <option value="en">English</option>
                        <option value="ar">العربية</option>
                        <option value="ru">Русский</option>
                    </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-sber-green hover:bg-green-600 font-bold p-4 rounded-2xl mt-8 flex justify-center gap-2 items-center shadow-lg shadow-sber-green/20 transition-all active:scale-95" disabled={isValidating}>
                {isValidating ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white/50 border-t-white rounded-full"/>
                ) : (
                    <>
                       {t.start} <ArrowRight size={20} />
                    </>
                )}
              </button>
             </form>
          </div>
        )}

        {/* Step 2: Balance */}
        {step === 2 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold mb-2">{t.step_balance}</h2>
            <p className="text-gray-400 mb-8 text-sm">{t.step_balance_desc}</p>
            <div className={`h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors ${balanceFile ? 'border-sber-green bg-sber-green/10' : 'border-zinc-700 hover:border-gray-500'}`} onClick={() => document.getElementById('balanceInput')?.click()}>
              {balanceFile ? (
                <>
                  <Check className="w-12 h-12 text-sber-green mb-2" />
                  <span className="text-sm font-semibold">{balanceFile.name}</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-400">{t.upload_image}</span>
                </>
              )}
              <input id="balanceInput" type="file" accept="image/*" className="hidden" onChange={(e) => setBalanceFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(3)} className="w-full bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl mt-8 font-bold flex items-center justify-center gap-2" disabled={!balanceFile}>
              Next <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 3: Salary */}
        {step === 3 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold mb-2">{t.step_salary}</h2>
            <p className="text-gray-400 mb-8 text-sm">{t.step_salary_desc}</p>
            <div className={`h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors ${salaryFile ? 'border-sber-green bg-sber-green/10' : 'border-zinc-700 hover:border-gray-500'}`} onClick={() => document.getElementById('salaryInput')?.click()}>
              {salaryFile ? (
                <>
                  <Check className="w-12 h-12 text-sber-green mb-2" />
                  <span className="text-sm font-semibold">{salaryFile.name}</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-12 h-12 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-400">{t.upload_image}</span>
                </>
              )}
              <input id="salaryInput" type="file" accept="image/*" className="hidden" onChange={(e) => setSalaryFile(e.target.files?.[0] || null)} />
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl mt-8 font-bold flex items-center justify-center gap-2" disabled={!salaryFile}>
              Next <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 4: Expenses */}
        {step === 4 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold mb-2">{t.step_expenses}</h2>
            <p className="text-gray-400 mb-8 text-sm">{t.step_expenses_desc}</p>
            <div className={`h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors ${expenseFiles.length > 0 ? 'border-sber-green bg-sber-green/10' : 'border-zinc-700 hover:border-gray-500'}`} onClick={() => document.getElementById('expensesInput')?.click()}>
               <div className="grid grid-cols-3 gap-2 p-4">
                 {expenseFiles.slice(0, 6).map((f, i) => (
                   <div key={i} className="w-16 h-16 bg-black/50 rounded-lg flex items-center justify-center border border-zinc-700">
                     <span className="text-[10px] truncate w-full px-1">{f.name.slice(0,5)}..</span>
                   </div>
                 ))}
                 {expenseFiles.length === 0 && (
                    <div className="col-span-3 flex flex-col items-center">
                       <Upload className="w-12 h-12 text-gray-500 mb-2" />
                       <span className="text-sm text-gray-400">{t.upload_images}</span>
                    </div>
                 )}
               </div>
               <input id="expensesInput" type="file" accept="image/*" multiple className="hidden" onChange={(e) => setExpenseFiles(Array.from(e.target.files || []))} />
            </div>
            <p className="mt-2 text-xs text-gray-500">{expenseFiles.length} images selected</p>
            <button onClick={() => setStep(5)} className="w-full bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl mt-8 font-bold flex items-center justify-center gap-2">
              Next <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 5: Fixed Bills (Recurring) */}
        {step === 5 && (
          <div className="w-full max-w-sm animate-in slide-in-from-right duration-300">
             <h2 className="text-2xl font-bold mb-2">{t.step_recurring}</h2>
             <p className="text-gray-400 mb-6 text-sm">{t.step_recurring_desc}</p>
             
             <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {recurringBills.map((bill) => (
                   <div key={bill.id} className="flex justify-between items-center bg-sber-card p-3 rounded-xl border border-zinc-800">
                      <div className="text-left">
                         <div className="font-bold">{bill.name}</div>
                         <div className="text-xs text-gray-400">{bill.amount} {user.currency}</div>
                      </div>
                      <button onClick={() => setRecurringBills(recurringBills.filter(b => b.id !== bill.id))}>
                         <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                   </div>
                ))}
             </div>

             <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6">
                <input 
                   type="text" 
                   placeholder={t.bill_name} 
                   value={newBillName}
                   onChange={e => setNewBillName(e.target.value)}
                   className="w-full bg-black p-3 rounded-lg mb-2 text-sm border border-zinc-700"
                />
                <div className="flex gap-2">
                   <input 
                      type="number" 
                      placeholder={t.bill_amount}
                      value={newBillAmount}
                      onChange={e => setNewBillAmount(e.target.value)}
                      className="w-full bg-black p-3 rounded-lg text-sm border border-zinc-700"
                   />
                   <button onClick={handleAddBill} className="bg-sber-green p-3 rounded-lg">
                      <Plus className="text-white" />
                   </button>
                </div>
             </div>

             <button onClick={handleStartAnalysis} className="w-full bg-sber-green hover:bg-green-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-sber-green/20">
               Analyze All Data <Zap size={18} />
             </button>
          </div>
        )}

        {/* Step 6: Analysis Loading */}
        {step === 6 && (
           <div className="flex flex-col items-center justify-center animate-in fade-in duration-500">
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-sber-green rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Zap className="w-10 h-10 text-sber-green animate-pulse" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">{t.analyzing_all}</h2>
              <p className="text-gray-500 text-sm max-w-xs">Connecting to Gemini AI to extract your balance, income patterns, and recent spending...</p>
           </div>
        )}

        {/* Step 7: Calendar & Review */}
        {step === 7 && analysisResult && (
           <div className="w-full max-w-md animate-in slide-in-from-bottom duration-500 pb-10">
              <h2 className="text-2xl font-bold mb-1">{t.step_review}</h2>
              <p className="text-gray-400 mb-6 text-sm">We found the following data. Please confirm.</p>
              
              <div className="space-y-4">
                 <div className="bg-sber-card p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">{t.step_balance}</span>
                    <span className="text-xl font-bold text-white">{analysisResult.currentBalance.toLocaleString()} {user.currency}</span>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm text-gray-400 ml-1 block text-left">{t.next_salary_date}</label>
                    <CalendarGrid selectedDate={plannedNextSalaryDate} onSelectDate={setPlannedNextSalaryDate} />
                 </div>

                 <div className="bg-sber-card p-4 rounded-xl border border-zinc-800">
                    <div className="flex justify-between mb-2">
                       <label className="text-sm text-gray-400">{t.expected_amount}</label>
                       <span className="text-xs text-gray-500">Last: {analysisResult.lastSalary.amount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-sber-green font-bold text-xl">{user.currency}</span>
                       <input 
                         type="number" 
                         value={plannedNextSalaryAmount} 
                         onChange={(e) => setPlannedNextSalaryAmount(Number(e.target.value))}
                         className="bg-transparent text-2xl font-bold text-white w-full focus:outline-none"
                       />
                    </div>
                 </div>

                 <button onClick={() => onComplete(analysisResult, plannedNextSalaryDate, plannedNextSalaryAmount, recurringBills)} className="w-full bg-sber-green hover:bg-green-600 p-4 rounded-xl mt-4 font-bold shadow-lg shadow-sber-green/20">
                    {t.confirm_setup}
                 </button>
              </div>
           </div>
        )}
    </div>
  );
};