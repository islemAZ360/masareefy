import React, { useState, useEffect, Suspense } from 'react';
import { Globe, BrainCircuit, Loader2 } from 'lucide-react';
import { UserSettings, Transaction, ViewState, TransactionType, BudgetPlan, RecurringBill, WalletType } from './types';
import { TRANSLATIONS } from './constants';
import { OnboardingAnalysisResult } from './services/geminiService';
import { logoutUser, auth, saveUserData } from './services/firebase';

// Eager Import (Critical for startup)
import { Dashboard } from './components/Dashboard';
import { Navigation } from './components/Navigation';

// Lazy Imports (Load only when needed)
const Onboarding = React.lazy(() => import('./components/Onboarding').then(module => ({ default: module.Onboarding })));
const AIAdvisor = React.lazy(() => import('./components/AIAdvisor').then(module => ({ default: module.AIAdvisor })));
const Reports = React.lazy(() => import('./components/Reports').then(module => ({ default: module.Reports })));
const TransactionsPage = React.lazy(() => import('./components/TransactionsPage').then(module => ({ default: module.TransactionsPage })));
const AddTransactionPage = React.lazy(() => import('./components/AddTransactionPage').then(module => ({ default: module.AddTransactionPage })));
const SettingsPage = React.lazy(() => import('./components/SettingsPage').then(module => ({ default: module.SettingsPage })));
const TitanSimulator = React.lazy(() => import('./components/TitanSimulator').then(module => ({ default: module.TitanSimulator })));

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex h-[60vh] w-full items-center justify-center animate-fade-in">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
      <p className="text-zinc-500 text-xs font-mono tracking-widest animate-pulse">LOADING MODULE...</p>
    </div>
  </div>
);

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
          <Suspense fallback={<PageLoader />}>
            {currentView === 'dashboard' ? (
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
            ) : currentView === 'onboarding' ? (
                <Onboarding user={user} setUser={setUser} onComplete={handleOnboardingComplete} onRestore={handleRestoreData} />
            ) : currentView === 'transactions' ? (
                <TransactionsPage user={user} transactions={transactions} />
            ) : currentView === 'add' ? (
                <AddTransactionPage 
                    user={user} 
                    transactions={transactions} 
                    onSave={handleSaveTransaction} 
                    onBack={() => setCurrentView('dashboard')} 
                />
            ) : currentView === 'reports' ? (
                <Reports transactions={transactions} language={user.language} />
            ) : currentView === 'settings' ? (
                <SettingsPage user={user} setUser={setUser} onLogout={handleLogout} />
            ) : currentView === 'ai-advisor' ? (
                <AIAdvisor user={user} transactions={transactions} onClose={() => setCurrentView('dashboard')} />
            ) : currentView === 'simulator' ? (
                <TitanSimulator 
                user={user} 
                transactions={transactions} 
                onBack={() => setCurrentView('dashboard')} 
                />
            ) : null}
          </Suspense>
        </div>
      </main>

      <Navigation currentView={currentView} onNavigate={setCurrentView} />
    </div>
  );
};

export default App;