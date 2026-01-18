import React, { useState } from 'react';
import { RecurringBill, UserSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { Check, Calendar, Plus, Trash2, Receipt } from 'lucide-react';

interface Props {
  user: UserSettings;
  onPayBill: (billId: string, date: string, deduct: boolean) => void;
  onAddBill: (name: string, amount: number) => void;
  onDeleteBill: (id: string) => void;
}

export const RecurringBills: React.FC<Props> = ({ user, onPayBill, onAddBill, onDeleteBill }) => {
  const t = TRANSLATIONS[user.language];
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);
  
  // Add Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Payment Modal State
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [deduct, setDeduct] = useState(true);

  const bills = user.recurringBills || [];
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const handleSaveNewBill = () => {
    if (newName && newAmount) {
        onAddBill(newName, parseFloat(newAmount));
        setNewName('');
        setNewAmount('');
        setIsAdding(false);
    }
  };

  const confirmPayment = () => {
    if (selectedBill) {
      onPayBill(selectedBill.id, payDate, deduct);
      setSelectedBill(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* List */}
      {bills.length === 0 ? (
        <div 
            onClick={() => setIsAdding(true)}
            className="flex flex-col items-center justify-center py-8 border border-dashed border-white/10 rounded-2xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
        >
            <div className="p-3 rounded-full bg-white/5 group-hover:scale-110 transition-transform mb-2">
                <Plus className="w-5 h-5 text-zinc-500 group-hover:text-white" />
            </div>
            <p className="text-xs text-zinc-500 font-medium">Tap to add fixed bills</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
            {bills.map((bill, idx) => {
            const isPaid = bill.lastPaidDate && bill.lastPaidDate.startsWith(currentMonth);
            return (
                <div 
                key={bill.id}
                onClick={() => !isPaid && setSelectedBill(bill)}
                className={`
                    relative overflow-hidden p-4 rounded-2xl transition-all duration-300 flex items-center justify-between group
                    ${isPaid 
                        ? 'bg-sber-green/5 border border-sber-green/10 opacity-60' 
                        : 'glass-card glass-card-hover cursor-pointer'
                    }
                    animate-slide-up-fade
                `}
                style={{ animationDelay: `${idx * 50}ms` }}
                >
                <div className="flex items-center gap-4 z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${isPaid ? 'bg-sber-green/20 border-sber-green/20 text-sber-green' : 'bg-white/5 border-white/5 text-zinc-400 group-hover:text-white'}`}>
                        {isPaid ? <Check size={18} strokeWidth={3} /> : <Receipt size={18} />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isPaid ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-white'}`}>{bill.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {isPaid ? `Paid: ${bill.lastPaidDate}` : 'Due this month'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 z-10">
                    <span className={`font-display font-bold text-sm ${isPaid ? 'text-zinc-500' : 'text-white'}`}>
                        {bill.amount} <span className="text-[10px] opacity-50 font-sans">{user.currency}</span>
                    </span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteBill(bill.id); }}
                        className="p-2 rounded-full hover:bg-red-500/20 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                </div>
            );
            })}
            
            {/* Add Button Row */}
            <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-3 rounded-xl border border-dashed border-white/10 text-xs font-bold text-zinc-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 hover:bg-white/5 uppercase tracking-wider"
            >
                <Plus size={14} /> Add Bill
            </button>
        </div>
      )}

      {/* Payment Modal */}
      {selectedBill && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="absolute inset-0" onClick={() => setSelectedBill(null)} />
            <div className="relative glass-panel w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 animate-slide-up-fade shadow-2xl border border-white/10">
               <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
               
               <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-sber-green/10 rounded-full flex items-center justify-center mx-auto mb-4 text-sber-green border border-sber-green/20 shadow-[0_0_20px_rgba(33,160,56,0.2)]">
                      <Check size={32} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-1">{t.confirm_payment}</h3>
                  <p className="text-sm text-zinc-400">Mark <span className="text-white font-bold">{selectedBill.name}</span> as paid?</p>
               </div>

               <div className="space-y-4">
                  <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Amount</span>
                      <span className="text-lg font-display font-bold text-white">{selectedBill.amount} {user.currency}</span>
                  </div>

                  <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2 mb-1 block">Date</label>
                        <input 
                            type="date" 
                            value={payDate}
                            onChange={(e) => setPayDate(e.target.value)}
                            className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 text-sm outline-none focus:border-sber-green focus:shadow-[0_0_15px_rgba(33,160,56,0.2)] transition-all"
                        />
                      </div>
                  </div>

                  <div 
                    onClick={() => setDeduct(!deduct)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${deduct ? 'bg-sber-green/10 border-sber-green/50' : 'bg-black/40 border-white/5'}`}
                  >
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${deduct ? 'bg-sber-green border-sber-green shadow-[0_0_10px_#22c55e]' : 'border-zinc-600'}`}>
                        {deduct && <Check size={12} className="text-white" />}
                     </div>
                     <span className="text-sm font-medium text-zinc-300">{t.deduct_balance}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button onClick={() => setSelectedBill(null)} className="py-3 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                      <button onClick={confirmPayment} className="py-3 rounded-xl font-bold text-sm bg-sber-green text-white shadow-[0_0_20px_rgba(33,160,56,0.3)] hover:shadow-[0_0_30px_rgba(33,160,56,0.5)] transition-all active:scale-95">Confirm</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Add Bill Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="absolute inset-0" onClick={() => setIsAdding(false)} />
            <div className="relative glass-panel w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 animate-slide-up-fade shadow-2xl border border-white/10">
               <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
               
               <h3 className="text-xl font-display font-bold text-white mb-6 text-center">{t.add_bill}</h3>
               
               <div className="space-y-5">
                  <div className="group">
                     <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2 mb-1 block group-focus-within:text-white transition-colors">{t.bill_name}</label>
                     <input 
                        type="text"
                        placeholder="e.g. Netflix"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-white/30 focus:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none transition-all placeholder-zinc-700"
                        autoFocus
                     />
                  </div>
                  <div className="group">
                     <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2 mb-1 block group-focus-within:text-white transition-colors">{t.bill_amount}</label>
                     <div className="relative">
                        <input 
                            type="number"
                            placeholder="0.00"
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value)}
                            className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-white/30 focus:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none transition-all placeholder-zinc-700"
                        />
                        <span className="absolute right-4 top-4 text-zinc-500 font-bold text-sm pointer-events-none">{user.currency}</span>
                     </div>
                  </div>

                  <button 
                     onClick={handleSaveNewBill}
                     disabled={!newName || !newAmount}
                     className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-2xl font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 uppercase tracking-wider"
                  >
                     {t.save}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};