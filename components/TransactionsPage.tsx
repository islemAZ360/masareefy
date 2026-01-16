import React, { useState } from 'react';
import { List, Search, X, Filter, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Transaction, UserSettings, TransactionType } from '../types';
import { TRANSLATIONS } from '../constants';
import { TransactionItem } from './TransactionItem';

interface Props {
  user: UserSettings;
  transactions: Transaction[];
}

type FilterType = 'all' | 'income' | 'expense';

export const TransactionsPage: React.FC<Props> = ({ user, transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const t = TRANSLATIONS[user.language];

  // Smart Filtering Logic
  const getFilteredTransactions = () => {
      return transactions.filter(t => {
        // 1. Text Search
        const matchesSearch = !searchTerm || (
            (t.vendor && t.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        // 2. Type Filter
        const matchesType = filterType === 'all' || t.type === filterType;

        return matchesSearch && matchesType;
      });
  };

  const filteredData = getFilteredTransactions();

  // Grouping
  const getGroupedTransactions = () => {
    const sorted = [...filteredData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: Record<string, Transaction[]> = {};
    sorted.forEach(tx => {
      const dateKey = tx.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    return Object.keys(groups).map(date => ({ date, items: groups[date] }));
  };

  const FilterChip = ({ type, label, icon: Icon }: { type: FilterType, label: string, icon?: any }) => (
      <button
        onClick={() => setFilterType(type)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 border ${
            filterType === type 
            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
            : 'bg-zinc-900/50 text-gray-400 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800'
        }`}
      >
        {Icon && <Icon size={14} />}
        {label}
      </button>
  );

  return (
    <div className="pb-24 min-h-[80vh]">
      
      {/* Sticky Header Area */}
      <div className="sticky top-0 z-30 bg-[#050505]/95 backdrop-blur-xl pb-4 pt-2 -mx-6 px-6 border-b border-white/5 transition-all">
          <div className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20">
                        <List className="w-6 h-6 text-sber-green" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white leading-none">{t.transactions}</h2>
                        <p className="text-xs text-gray-400 mt-1">{filteredData.length} records</p>
                    </div>
                 </div>
              </div>

              {/* Search Bar */}
              <div className="relative group">
                 <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-500 group-focus-within:text-sber-green transition-colors" />
                 </div>
                 <input 
                    type="text" 
                    placeholder={user.language === 'ar' ? "ابحث عن متجر، ملاحظة..." : "Search merchant, notes..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-sber-green/50 transition-all placeholder-zinc-600 shadow-sm"
                 />
                 {searchTerm && (
                     <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white">
                         <X className="w-4 h-4" />
                     </button>
                 )}
              </div>

              {/* Filter Chips Row */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                 <FilterChip type="all" label={user.language === 'ar' ? 'الكل' : 'All'} icon={Filter} />
                 <FilterChip type="expense" label={t.expense} icon={ArrowUpRight} />
                 <FilterChip type="income" label={t.income} icon={ArrowDownLeft} />
              </div>
          </div>
      </div>

      {/* Stats Summary (Conditional) */}
      {(searchTerm || filterType !== 'all') && (
        <div className="grid grid-cols-2 gap-3 mt-4 mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><ArrowDownLeft size={40} /></div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Income</p>
                <p className="text-sber-green font-bold text-lg tabular-nums">
                    +{filteredData.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0).toLocaleString()}
                </p>
            </div>
            <div className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><ArrowUpRight size={40} /></div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Expense</p>
                <p className="text-white font-bold text-lg tabular-nums">
                    -{filteredData.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0).toLocaleString()}
                </p>
            </div>
        </div>
      )}
      
      {/* Transactions List */}
      <div className="mt-4">
        {getGroupedTransactions().map((group, idx) => {
            const date = new Date(group.date);
            return (
            <div key={group.date} className="mb-6 animate-in slide-in-from-bottom-5 fade-in" style={{animationDelay: `${idx * 50}ms`}}>
                <div className="flex items-center gap-3 mb-3 pl-1">
                    <span className="text-xl font-bold text-white tracking-tighter tabular-nums bg-white/10 w-10 h-10 flex items-center justify-center rounded-xl border border-white/5">
                        {date.getDate()}
                    </span>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                            {date.toLocaleDateString(user.language, { month: 'long' })}
                        </span>
                        <span className="text-[10px] text-gray-600 font-bold uppercase">
                            {date.toLocaleDateString(user.language, { weekday: 'long' })}
                        </span>
                    </div>
                </div>
                <div className="space-y-3">
                {group.items.map(tx => (
                    <TransactionItem key={tx.id} transaction={tx} currency={user.currency} language={user.language} />
                ))}
                </div>
            </div>
            );
        })}
      </div>
      
      {/* Empty State */}
      {filteredData.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 text-gray-500 opacity-50">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5 border-dashed">
                <Search size={32} strokeWidth={1.5} />
             </div>
             <p className="text-sm font-medium">No transactions found.</p>
             <p className="text-xs text-gray-600 mt-1">Try adjusting your filters.</p>
         </div>
      )}
    </div>
  );
};