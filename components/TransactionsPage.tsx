import React, { useState } from 'react';
import { List, Search, X, Filter, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
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
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 border ${
            filterType === type 
            ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
            : 'glass text-zinc-400 border-transparent hover:bg-white/10 hover:text-white'
        }`}
      >
        {Icon && <Icon size={14} />}
        {label}
      </button>
  );

  return (
    <div className="pb-32 min-h-[80vh]">
      
      {/* Sticky Header Area */}
      <div className="sticky top-0 z-30 glass border-b border-white/5 pb-4 pt-2 -mx-6 px-6 transition-all shadow-lg backdrop-blur-xl">
          <div className="flex flex-col gap-4 animate-slide-down">
              {/* Title */}
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20 shadow-[0_0_15px_rgba(33,160,56,0.15)]">
                        <List className="w-6 h-6 text-sber-green" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white leading-none tracking-tight">{t.transactions}</h2>
                        <p className="text-xs text-zinc-500 mt-1 font-medium">{filteredData.length} records found</p>
                    </div>
                 </div>
              </div>

              {/* Search Bar */}
              <div className="relative group">
                 <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                 </div>
                 <input 
                    type="text" 
                    placeholder={user.language === 'ar' ? "ابحث عن متجر، ملاحظة..." : "Search merchant, notes..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-3.5 pl-12 pr-10 text-white focus:outline-none focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all placeholder-zinc-700 shadow-inner"
                 />
                 {searchTerm && (
                     <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-white transition-colors">
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
        <div className="grid grid-cols-2 gap-3 mt-4 mb-6 animate-scale-in">
            <div className="glass-panel p-4 rounded-[1.5rem] relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-sber-green/20 rounded-full blur-xl group-hover:bg-sber-green/30 transition-colors"></div>
                <div className="relative z-10">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Total Income</p>
                    <p className="text-sber-green font-bold text-xl tabular-nums drop-shadow-[0_0_10px_rgba(33,160,56,0.4)]">
                        +{filteredData.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0).toLocaleString()}
                    </p>
                </div>
            </div>
            <div className="glass-panel p-4 rounded-[1.5rem] relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/20 rounded-full blur-xl group-hover:bg-red-500/30 transition-colors"></div>
                <div className="relative z-10">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Total Expense</p>
                    <p className="text-white font-bold text-xl tabular-nums">
                        -{filteredData.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
      )}
      
      {/* Transactions List */}
      <div className="mt-4 space-y-8">
        {getGroupedTransactions().map((group, groupIdx) => {
            const date = new Date(group.date);
            return (
            <div key={group.date} className="animate-slide-up" style={{ animationDelay: `${groupIdx * 0.1}s` }}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4 pl-2 sticky top-48 z-0 opacity-80">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold shadow-sm">
                        {date.getDate()}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-white font-bold uppercase tracking-widest">
                            {date.toLocaleDateString(user.language, { month: 'long' })}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
                            {date.toLocaleDateString(user.language, { weekday: 'long' })}
                        </span>
                    </div>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2"></div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                {group.items.map((tx, itemIdx) => (
                    <div key={tx.id} className="animate-slide-up" style={{ animationDelay: `${(groupIdx * 0.1) + (itemIdx * 0.05)}s` }}>
                        <TransactionItem transaction={tx} currency={user.currency} language={user.language} />
                    </div>
                ))}
                </div>
            </div>
            );
        })}
      </div>
      
      {/* Empty State */}
      {filteredData.length === 0 && (
         <div className="flex flex-col items-center justify-center py-24 text-zinc-600 animate-scale-in">
             <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-white/5 border-dashed">
                <Search size={40} strokeWidth={1.5} className="opacity-50" />
             </div>
             <p className="text-base font-bold text-zinc-500">No transactions found</p>
             <p className="text-xs text-zinc-700 mt-2">Adjust filters or add a new one.</p>
         </div>
      )}
    </div>
  );
};