import React, { useState } from 'react';
import { RecurringBill, UserSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { Check, Calendar, X, Plus, Trash2 } from 'lucide-react';

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
    <div className="bg-[#1C1C1E] rounded-[2rem] p-6 border border-white/5 shadow-xl relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-sber-green/5 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sber-green" />
            {t.fixed_bills}
        </h3>
        <button 
            onClick={() => setIsAdding(true)}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-sber-green hover:bg-sber-green hover:text-white transition-all border border-white/5 shadow-sm"
        >
            <Plus size={18} />
        </button>
      </div>

      <div className="space-y-3 relative z-10">
        {bills.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm bg-black/20 rounded-2xl border border-dashed border-zinc-800">
                No fixed bills added yet.
            </div>
        )}

        {bills.map(bill => {
          const isPaid = bill.lastPaidDate && bill.lastPaidDate.startsWith(currentMonth);
          return (
            <div 
              key={bill.id}
              className={`group/item flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                isPaid 
                ? 'bg-sber-green/5 border-sber-green/20 opacity-70' 
                : 'bg-black/20 border-white/5 hover:border-zinc-600 hover:bg-black/40'
              }`}
              onClick={() => !isPaid && setSelectedBill(bill)}
            >
              <div className="flex items-center gap-4 flex-1">
                 <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${isPaid ? 'bg-sber-green border-sber-green shadow-[0_0_10px_rgba(33,160,56,0.3)]' : 'border-zinc-700 bg-white/5 group-hover/item:border-sber-green'}`}>
                    {isPaid && <Check className="w-4 h-4 text-white" />}
                 </div>
                 <div>
                    <p className={`font-bold text-sm transition-colors ${isPaid ? 'line-through text-gray-500' : 'text-white group-hover/item:text-gray-200'}`}>{bill.name}</p>
                    {isPaid ? (
                        <p className="text-[10px] text-sber-green font-medium">Paid {bill.lastPaidDate}</p>
                    ) : (
                        <p className="text-[10px] text-gray-500">Tap to mark paid</p>
                    )}
                 </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold text-sm ${isPaid ? 'text-gray-500' : 'text-white'}`}>
                      {bill.amount.toLocaleString()} <span className="text-[10px] font-sans text-gray-500">{user.currency}</span>
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteBill(bill.id); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
                  >
                      <Trash2 size={16} />
                  </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {selectedBill && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Darker overlay to prevent bleed-through */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedBill(null)} />
            
            <div className="relative bg-[#1C1C1E] border border-white/10 w-full max-w-sm rounded-[2rem] p-6 animate-in zoom-in-95 duration-200 shadow-2xl">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-white">{t.confirm_payment}</h3>
                  <button onClick={() => setSelectedBill(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                      <X size={20} />
                  </button>
               </div>
               
               <div className="mb-8 text-center bg-black/20 rounded-3xl p-6 border border-white/5">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">{t.bill_name}</p>
                  <p className="text-3xl font-bold text-white mb-3">{selectedBill.name}</p>
                  <div className="inline-block bg-sber-green/10 text-sber-green border border-sber-green/20 px-4 py-1.5 rounded-full font-mono font-bold text-lg">
                    {selectedBill.amount.toLocaleString()} {user.currency}
                  </div>
               </div>

               <div className="space-y-4">
                  <div>
                     <label className="text-xs text-gray-400 ml-2 mb-2 block font-bold uppercase tracking-wider">{t.payment_date}</label>
                     <input 
                        type="date" 
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:outline-none transition-colors"
                     />
                  </div>

                  <label className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-white/10 cursor-pointer hover:border-zinc-600 transition-colors">
                     <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${deduct ? 'bg-sber-green border-sber-green' : 'border-zinc-600'}`}>
                        {deduct && <Check className="w-4 h-4 text-white" />}
                     </div>
                     <input type="checkbox" checked={deduct} onChange={e => setDeduct(e.target.checked)} className="hidden" />
                     <span className="text-sm font-medium text-gray-200">{t.deduct_balance}</span>
                  </label>

                  <button 
                     onClick={confirmPayment}
                     className="w-full bg-sber-green hover:bg-green-600 py-4 rounded-2xl font-bold text-white shadow-lg shadow-sber-green/20 transition-all active:scale-95 mt-2"
                  >
                     {t.confirm}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Add Bill Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsAdding(false)} />
            
            <div className="relative bg-[#1C1C1E] border border-white/10 w-full max-w-sm rounded-[2rem] p-6 animate-in zoom-in-95 duration-200 shadow-2xl">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-white">{t.add_bill}</h3>
                  <button onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                      <X size={20} />
                  </button>
               </div>
               
               <div className="space-y-5">
                  <div>
                     <label className="text-xs text-gray-400 ml-2 mb-2 block font-bold uppercase tracking-wider">{t.bill_name}</label>
                     <input 
                        type="text"
                        placeholder="e.g. Netflix"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-sber-green focus:outline-none transition-colors"
                     />
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 ml-2 mb-2 block font-bold uppercase tracking-wider">{t.bill_amount}</label>
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
                     className="w-full bg-sber-green hover:bg-green-600 py-4 rounded-2xl font-bold text-white shadow-lg shadow-sber-green/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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