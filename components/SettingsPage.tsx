import React, { useState, useRef } from 'react';
import { Settings, Globe, ChevronRight, Key, LogOut, Wallet, PiggyBank, X, Check, Trash2, Loader2, Calculator, Target, Camera, Pencil, Shield, Sparkles } from 'lucide-react';
import { UserSettings, BudgetPlan } from '../types';
import { TRANSLATIONS, RUSSIAN_BANKS } from '../constants';
import { validateApiKey } from '../services/geminiService';
import { deleteUserAccount, auth, reauthenticateUser, logoutUser } from '../services/firebase';
import { BudgetPlans } from './BudgetPlans';

interface Props {
  user: UserSettings;
  setUser: React.Dispatch<React.SetStateAction<UserSettings>>;
  onLogout: () => void;
}

export const SettingsPage: React.FC<Props> = ({ user, setUser, onLogout }) => {
  const t = TRANSLATIONS[user.language];
  const [editingKey, setEditingKey] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Budget Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Wallet Edit State
  const [editingWallet, setEditingWallet] = useState<'spending' | 'savings' | null>(null);
  const [tempBankId, setTempBankId] = useState<string>('sber');
  const [tempName, setTempName] = useState('');
  const [tempColor, setTempColor] = useState('#21A038');

  // --- Handlers ---

  const handleUpdateApiKey = async () => {
    if (!editingKey.trim()) return;
    setIsValidatingKey(true);
    const isValid = await validateApiKey(editingKey.trim());
    if (isValid) {
      setUser(u => ({ ...u, apiKey: editingKey.trim(), isGuest: false }));
      alert(t.key_valid_saved);
      setEditingKey('');
      setShowKeyInput(false);
    } else {
      alert(t.key_invalid);
    }
    setIsValidatingKey(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser(prev => ({ ...prev, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveName = () => {
    if (newName.trim()) {
      setUser(prev => ({ ...prev, name: newName.trim() }));
      setIsEditingName(false);
    }
  };

  const handlePlanSelection = (plan: BudgetPlan) => {
    setUser(u => ({ ...u, selectedPlan: plan.type, dailyLimit: plan.dailyLimit }));
    setShowPlanModal(false);
  };

  const openWalletEdit = (type: 'spending' | 'savings') => {
      setEditingWallet(type);
      const currentName = type === 'spending' ? user.spendingBankName : user.savingsBankName;
      const currentColor = type === 'spending' ? user.spendingBankColor : user.savingsBankColor;
      
      const preset = RUSSIAN_BANKS.find(b => b.name === currentName && b.color === currentColor);
      if (preset) {
          setTempBankId(preset.id);
          setTempName('');
          setTempColor(preset.color);
      } else {
          setTempBankId('other');
          setTempName(currentName);
          setTempColor(currentColor);
      }
  };

  const saveWalletChanges = () => {
      if (!editingWallet) return;
      
      const bank = RUSSIAN_BANKS.find(b => b.id === tempBankId);
      const finalName = bank && tempBankId !== 'other' ? bank.name : tempName;
      const finalColor = bank && tempBankId !== 'other' ? bank.color : tempColor;
      const finalTextColor = bank && tempBankId !== 'other' ? bank.textColor : '#FFFFFF';

      if (!finalName) return alert("Please enter a bank name");

      setUser(prev => ({
          ...prev,
          [editingWallet === 'spending' ? 'spendingBankName' : 'savingsBankName']: finalName,
          [editingWallet === 'spending' ? 'spendingBankColor' : 'savingsBankColor']: finalColor,
          [editingWallet === 'spending' ? 'spendingTextColor' : 'savingsTextColor']: finalTextColor,
      }));
      
      setEditingWallet(null);
  };

  const handleDeleteAccount = async () => {
      const confirmMsg1 = user.language === 'ar' 
        ? "هل أنت متأكد أنك تريد حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء." 
        : "Are you sure you want to delete your account? This action cannot be undone.";
      
      const confirmMsg2 = user.language === 'ar'
        ? "سيتم حذف جميع بياناتك ومعاملاتك نهائياً. هل تؤكد الحذف؟"
        : "All your data and transactions will be permanently lost. Confirm deletion?";

      if (!window.confirm(confirmMsg1)) return;
      if (!window.confirm(confirmMsg2)) return;

      setIsDeleting(true);
      try {
          if (!user.isGuest && auth.currentUser) {
              try {
                  await deleteUserAccount(auth.currentUser.uid);
              } catch (error: any) {
                  // Catch the specific "Recent Login Required" error
                  if (error.code === 'auth/requires-recent-login' || error.message?.includes('recent-login')) {
                      const reAuthConfirm = window.confirm(
                          user.language === 'ar' 
                          ? "لأغراض أمنية، يرجى تأكيد هويتك (إعادة المصادقة) لإتمام حذف الحساب." 
                          : "For security, please confirm your identity (re-authenticate) to complete account deletion."
                      );
                      
                      if (reAuthConfirm) {
                          // Trigger Re-authentication popup
                          const reauthed = await reauthenticateUser();
                          if (reauthed && auth.currentUser) {
                              // Retry delete immediately after success
                              await deleteUserAccount(auth.currentUser.uid);
                          } else {
                              throw new Error("Re-authentication failed or cancelled.");
                          }
                      } else {
                          setIsDeleting(false);
                          return;
                      }
                  } else {
                      throw error;
                  }
              }
          }
          
          // Cleanup Local Data
          localStorage.removeItem('masareefy_user');
          localStorage.removeItem('masareefy_txs');
          
          // Force Reload to go back to clean slate
          window.location.reload();
          
      } catch (error: any) {
          console.error("Delete failed:", error);
          alert(user.language === 'ar' 
            ? `فشل حذف الحساب: ${error.message}` 
            : `Failed to delete account: ${error.message}`);
          setIsDeleting(false);
      }
  };

  // Reusable Modern Row
  const SettingRow = ({ icon: Icon, title, value, onClick, color = "text-zinc-400", delay = 0 }: any) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all duration-300 group rounded-xl active:scale-[0.99]"
    >
        <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner transition-colors group-hover:border-white/10 ${color}`}>
                <Icon size={18} />
            </div>
            <span className="font-medium text-gray-200 text-sm tracking-wide group-hover:text-white transition-colors">{title}</span>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs font-medium font-mono bg-white/5 px-2 py-1 rounded-md border border-white/5 group-hover:bg-white/10 transition-colors">{value}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/0 group-hover:bg-white/5 transition-colors">
                 <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </div>
        </div>
    </button>
  );

  return (
    <div className="pb-40 space-y-8 px-1">
      
      {/* 1. Header Area */}
      <div className="flex items-center justify-between pt-4 animate-slide-down">
          <div>
            <h2 className="text-4xl font-bold text-white tracking-tighter mb-1">{t.settings}</h2>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Preferences & Account</p>
          </div>
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <Settings className="w-5 h-5 text-zinc-400 animate-spin-slow" />
          </div>
      </div>

      {/* 2. Profile Hero Card */}
      <div className="relative glass-panel p-6 rounded-[2.5rem] overflow-hidden group animate-scale-in" style={{ animationDelay: '0.1s' }}>
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sber-green/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-sber-green/20 transition-colors duration-700 pointer-events-none"></div>
          
          <div className="flex items-center gap-5 relative z-10">
              <div className="relative cursor-pointer group/avatar" onClick={() => fileInputRef.current?.click()}>
                <div className="w-20 h-20 rounded-[1.5rem] p-1 bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-xl overflow-hidden relative">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-[1.2rem] object-cover" />
                    ) : (
                        <div className="w-full h-full rounded-[1.2rem] bg-zinc-900 flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-500">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
                        <Camera size={24} className="text-white drop-shadow-lg" />
                    </div>
                </div>
                {user.isGuest && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-[#121212] z-20 shadow-lg">
                        GUEST
                    </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
              
              <div className="flex-1 min-w-0">
                  {isEditingName ? (
                      <div className="flex items-center gap-2 animate-in fade-in">
                          <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white font-bold text-lg w-full outline-none focus:border-sber-green focus:ring-1 focus:ring-sber-green transition-all"
                            autoFocus
                          />
                          <button onClick={saveName} className="p-2.5 bg-sber-green rounded-xl text-white shadow-lg hover:bg-green-600 transition-colors active:scale-95"><Check size={18} /></button>
                          <button onClick={() => { setIsEditingName(false); setNewName(user.name); }} className="p-2.5 bg-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/20 transition-colors"><X size={18} /></button>
                      </div>
                  ) : (
                      <div className="group/name">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-2xl font-bold text-white truncate">{user.name || 'Guest User'}</h3>
                            <button onClick={() => setIsEditingName(true)} className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover/name:opacity-100">
                                <Pencil size={14} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-zinc-500">
                                ID: {user.apiKey ? '••••' + user.apiKey.slice(-4) : 'N/A'}
                            </span>
                            {!user.isGuest && (
                                <span className="flex items-center gap-1 text-[10px] text-sber-green font-bold bg-sber-green/10 px-2 py-0.5 rounded-md border border-sber-green/20">
                                    <Shield size={10} /> PRO
                                </span>
                            )}
                        </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
      
      {/* 3. General Settings Group */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Application
          </h3>
          <div className="bg-[#121212]/80 backdrop-blur-md rounded-[2rem] border border-white/5 overflow-hidden p-1 shadow-2xl">
            <SettingRow 
                icon={Globe} 
                title="Language" 
                value={user.language === 'ar' ? 'العربية' : user.language === 'ru' ? 'Русский' : 'English'} 
                color="text-indigo-400 group-hover:text-indigo-300"
                onClick={() => setUser(u => ({...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en'}))}
            />
            <div className="h-[1px] bg-white/5 mx-4" />
            <SettingRow 
                icon={Target} 
                title="Currency" 
                value={user.currency} 
                color="text-emerald-400 group-hover:text-emerald-300"
                onClick={() => {
                    const currencies: any[] = ['USD', 'SAR', 'AED', 'RUB'];
                    const nextIdx = (currencies.indexOf(user.currency) + 1) % currencies.length;
                    setUser(u => ({...u, currency: currencies[nextIdx]}));
                }}
            />
          </div>
      </div>

      {/* 4. Budget & Wallets Group */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
             <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Finance Control
          </h3>
          <div className="bg-[#121212]/80 backdrop-blur-md rounded-[2rem] border border-white/5 overflow-hidden p-1 shadow-2xl">
             <SettingRow 
                icon={Calculator} 
                title={user.language === 'ar' ? 'خطة الصرف' : 'Budget Plan'}
                value={user.selectedPlan ? user.selectedPlan.toUpperCase() : 'NOT SET'} 
                color="text-blue-400 group-hover:text-blue-300"
                onClick={() => setShowPlanModal(true)}
            />
             <div className="h-[1px] bg-white/5 mx-4" />
             {/* Spending Wallet */}
             <button 
                onClick={() => openWalletEdit('spending')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all duration-300 group rounded-xl active:scale-[0.99]"
             >
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner transition-colors group-hover:border-white/10 text-white">
                        <Wallet size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm tracking-wide group-hover:text-white transition-colors block">Main Wallet</span>
                        <div className="flex items-center gap-1.5 mt-1">
                             <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: user.spendingBankColor, color: user.spendingBankColor }}></div>
                             <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">{user.spendingBankName}</span>
                        </div>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/0 group-hover:bg-white/5 transition-colors">
                     <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
             </button>

             <div className="h-[1px] bg-white/5 mx-4" />

             {/* Savings Wallet */}
             <button 
                onClick={() => openWalletEdit('savings')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all duration-300 group rounded-xl active:scale-[0.99]"
             >
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner transition-colors group-hover:border-white/10 text-sber-green">
                        <PiggyBank size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm tracking-wide group-hover:text-white transition-colors block">Savings Pot</span>
                        <div className="flex items-center gap-1.5 mt-1">
                             <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: user.savingsBankColor, color: user.savingsBankColor }}></div>
                             <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">{user.savingsBankName}</span>
                        </div>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/0 group-hover:bg-white/5 transition-colors">
                     <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
             </button>
          </div>
      </div>

      {/* 5. Intelligence (AI) Group */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
             <span className="w-1 h-1 bg-zinc-600 rounded-full"></span> Intelligence
          </h3>
          <div className="bg-[#121212]/80 backdrop-blur-md rounded-[2rem] border border-white/5 overflow-hidden p-1 shadow-2xl">
             <button 
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors rounded-[1.8rem] group"
             >
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner text-purple-400 group-hover:text-purple-300">
                        <Sparkles size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm block group-hover:text-white transition-colors">Gemini AI Core</span>
                        <span className="text-[10px] text-zinc-500 block group-hover:text-zinc-400 transition-colors">Manage neural engine access</span>
                    </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform duration-300 ${showKeyInput ? 'rotate-90 text-white' : ''}`} />
             </button>

             {/* Expandable Key Input */}
             {showKeyInput && (
                 <div className="px-4 pb-4 pt-2 animate-in slide-in-from-top-2 fade-in">
                     <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                            {t.change_key_desc}
                        </p>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                                <input 
                                    type="password" 
                                    placeholder="Paste new API Key" 
                                    value={editingKey}
                                    onChange={(e) => setEditingKey(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm focus:border-purple-500 focus:shadow-[0_0_15px_rgba(168,85,247,0.2)] outline-none transition-all placeholder-zinc-700 text-white"
                                />
                            </div>
                            <button 
                                onClick={handleUpdateApiKey}
                                disabled={!editingKey || isValidatingKey}
                                className="bg-white text-black px-5 rounded-xl font-bold text-xs disabled:opacity-50 hover:bg-gray-200 transition-colors shadow-lg"
                            >
                                {isValidatingKey ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save'}
                            </button>
                        </div>
                     </div>
                 </div>
             )}
          </div>
      </div>

      {/* 6. Danger Zone */}
      <div className="grid grid-cols-2 gap-3 pt-4 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <button 
            onClick={onLogout}
            className="bg-[#1C1C1E] border border-white/5 hover:bg-white/10 p-5 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all group hover:border-white/10"
          >
            <LogOut size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
            <span className="font-bold text-zinc-500 group-hover:text-white text-xs uppercase tracking-widest">{t.sign_out}</span>
          </button>

          <button 
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 p-5 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {isDeleting ? <Loader2 size={20} className="animate-spin text-red-500" /> : <Trash2 size={20} className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
            <span className="font-bold text-red-500 text-xs uppercase tracking-widest relative z-10">Delete</span>
          </button>
      </div>

      <div className="text-center pt-6 pb-2 opacity-30 hover:opacity-100 transition-opacity duration-500">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5">
              <span className="w-1.5 h-1.5 bg-sber-green rounded-full shadow-[0_0_5px_currentColor]"></span>
              <p className="text-[9px] text-zinc-400 font-mono tracking-widest">v2.5.0 • TITAN ENGINE ACTIVE</p>
           </div>
      </div>

      {/* --- MODALS --- */}

      {/* Plan Selection Modal */}
      {showPlanModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-500" onClick={() => setShowPlanModal(false)} />
              <div className="relative w-full max-w-lg glass-strong border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-white/10">
                   <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8 sm:hidden" />
                   
                   <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-bold text-white">Select Strategy</h3>
                            <p className="text-zinc-500 text-xs mt-1">Choose your spending behavior.</p>
                        </div>
                        <button onClick={() => setShowPlanModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><X size={18} /></button>
                   </div>
                   
                   <BudgetPlans user={user} onSelectPlan={handlePlanSelection} />
              </div>
          </div>
      )}

      {/* Wallet Edit Modal */}
      {editingWallet && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-500" onClick={() => setEditingWallet(null)} />
            <div className="relative w-full max-w-sm glass-strong border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
               <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8 sm:hidden" />
               
               <div className="flex items-center justify-between mb-6">
                   <div>
                       <h3 className="text-xl font-bold text-white">Configure Wallet</h3>
                       <p className="text-zinc-500 text-xs mt-1">{editingWallet === 'spending' ? 'Main Spending Source' : 'Savings Destination'}</p>
                   </div>
                   <button onClick={() => setEditingWallet(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><X size={18} /></button>
               </div>

               <div className="space-y-6">
                  {/* Bank Grid */}
                  <div className="grid grid-cols-4 gap-3 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                      {RUSSIAN_BANKS.filter(b => b.id !== 'other').map(bank => (
                          <button
                              key={bank.id}
                              onClick={() => {
                                  setTempBankId(bank.id);
                                  setTempName(bank.name);
                                  setTempColor(bank.color);
                              }}
                              className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border duration-300 ${tempBankId === bank.id ? 'bg-white/10 border-sber-green shadow-[0_0_15px_rgba(33,160,56,0.3)] scale-105' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}
                          >
                              {bank.logo ? (
                                  <img 
                                    src={bank.logo} 
                                    alt={bank.name} 
                                    className="w-10 h-10 rounded-full object-cover shadow-lg bg-white p-0.5"
                                  />
                              ) : (
                                  <div 
                                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg"
                                      style={{ backgroundColor: bank.color, color: bank.textColor }}
                                  >
                                      {bank.name.substring(0, 2).toUpperCase()}
                                  </div>
                              )}
                              <span className="text-[9px] text-zinc-400 truncate w-full text-center font-medium">{bank.name}</span>
                          </button>
                      ))}
                      <button
                          onClick={() => setTempBankId('other')}
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border duration-300 ${tempBankId === 'other' ? 'bg-white/10 border-sber-green shadow-[0_0_15px_rgba(33,160,56,0.3)] scale-105' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}
                      >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] bg-zinc-800 text-white border border-white/10">
                              ...
                          </div>
                          <span className="text-[9px] text-zinc-400 font-medium">Custom</span>
                      </button>
                  </div>

                  {/* Custom Inputs */}
                  {tempBankId === 'other' && (
                      <div className="bg-black/40 p-5 rounded-3xl border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div>
                              <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Bank Name</label>
                              <input 
                                  type="text" 
                                  value={tempName} 
                                  onChange={e => setTempName(e.target.value)} 
                                  placeholder="My Bank"
                                  className="w-full bg-black p-4 rounded-2xl border border-white/10 text-white text-sm focus:border-sber-green focus:shadow-[0_0_15px_rgba(33,160,56,0.2)] outline-none transition-all placeholder-zinc-700"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block tracking-wider">Card Color</label>
                              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                  {['#21A038', '#EF3124', '#002882', '#FFDD2D', '#000000', '#BF5AF2', '#FF9500'].map(c => (
                                      <button
                                          key={c}
                                          onClick={() => setTempColor(c)}
                                          className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${tempColor === c ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`}
                                          style={{ backgroundColor: c }}
                                      />
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  <button 
                      onClick={saveWalletChanges}
                      className="w-full bg-white text-black font-bold py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-gray-200 transition-all active:scale-95 text-sm"
                  >
                      <Check size={18} strokeWidth={2.5} /> Save Changes
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};