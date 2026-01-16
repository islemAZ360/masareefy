import React, { useState } from 'react';
import { RecurringBill, UserSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { Check, Calendar, X, Plus, Trash2, AlertCircle } from 'lucide-react';

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
            className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
        >
            <Plus className="w-6 h-6 text-zinc-500 mb-2" />
            <p className="text-xs text-zinc-500 font-medium">Tap to add fixed bills</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
            {bills.map(bill => {
            const isPaid = bill.lastPaidDate && bill.lastPaidDate.startsWith(currentMonth);
            return (
                <div 
                key={bill.id}
                onClick={() => !isPaid && setSelectedBill(bill)}
                className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${
                    isPaid 
                    ? 'bg-sber-green/5 border-sber-green/20 opacity-60' 
                    : 'bg-[#1C1C1E] border-white/5 hover:border-white/10 active:scale-[0.98]'
                }`}
                >
                <div className="flex items-center gap-4 z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isPaid ? 'bg-sber-green text-white' : 'bg-white/5 text-zinc-400'}`}>
                        {isPaid ? <Check size={18} strokeWidth={3} /> : <Calendar size={18} />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isPaid ? 'text-zinc-500 line-through' : 'text-white'}`}>{bill.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">
                            {isPaid ? `Paid: ${bill.lastPaidDate}` : 'Due this month'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 z-10">
                    <span className={`font-bold text-sm ${isPaid ? 'text-zinc-500' : 'text-white'}`}>
                        {bill.amount} <span className="text-[10px] opacity-50">{user.currency}</span>
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
                className="w-full py-3 rounded-xl border border-dashed border-white/10 text-xs font-bold text-zinc-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
                <Plus size={14} /> Add Bill
            </button>
        </div>
      )}

      {/* Payment Modal */}
      {selectedBill && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedBill(null)} />
            <div className="relative bg-[#1C1C1E] border border-white/10 w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300">
               <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6 sm:hidden" />
               
               <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-sber-green/10 rounded-full flex items-center justify-center mx-auto mb-4 text-sber-green">
                      <Check size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{t.confirm_payment}</h3>
                  <p className="text-sm text-gray-400">Mark <span className="text-white font-bold">{selectedBill.name}</span> as paid?</p>
               </div>

               <div className="space-y-4">
                  <div className="bg-black/40 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                      <span className="text-sm text-gray-400">Amount</span>
                      <span className="text-lg font-bold text-white">{selectedBill.amount} {user.currency}</span>
                  </div>

                  <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-2 mb-1 block">Date</label>
                        <input 
                            type="date" 
                            value={payDate}
                            onChange={(e) => setPayDate(e.target.value)}
                            className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 text-sm outline-none focus:border-sber-green"
                        />
                      </div>
                  </div>

                  <div 
                    onClick={() => setDeduct(!deduct)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${deduct ? 'bg-sber-green/10 border-sber-green/50' : 'bg-black/40 border-white/5'}`}
                  >
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${deduct ? 'bg-sber-green border-sber-green' : 'border-zinc-600'}`}>
                        {deduct && <Check size={12} className="text-white" />}
                     </div>
                     <span className="text-sm font-medium text-gray-300">{t.deduct_balance}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button onClick={() => setSelectedBill(null)} className="py-3 rounded-xl font-bold text-sm bg-zinc-800 text-white">Cancel</button>
                      <button onClick={confirmPayment} className="py-3 rounded-xl font-bold text-sm bg-sber-green text-white shadow-lg shadow-sber-green/20">Confirm</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Add Bill Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAdding(false)} />
            <div className="relative bg-[#1C1C1E] border border-white/10 w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300">
               <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6 sm:hidden" />
               
               <h3 className="text-xl font-bold text-white mb-6 text-center">{t.add_bill}</h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] text-gray-500 font-bold uppercase ml-2 mb-1 block">{t.bill_name}</label>
                     <input 
                        type="text"
                        placeholder="e.g. Netflix"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:outline-none transition-colors"
                        autoFocus
                     />
                  </div>
                  <div>
                     <label className="text-[10px] text-gray-500 font-bold uppercase ml-2 mb-1 block">{t.bill_amount}</label>
                     <div className="relative">
                        <input 
                            type="number"
                            placeholder="0.00"
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value)}
                            className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:outline-none transition-colors"
                        />
                        <span className="absolute right-4 top-4 text-gray-500 font-bold text-sm pointer-events-none">{user.currency}</span>
                     </div>
                  </div>

                  <button 
                     onClick={handleSaveNewBill}
                     disabled={!newName || !newAmount}
                     className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-2xl font-bold text-sm shadow-lg mt-2 disabled:opacity-50"
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