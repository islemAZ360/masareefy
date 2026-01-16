import React, { useState } from 'react';
import { Settings, Globe, ChevronRight, Key, CheckCircle, LogOut, User, Shield, Coins, AlertTriangle, Loader2, Wallet, PiggyBank, X, Check, Trash2 } from 'lucide-react';
import { UserSettings, Currency, Language } from '../types';
import { TRANSLATIONS, RUSSIAN_BANKS } from '../constants';
import { validateApiKey } from '../services/geminiService';
import { deleteUserAccount, auth, signInWithGoogle } from '../services/firebase';

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

  // Wallet Edit State
  const [editingWallet, setEditingWallet] = useState<'spending' | 'savings' | null>(null);
  const [tempBankId, setTempBankId] = useState<string>('sber');
  const [tempName, setTempName] = useState('');
  const [tempColor, setTempColor] = useState('#21A038');

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
                  // If deletion fails due to auth timeout, re-authenticate
                  if (error.code === 'auth/requires-recent-login' || error.message?.includes('login')) {
                      const reAuthConfirm = window.confirm(
                          user.language === 'ar' 
                          ? "لحماية أمانك، يرجى إعادة تسجيل الدخول لتأكيد الحذف." 
                          : "For security, please sign in again to confirm deletion."
                      );
                      
                      if (reAuthConfirm) {
                          await signInWithGoogle(); // Re-authenticate
                          if (auth.currentUser) {
                              await deleteUserAccount(auth.currentUser.uid); // Retry delete
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
          
          // Clear local data and reload
          localStorage.removeItem('masareefy_user');
          localStorage.removeItem('masareefy_txs');
          window.location.reload();
          
      } catch (error) {
          console.error("Delete failed:", error);
          alert(user.language === 'ar' ? "فشل حذف الحساب." : "Failed to delete account.");
          setIsDeleting(false);
      }
  };

  const SettingRow = ({ icon: Icon, title, value, onClick, color = "text-gray-400" }: any) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-zinc-900 border border-white/5 ${color}`}>
                <Icon size={18} />
            </div>
            <span className="font-medium text-gray-200 text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs font-medium">{value}</span>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
        </div>
    </button>
  );

  return (
    <div className="pb-24 space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-2 mb-4">
          <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20">
              <Settings className="w-6 h-6 text-sber-green" />
          </div>
          <h2 className="text-2xl font-bold text-white leading-none">{t.settings}</h2>
      </div>

      {/* Profile Section */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] border border-white/5 flex items-center gap-4">
          <div className="relative">
            {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full border-2 border-zinc-800" />
            ) : (
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                    <span className="text-2xl font-bold text-gray-400">{user.name.charAt(0)}</span>
                </div>
            )}
            {user.isGuest && (
                <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-black">
                    GUEST
                </div>
            )}
          </div>
          <div>
              <h3 className="text-lg font-bold text-white">{user.name || 'Guest User'}</h3>
              <p className="text-xs text-gray-400 font-mono mt-1 truncate max-w-[200px]">
                  ID: {user.apiKey ? '••••' + user.apiKey.slice(-4) : 'No API Key'}
              </p>
          </div>
      </div>
      
      {/* General Settings */}
      <div className="space-y-2">
          <h3 className="px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Preferences</h3>
          <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 overflow-hidden">
            <SettingRow 
                icon={Globe} 
                title="Language" 
                value={user.language === 'ar' ? 'العربية' : user.language === 'ru' ? 'Русский' : 'English'} 
                color="text-purple-400"
                onClick={() => setUser(u => ({...u, language: u.language === 'en' ? 'ar' : u.language === 'ar' ? 'ru' : 'en'}))}
            />
            <div className="h-[1px] bg-white/5 mx-4" />
            <SettingRow 
                icon={Coins} 
                title="Currency" 
                value={user.currency} 
                color="text-yellow-400"
                onClick={() => {
                    const currencies: Currency[] = ['USD', 'SAR', 'AED', 'RUB'];
                    const nextIdx = (currencies.indexOf(user.currency) + 1) % currencies.length;
                    setUser(u => ({...u, currency: currencies[nextIdx]}));
                }}
            />
          </div>
      </div>

      {/* Wallet Management */}
      <div className="space-y-2">
          <h3 className="px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Wallets</h3>
          <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 overflow-hidden">
             {/* Spending Wallet Row */}
             <button 
                onClick={() => openWalletEdit('spending')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
             >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-white">
                        <Wallet size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm block">Main Wallet</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.spendingBankColor }}></div>
                             <span className="text-[10px] text-zinc-500">{user.spendingBankName}</span>
                        </div>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
             </button>

             <div className="h-[1px] bg-white/5 mx-4" />

             {/* Savings Wallet Row */}
             <button 
                onClick={() => openWalletEdit('savings')}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
             >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-sber-green">
                        <PiggyBank size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm block">Savings Pot</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.savingsBankColor }}></div>
                             <span className="text-[10px] text-zinc-500">{user.savingsBankName}</span>
                        </div>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
             </button>
          </div>
      </div>

      {/* AI Settings */}
      <div className="space-y-2">
          <h3 className="px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Intelligence</h3>
          <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 overflow-hidden p-1">
             <button 
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors rounded-[1.8rem]"
             >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-sber-green">
                        <Key size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-gray-200 text-sm block">Gemini API Key</span>
                        <span className="text-[10px] text-zinc-500 block">Required for AI analysis</span>
                    </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${showKeyInput ? 'rotate-90' : ''}`} />
             </button>

             {showKeyInput && (
                 <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                     <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                        {t.change_key_desc}
                     </p>
                     <div className="flex gap-2">
                        <input 
                            type="password" 
                            placeholder="Paste new API Key" 
                            value={editingKey}
                            onChange={(e) => setEditingKey(e.target.value)}
                            className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-sber-green outline-none"
                        />
                        <button 
                            onClick={handleUpdateApiKey}
                            disabled={!editingKey || isValidatingKey}
                            className="bg-white text-black px-4 rounded-xl font-bold text-xs disabled:opacity-50"
                        >
                            {isValidatingKey ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save'}
                        </button>
                     </div>
                 </div>
             )}
          </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-3 pt-4">
          <button 
            onClick={onLogout}
            className="w-full bg-[#1C1C1E] border border-white/5 hover:bg-white/10 p-4 rounded-[1.5rem] flex items-center justify-center gap-2 transition-all group"
          >
            <LogOut size={18} className="text-zinc-400 group-hover:text-white" />
            <span className="font-bold text-zinc-400 group-hover:text-white text-sm">{t.sign_out}</span>
          </button>

          <button 
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 p-4 rounded-[1.5rem] flex items-center justify-center gap-2 transition-all group"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin text-red-500" /> : <Trash2 size={18} className="text-red-500" />}
            <span className="font-bold text-red-500 text-sm">
                {user.language === 'ar' ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
            </span>
          </button>
          
          <div className="text-center pt-2">
              <p className="text-[10px] text-zinc-600 font-mono">Masareefy v2.2.0 (Premium)</p>
          </div>
      </div>

      {/* Wallet Edit Modal */}
      {editingWallet && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setEditingWallet(null)} />
            <div className="relative w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300">
               <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6 sm:hidden" />
               
               <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl font-bold text-white">Edit {editingWallet === 'spending' ? 'Main Wallet' : 'Savings'}</h3>
                   <button onClick={() => setEditingWallet(null)} className="p-2 bg-white/5 rounded-full"><X size={16} /></button>
               </div>

               <div className="space-y-4">
                  {/* Bank Grid */}
                  <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {RUSSIAN_BANKS.filter(b => b.id !== 'other').map(bank => (
                          <button
                              key={bank.id}
                              onClick={() => {
                                  setTempBankId(bank.id);
                                  setTempName(bank.name);
                                  setTempColor(bank.color);
                              }}
                              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border ${tempBankId === bank.id ? 'bg-white/10 border-sber-green scale-105' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
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
                          onClick={() => setTempBankId('other')}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border ${tempBankId === 'other' ? 'bg-white/10 border-sber-green scale-105' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
                      >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] bg-zinc-700 text-white">
                              ...
                          </div>
                          <span className="text-[9px] text-zinc-400">Custom</span>
                      </button>
                  </div>

                  {/* Custom Inputs */}
                  {tempBankId === 'other' && (
                      <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-3 animate-in fade-in">
                          <div>
                              <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Bank Name</label>
                              <input 
                                  type="text" 
                                  value={tempName} 
                                  onChange={e => setTempName(e.target.value)} 
                                  placeholder="My Bank"
                                  className="w-full bg-black p-3 rounded-xl border border-zinc-700 text-white text-sm focus:border-sber-green outline-none"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Card Color</label>
                              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                  {['#21A038', '#EF3124', '#002882', '#FFDD2D', '#000000', '#BF5AF2', '#FF9500'].map(c => (
                                      <button
                                          key={c}
                                          onClick={() => setTempColor(c)}
                                          className={`w-8 h-8 rounded-full border-2 transition-transform ${tempColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                                          style={{ backgroundColor: c }}
                                      />
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  <button 
                      onClick={saveWalletChanges}
                      className="w-full bg-sber-green text-white font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2"
                  >
                      <Check size={18} /> Save Changes
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};