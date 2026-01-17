import React, { useState, useEffect } from 'react';
import { Globe, BrainCircuit } from 'lucide-react';
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
import { TitanSimulator } from './components/TitanSimulator';

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

  if (currentView === 'onboarding') {
    return <Onboarding user={user} setUser={setUser} onComplete={handleOnboardingComplete} onRestore={handleRestoreData} />;
  }

  return (
    // Updated Main Container with Nebula Background
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans selection:bg-purple-500/30 pb-40">
      
      {/* Animated Nebula Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] bg-purple-900/20 rounded-full blur-[120px] animate-float opacity-30"></div>
          <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] bg-emerald-900/20 rounded-full blur-[120px] animate-pulse-slow opacity-30" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-blue-900/10 rounded-full blur-[100px] animate-float opacity-20" style={{ animationDelay: '4s' }}></div>
          <div className="noise-bg"></div>
      </div>

      {currentView !== 'add' && (
        <div className="sticky top-0 z-40 glass border-b border-white/5 shadow-lg transition-all duration-300">
          <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
            {/* User Profile */}
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-2xl shadow-md border border-white/10 object-cover" />
              ) : (
                  <div className="w-10 h-10 rounded-2xl bg-surfaceLight flex items-center justify-center text-sm font-bold shadow-md border border-white/10">
                  {user.name.charAt(0) || 'U'}
                  </div>
              )}
              <div className="flex flex-col">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none mb-1">{t.welcome}</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base tracking-wide text-white leading-none">{user.name.split(' ')[0]}</p>
                  {user.isGuest && <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 font-bold">GUEST</span>}
                </div>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
                {/* Titan Simulator Capsule */}
                <button 
                  onClick={() => setCurrentView('simulator')}
                  className="relative group flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:border-purple-500 transition-all active:scale-95 overflow-hidden"
                >
                    {/* Glowing Pulse Background */}
                    <div className="absolute inset-0 bg-purple-600/10 animate-pulse"></div>
                    
                    <BrainCircuit size={16} className="text-purple-400 group-hover:text-purple-300 transition-colors relative z-10" />
                    <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider relative z-10 hidden sm:block">Titan</span>
                </button>

                {/* Language Switcher */}
                <button 
                    onClick={() => setUser(u => ({...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en'}))}
                    className="w-10 h-10 flex items-center justify-center rounded-full glass hover:bg-white/10 active:scale-90 transition-all group"
                >
                  <Globe className="text-zinc-400 group-hover:text-white w-5 h-5 transition-colors" />
                </button>
            </div>
          </div>
        </div>
      )}

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
              onUpdateBankName={handleUpdateBankName}
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

          {/* New Titan Simulator View */}
          {currentView === 'simulator' && (
            <TitanSimulator 
              user={user} 
              transactions={transactions} 
              onBack={() => setCurrentView('dashboard')} 
            />
          )}
        </div>
      </main>

      <Navigation currentView={currentView} onNavigate={setCurrentView} />
    </div>
  );
};

export default App;