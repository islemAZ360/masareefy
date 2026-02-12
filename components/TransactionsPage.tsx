import React, { useState } from 'react';
import { List, Search, X, Filter, ArrowDownLeft, ArrowUpRight, Calendar, Sparkles } from 'lucide-react';
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
            const matchesSearch = !searchTerm || (
                (t.vendor && t.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()))
            );
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
            className={`
            relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 active:scale-95 border
            ${filterType === type
                    ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105'
                    : 'glass-card text-zinc-400 border-transparent hover:border-white/10 hover:text-white'
                }
        `}
        >
            {Icon && <Icon size={14} />}
            {label}
            {filterType === type && <div className="absolute inset-0 bg-white blur-md opacity-20 rounded-full animate-pulse"></div>}
        </button>
    );

    return (
        <div className="pb-32 min-h-[80vh] pt-2">

            {/* Sticky Header Area */}
            <div className="sticky top-0 z-30 glass-panel border-b border-white/5 pb-5 pt-4 -mx-4 px-6 mb-6 rounded-b-[2rem] shadow-2xl backdrop-blur-xl transition-all">
                <div className="flex flex-col gap-5 animate-slide-up-fade">
                    {/* Title Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full animate-pulse-glow"></div>
                                <List className="w-6 h-6 text-primary relative z-10" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-display font-bold text-white leading-none tracking-wide text-glow">
                                    {t?.transactions || (user.language === 'ar' ? 'المعاملات' : user.language === 'ru' ? 'Транзакции' : 'Transactions')}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_5px_#10B981]"></span>
                                    <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">{filteredData.length} {user.language === 'ar' ? 'سجل' : user.language === 'ru' ? 'записей' : 'RECORDS'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Neon Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative bg-[#0F0E17] border border-white/10 rounded-2xl flex items-center shadow-inner group-focus-within:border-primary/50 transition-colors">
                            <div className="pl-4 pr-3 text-zinc-500 group-focus-within:text-primary transition-colors">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder={user.language === 'ar' ? "بحث..." : user.language === 'ru' ? 'Поиск...' : "Search history..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-transparent py-4 text-white text-sm placeholder-zinc-600 focus:outline-none font-medium"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="p-3 text-zinc-500 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        <FilterChip type="all" label={user.language === 'ar' ? 'الكل' : user.language === 'ru' ? 'Все' : 'All'} icon={Filter} />
                        <FilterChip type="expense" label={t.expense} icon={ArrowUpRight} />
                        <FilterChip type="income" label={t.income} icon={ArrowDownLeft} />
                    </div>
                </div>
            </div>

            {/* Stats Summary (Conditional) */}
            {(searchTerm || filterType !== 'all') && (
                <div className="grid grid-cols-2 gap-3 mb-8 animate-scale-in px-2">
                    <div className="glass-panel p-5 rounded-[2rem] relative overflow-hidden group hover:border-secondary/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ArrowDownLeft size={48} className="text-secondary" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{user.language === 'ar' ? 'الدخل' : user.language === 'ru' ? 'Доход' : 'Income'}</p>
                            <p className="text-secondary font-display font-bold text-xl tabular-nums drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                +{filteredData.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="glass-panel p-5 rounded-[2rem] relative overflow-hidden group hover:border-red-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ArrowUpRight size={48} className="text-red-500" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{user.language === 'ar' ? 'المصروف' : user.language === 'ru' ? 'Расход' : 'Expense'}</p>
                            <p className="text-white font-display font-bold text-xl tabular-nums">
                                -{filteredData.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline List */}
            <div className="space-y-8 relative">
                {/* Timeline Vertical Line */}
                <div className="absolute left-[27px] top-4 bottom-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent"></div>

                {getGroupedTransactions().map((group, groupIdx) => {
                    const date = new Date(group.date);
                    return (
                        <div key={group.date} className="animate-slide-up-fade" style={{ animationDelay: `${groupIdx * 100}ms` }}>

                            {/* Date Header */}
                            <div className="flex items-center gap-4 mb-4 pl-2 sticky top-48 z-10">
                                <div className="w-12 h-12 rounded-2xl glass-card flex flex-col items-center justify-center text-white shadow-lg border border-white/10 relative z-20 backdrop-blur-md">
                                    <span className="text-lg font-display font-bold leading-none">{date.getDate()}</span>
                                    <span className="text-[8px] font-bold text-zinc-500 uppercase">{date.toLocaleDateString(user.language, { weekday: 'short' })}</span>
                                </div>
                                <div className="glass-card px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                                    <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
                                        {date.toLocaleDateString(user.language, { month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-3 pl-8 pr-1">
                                {group.items.map((tx, itemIdx) => (
                                    <div key={tx.id} className="animate-slide-up-fade" style={{ animationDelay: `${(groupIdx * 100) + (itemIdx * 50)}ms` }}>
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
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 glass-card border-dashed border-zinc-700">
                        <Sparkles size={32} className="text-zinc-600 animate-pulse" />
                    </div>
                    <p className="text-sm font-display font-bold text-zinc-500 tracking-wide">{user.language === 'ar' ? 'لا توجد معاملات' : user.language === 'ru' ? 'Транзакций не найдено' : 'No transactions found'}</p>
                </div>
            )}
        </div>
    );
};