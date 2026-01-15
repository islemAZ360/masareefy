import React, { useState, useEffect, useRef } from 'react';
import { Home, Plus, PieChart as PieIcon, Settings, List, Camera, Upload, LogOut, Globe, Image as ImageIcon, Key, CheckCircle, AlertCircle, Lock, ChevronLeft, Calendar, Tag, CreditCard } from 'lucide-react';
import { UserSettings, Transaction, ViewState, Language, Currency, TransactionType, BudgetPlan, RecurringBill } from './types';
import { CATEGORIES, TRANSLATIONS } from './constants';
import { analyzeReceipt, OnboardingAnalysisResult, validateApiKey } from './services/geminiService';
import { logoutUser, auth } from './services/firebase';
import { TransactionItem } from './components/TransactionItem';
import { Reports } from './components/Reports';
import { Dashboard } from './components/Dashboard';
import { Onboarding } from './components/Onboarding';
import { AIAdvisor } from './components/AIAdvisor';

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
        currentBalance: 0
      };
    } catch (e) {
      console.error("Failed to parse user settings, resetting.", e);
      return {
        name: '',
        apiKey: '',
        currency: 'USD',
        language: 'en',
        isOnboarded: false,
        isGuest: false,
        currentBalance: 0
      };
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('masareefy_txs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse transactions, resetting.", e);
      return [];
    }
  });

  const [currentView, setCurrentView] = useState<ViewState>(user.isOnboarded ? 'dashboard' : 'onboarding');
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
  const [tempTx, setTempTx] = useState<Partial<Transaction>>({ type: TransactionType.EXPENSE });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [editingKey, setEditingKey] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('masareefy_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('masareefy_txs', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    document.documentElement.dir = user.language === 'ar' ? 'rtl' : 'ltr';
  }, [user.language]);

  const t = TRANSLATIONS[user.language];

  // --- Logic ---
  const handleOnboardingComplete = (result: OnboardingAnalysisResult, nextSalaryDate: string, nextSalaryAmount: number, bills: RecurringBill[]) => {
    const newTransactions = result.transactions.map((tx, idx) => ({
      id: `init-${idx}`,
      amount: tx.amount,
      date: tx.date,
      vendor: tx.vendor,
      category: tx.category,
      type: tx.type === 'expense' ? TransactionType.EXPENSE : TransactionType.INCOME,
      note: 'Imported during setup'
    }));

    newTransactions.push({
      id: 'init-salary',
      amount: result.lastSalary.amount,
      date: result.lastSalary.date,
      vendor: 'Employer',
      category: 'salary',
      type: TransactionType.INCOME,
      note: 'Last Salary Slip'
    });

    setTransactions(newTransactions);
    setUser(u => ({
      ...u,
      isOnboarded: true,
      currentBalance: result.currentBalance,
      lastSalaryAmount: result.lastSalary.amount,
      lastSalaryDate: result.lastSalary.date,
      salaryFrequency: result.salaryFrequencyInferred,
      nextSalaryAmount: nextSalaryAmount,
      nextSalaryDate: nextSalaryDate,
      recurringBills: bills
    }));
    setCurrentView('dashboard');
  };

  const handlePlanSelection = (plan: BudgetPlan) => {
    setUser(u => ({ ...u, selectedPlan: plan.type, dailyLimit: plan.dailyLimit }));
    alert(`You selected the ${plan.type.toUpperCase()} plan. Daily Limit: ${plan.dailyLimit} ${user.currency}`);
  };

  // --- Recurring Bills Logic ---
  const handlePayBill = (billId: string, date: string, deduct: boolean) => {
    const bill = user.recurringBills?.find(b => b.id === billId);
    if (!bill) return;

    // 1. Update User Settings (mark lastPaidDate)
    const updatedBills = user.recurringBills?.map(b => 
       b.id === billId ? { ...b, lastPaidDate: date } : b
    );
    setUser(u => ({ ...u, recurringBills: updatedBills }));

    // 2. Create Transaction if deduct is true
    if (deduct) {
       const newTx: Transaction = {
          id: `bill-${Date.now()}`,
          amount: bill.amount,
          date: date,
          category: 'utilities',
          vendor: bill.name,
          note: 'Fixed Monthly Bill',
          type: TransactionType.EXPENSE,
          isRecurring: true
       };
       setTransactions(prev => [newTx, ...prev]);
    }
  };

  const handleAddBill = (name: string, amount: number) => {
    const newBill: RecurringBill = {
        id: Date.now().toString(),
        name,
        amount
    };
    setUser(prev => ({
        ...prev,
        recurringBills: [...(prev.recurringBills || []), newBill]
    }));
  };

  const handleDeleteBill = (id: string) => {
    if (confirm('Are you sure you want to delete this bill?')) {
        setUser(prev => ({
            ...prev,
            recurringBills: (prev.recurringBills || []).filter(b => b.id !== id)
        }));
    }
  };

  // --- API & Transactions ---
  const handleUpdateApiKey = async () => {
    if (!editingKey.trim()) return;
    setIsValidatingKey(true);
    const isValid = await validateApiKey(editingKey.trim());
    if (isValid) {
      setUser(u => ({ ...u, apiKey: editingKey.trim(), isGuest: false }));
      alert(t.key_valid_saved);
      setEditingKey('');
    } else {
      alert(t.key_invalid);
    }
    setIsValidatingKey(false);
  };

  const handleLogout = async () => {
      await logoutUser();
      localStorage.removeItem('masareefy_user');
      localStorage.removeItem('masareefy_txs');
      window.location.reload();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user.isGuest || !user.apiKey) {
        alert("This feature is disabled in Guest Mode. Please add an API Key in Settings.");
        return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzeLoading(true);
    try {
      const result = await analyzeReceipt(file, user.apiKey, user.language);
      setTempTx({
        amount: result.amount,
        date: result.date,
        vendor: result.vendor,
        category: result.category || 'utilities',
        type: result.type as TransactionType || TransactionType.EXPENSE,
        note: 'Scanned Receipt'
      });
    } catch (err) { alert("Analysis failed."); } 
    finally { setIsAnalyzeLoading(false); }
  };

  const saveTransaction = () => {
    if (!tempTx.amount || !tempTx.date) return;
    
    // Check Spending against Plan (if expense and matches today)
    const todayStr = new Date().toISOString().split('T')[0];
    if (tempTx.type === TransactionType.EXPENSE && user.dailyLimit && tempTx.date === todayStr) {
      const todaySpent = transactions
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(todayStr))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const newTotal = todaySpent + Number(tempTx.amount);
      
      if (newTotal > user.dailyLimit) {
        alert(`WARNING: This transaction pushes you over your daily limit of ${user.dailyLimit}! Overdraft: ${newTotal - user.dailyLimit}`);
      } else {
        const remaining = user.dailyLimit - newTotal;
        alert(`Great job! You are still under budget. Remaining for today: ${remaining}`);
      }
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      amount: Number(tempTx.amount),
      date: tempTx.date,
      category: tempTx.category || 'utilities',
      vendor: tempTx.vendor || 'Unknown',
      note: tempTx.note || '',
      type: tempTx.type || TransactionType.EXPENSE,
      isRecurring: false
    };
    setTransactions(prev => [newTx, ...prev]);
    setTempTx({ type: TransactionType.EXPENSE });
    setCurrentView('dashboard');
  };

  const getGroupedTransactions = () => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: Record<string, Transaction[]> = {};
    sorted.forEach(tx => {
      const dateKey = tx.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    return Object.keys(groups).map(date => ({ date, items: groups[date] }));
  };

  if (currentView === 'onboarding') {
    return <Onboarding user={user} setUser={setUser} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans selection:bg-sber-green/30 pb-32">
      
      {/* Premium Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#050505]">
          <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-sber-green/5 rounded-full blur-[150px] opacity-30 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-emerald-900/10 rounded-full blur-[120px] opacity-20"></div>
      </div>

      {/* Glass Header */}
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

      {/* Main Content Area */}
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

          {currentView === 'ai-advisor' && (
            <AIAdvisor user={user} transactions={transactions} onClose={() => setCurrentView('dashboard')} />
          )}

          {currentView === 'transactions' && (
            <div className="pb-10">
              <div className="flex items-center gap-3 mb-8">
                  <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20">
                      <List className="w-6 h-6 text-sber-green" />
                  </div>
                  <div>
                      <h2 className="text-2xl font-bold text-white leading-none">{t.transactions}</h2>
                      <p className="text-xs text-gray-400 mt-1">{transactions.length} records found</p>
                  </div>
              </div>
              
              {getGroupedTransactions().map((group, idx) => {
                const date = new Date(group.date);
                return (
                  <div key={group.date} className="mb-6 animate-in slide-in-from-bottom-5 fade-in" style={{animationDelay: `${idx * 50}ms`}}>
                    <div className="sticky top-20 z-30 bg-[#050505]/90 backdrop-blur-xl py-3 mb-2 flex items-baseline gap-3 border-b border-white/5">
                      <span className="text-2xl font-bold text-white tracking-tighter tabular-nums">
                        {date.getDate()}
                      </span>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                        {date.toLocaleDateString(user.language, { month: 'long', weekday: 'long' })}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {group.items.map(tx => (
                        <TransactionItem key={tx.id} transaction={tx} currency={user.currency} language={user.language} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {transactions.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-20 text-gray-500 opacity-50">
                     <List size={48} strokeWidth={1} />
                     <p className="mt-4 text-sm">No transactions yet</p>
                 </div>
              )}
            </div>
          )}

          {currentView === 'reports' && (
            <Reports transactions={transactions} language={user.language} />
          )}

          {currentView === 'add' && (
            <div className="pb-10 h-[90vh] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                  <button onClick={() => setCurrentView('dashboard')} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                      <ChevronLeft className="text-white" />
                  </button>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">{t.add}</h2>
                  <div className="w-10" /> 
              </div>
              
              {isAnalyzeLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900/20 rounded-[2.5rem] border border-white/5 animate-pulse">
                  <div className="relative">
                      <div className="w-24 h-24 border-4 border-zinc-800 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-sber-green border-t-transparent rounded-full animate-spin"></div>
                      <Camera className="absolute inset-0 m-auto text-sber-green w-8 h-8 animate-pulse" />
                  </div>
                  <p className="text-sber-green font-bold text-lg mt-6 tracking-wide">{t.analyzing}</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Type Selector (Segmented Control) */}
                  <div className="bg-[#1C1C1E] p-1.5 rounded-2xl flex mb-8 border border-white/5 relative">
                      {/* Sliding Background */}
                      <div 
                        className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-zinc-700 rounded-xl transition-all duration-300 shadow-lg ${tempTx.type === TransactionType.INCOME ? 'translate-x-[calc(100%+6px)] bg-sber-green' : 'translate-x-0'}`}
                        style={{ right: user.language === 'ar' ? 'auto' : undefined, left: user.language === 'ar' && tempTx.type === TransactionType.INCOME ? '6px' : undefined }}
                      ></div>

                      <button 
                        onClick={() => setTempTx({...tempTx, type: TransactionType.EXPENSE})}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold relative z-10 transition-colors duration-300 ${tempTx.type === 'expense' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        {t.expense}
                      </button>
                      <button 
                        onClick={() => setTempTx({...tempTx, type: TransactionType.INCOME})}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold relative z-10 transition-colors duration-300 ${tempTx.type === 'income' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        {t.income}
                      </button>
                  </div>

                  {/* Amount Display */}
                  <div className="flex-1 flex flex-col items-center justify-center mb-8 min-h-[150px]">
                    <div className="text-center relative w-full group">
                      <span className={`text-2xl absolute left-4 top-1/2 -translate-y-1/2 font-light transition-colors ${tempTx.type === 'expense' ? 'text-red-500/50' : 'text-sber-green/50'}`}>
                          {user.currency}
                      </span>
                      <input 
                          type="number" 
                          value={tempTx.amount || ''}
                          onChange={e => setTempTx({...tempTx, amount: parseFloat(e.target.value)})}
                          placeholder="0"
                          className={`bg-transparent text-7xl font-bold text-center w-full focus:outline-none placeholder-zinc-800 tracking-tighter transition-colors ${tempTx.type === 'expense' ? 'text-white caret-red-500 selection:bg-red-500/30' : 'text-sber-green caret-sber-green selection:bg-sber-green/30'}`}
                          autoFocus
                      />
                    </div>
                  </div>

                  {/* Scan Buttons */}
                  {!tempTx.amount && (
                    <div className="flex gap-4 mb-8">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 bg-[#1C1C1E] hover:bg-[#2C2C2E] p-4 rounded-2xl flex flex-col items-center gap-2 border border-white/5 transition-all active:scale-95 ${user.isGuest ? 'opacity-50' : ''}`}
                      >
                          <Camera className="w-6 h-6 text-sber-green" />
                          <span className="font-semibold text-xs text-gray-300">{t.scan_receipt}</span>
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 bg-[#1C1C1E] hover:bg-[#2C2C2E] p-4 rounded-2xl flex flex-col items-center gap-2 border border-white/5 transition-all active:scale-95 ${user.isGuest ? 'opacity-50' : ''}`}
                      >
                          <ImageIcon className="w-6 h-6 text-blue-400" />
                          <span className="font-semibold text-xs text-gray-300">{t.upload_image}</span>
                      </button>
                      <input 
                          type="file" 
                          accept="image/*" 
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileUpload}
                      />
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="bg-[#1C1C1E] p-1 rounded-3xl border border-white/5 space-y-1 mb-8">
                        <div className="relative group bg-black/40 rounded-[1.2rem] hover:bg-black/60 transition-colors">
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                <Calendar size={18} />
                             </div>
                             <input 
                                  type="date" 
                                  value={tempTx.date || new Date().toISOString().split('T')[0]}
                                  onChange={e => setTempTx({...tempTx, date: e.target.value})}
                                  className="w-full bg-transparent text-white p-4 pl-12 rounded-2xl focus:outline-none text-sm font-medium"
                              />
                        </div>

                        <div className="relative group bg-black/40 rounded-[1.2rem] hover:bg-black/60 transition-colors">
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                <Tag size={18} />
                             </div>
                             <select 
                                  value={tempTx.category || ''}
                                  onChange={e => setTempTx({...tempTx, category: e.target.value})}
                                  className="w-full bg-transparent text-white p-4 pl-12 rounded-2xl focus:outline-none appearance-none text-sm font-medium"
                              >
                                  <option value="" disabled>Select Category</option>
                                  {CATEGORIES.map(cat => (
                                  <option key={cat.id} value={cat.id} className="bg-zinc-900">
                                      {user.language === 'ar' ? cat.name_ar : user.language === 'ru' ? cat.name_ru : cat.name_en}
                                  </option>
                                  ))}
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronLeft className="-rotate-90 w-4 h-4 text-gray-600" />
                              </div>
                        </div>

                        <div className="relative group bg-black/40 rounded-[1.2rem] hover:bg-black/60 transition-colors">
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                <CreditCard size={18} />
                             </div>
                             <input 
                                  type="text"
                                  placeholder="Vendor (e.g. Starbucks)"
                                  value={tempTx.vendor || ''}
                                  onChange={e => setTempTx({...tempTx, vendor: e.target.value})}
                                  className="w-full bg-transparent text-white p-4 pl-12 rounded-2xl focus:outline-none placeholder-zinc-600 text-sm font-medium"
                              />
                        </div>
                  </div>

                  <div className="mt-auto">
                    <button 
                      onClick={saveTransaction}
                      className={`w-full py-4 rounded-[1.5rem] font-bold text-lg shadow-xl active:scale-95 transition-all ${
                          !tempTx.amount ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 
                          tempTx.type === 'expense' 
                            ? 'bg-white text-black hover:bg-gray-200 shadow-white/10' 
                            : 'bg-sber-green text-white hover:bg-green-600 shadow-sber-green/20'
                      }`}
                      disabled={!tempTx.amount}
                    >
                      {t.save}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {currentView === 'settings' && (
            <div className="space-y-8 pb-10">
              <div className="flex items-center gap-3 mb-2">
                  <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20">
                      <Settings className="w-6 h-6 text-sber-green" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{t.settings}</h2>
              </div>
              
              {/* Preferences Card */}
              <div className="bg-[#1C1C1E] rounded-[2rem] p-1 border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors rounded-t-[1.8rem]">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                             <Globe size={18} />
                        </div>
                        <span className="font-medium text-gray-200 text-sm">Currency</span>
                    </div>
                    <span className="text-gray-400 font-mono text-xs bg-black/40 px-2 py-1 rounded-md border border-white/5">{user.currency}</span>
                </div>
                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-b-[1.8rem] cursor-pointer" onClick={() => setUser(u => ({...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en'}))}>
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                             <Globe size={18} />
                        </div>
                        <span className="font-medium text-gray-200 text-sm">Language</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-white uppercase font-bold text-xs">{user.language}</span>
                         <ChevronLeft className="w-4 h-4 text-gray-600 -rotate-180" />
                    </div>
                </div>
              </div>

              {/* API Key Management */}
              <div className="bg-[#1C1C1E] rounded-[2rem] p-6 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Key size={100} />
                </div>
                
                <h3 className="font-bold mb-2 flex items-center gap-2 text-white relative z-10">
                    {t.manage_api_key}
                </h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed relative z-10 max-w-xs">
                    {user.isGuest ? "Unlock AI features by adding your Gemini API Key." : t.change_key_desc}
                </p>
                
                <div className="flex flex-col gap-3 relative z-10">
                    <input 
                      type="password" 
                      placeholder="Paste API Key here" 
                      value={editingKey}
                      onChange={(e) => setEditingKey(e.target.value)}
                      className="bg-black/50 border border-white/10 p-4 rounded-xl text-sm focus:border-sber-green outline-none transition-colors text-white placeholder-zinc-600"
                    />
                    <button 
                      onClick={handleUpdateApiKey}
                      disabled={!editingKey || isValidatingKey}
                      className="bg-white text-black hover:bg-gray-200 p-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-white/5"
                    >
                      {isValidatingKey ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      ) : (
                          <CheckCircle className="w-4 h-4" />
                      )}
                      {user.isGuest ? t.add_key : t.update_key}
                    </button>
                </div>
              </div>

              <div className="bg-[#1C1C1E] rounded-[2rem] p-1 border border-white/5">
                 <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors rounded-[1.8rem] group"
                  >
                    <div className="flex items-center gap-3">
                         <div className="bg-red-500/20 p-2 rounded-lg text-red-500 group-hover:text-red-400 transition-colors">
                             <LogOut size={18} />
                         </div>
                         <span className="font-medium text-red-500 group-hover:text-red-400 text-sm">{t.sign_out}</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-red-900 -rotate-180" />
                  </button>
              </div>
              
              <div className="text-center">
                  <p className="text-[10px] text-gray-600 font-mono">Masareefy v1.2.0 • Build 2026</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Navigation "Island" - Improved */}
      <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
         <nav className="bg-[#161618]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] px-8 py-4 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)] flex items-center gap-8 pointer-events-auto transition-transform duration-300">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`flex flex-col items-center gap-1 transition-all duration-300 group ${currentView === 'dashboard' ? 'text-white -translate-y-1' : 'text-zinc-500 hover:text-gray-300'}`}
            >
              <div className={`absolute -bottom-6 w-1 h-1 rounded-full bg-white transition-all duration-300 ${currentView === 'dashboard' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
              <Home size={24} strokeWidth={currentView === 'dashboard' ? 3 : 2} className={`transition-all duration-300 ${currentView === 'dashboard' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`} />
            </button>

            <button 
              onClick={() => setCurrentView('transactions')}
              className={`flex flex-col items-center gap-1 transition-all duration-300 group ${currentView === 'transactions' ? 'text-white -translate-y-1' : 'text-zinc-500 hover:text-gray-300'}`}
            >
              <div className={`absolute -bottom-6 w-1 h-1 rounded-full bg-white transition-all duration-300 ${currentView === 'transactions' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
              <List size={24} strokeWidth={currentView === 'transactions' ? 3 : 2} className={`transition-all duration-300 ${currentView === 'transactions' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`} />
            </button>

            {/* Central Add Button */}
            <button 
                onClick={() => setCurrentView('add')}
                className="w-16 h-16 bg-white text-black rounded-[1.2rem] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 -mt-10 border-4 border-[#050505] relative z-20 group"
            >
                <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <button 
              onClick={() => setCurrentView('reports')}
              className={`flex flex-col items-center gap-1 transition-all duration-300 group ${currentView === 'reports' ? 'text-white -translate-y-1' : 'text-zinc-500 hover:text-gray-300'}`}
            >
              <div className={`absolute -bottom-6 w-1 h-1 rounded-full bg-white transition-all duration-300 ${currentView === 'reports' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
              <PieIcon size={24} strokeWidth={currentView === 'reports' ? 3 : 2} className={`transition-all duration-300 ${currentView === 'reports' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`} />
            </button>

            <button 
              onClick={() => setCurrentView('settings')}
              className={`flex flex-col items-center gap-1 transition-all duration-300 group ${currentView === 'settings' ? 'text-white -translate-y-1' : 'text-zinc-500 hover:text-gray-300'}`}
            >
              <div className={`absolute -bottom-6 w-1 h-1 rounded-full bg-white transition-all duration-300 ${currentView === 'settings' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
              <Settings size={24} strokeWidth={currentView === 'settings' ? 3 : 2} className={`transition-all duration-300 ${currentView === 'settings' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`} />
            </button>
         </nav>
      </div>
    </div>
  );
};

export default App;