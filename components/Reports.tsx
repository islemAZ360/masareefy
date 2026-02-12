import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction, Language, TransactionType } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { TrendingUp, DollarSign, PieChart as PieIcon, TrendingDown, Calculator, Activity, Calendar, ArrowUpRight, ArrowDownLeft, Flame, ChevronRight } from 'lucide-react';

interface Props {
    transactions: Transaction[];
    language: Language;
}

export const Reports: React.FC<Props> = ({ transactions, language }) => {
    const t = TRANSLATIONS[language];
    const isAr = language === 'ar';
    const isRu = language === 'ru';
    const [period, setPeriod] = useState<7 | 14 | 30>(7);

    // Logic: Filter by period
    const now = new Date();
    const periodStart = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
    const filteredTx = transactions.filter(t => new Date(t.date) >= periodStart);

    const expenses = filteredTx.filter(t => t.type === TransactionType.EXPENSE);
    const incomes = filteredTx.filter(t => t.type === TransactionType.INCOME);
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
    const netFlow = totalIncome - totalExpenses;

    // Group by Category
    const dataMap = expenses.reduce((acc, curr) => {
        const amount = Number(curr.amount);
        const catKey = curr.category || 'general';
        acc[catKey] = (acc[catKey] || 0) + amount;
        return acc;
    }, {} as Record<string, number>);

    const pieData = Object.keys(dataMap).map(catId => {
        const category = CATEGORIES.find(c => c.id === catId) || CATEGORIES.find(c => c.id === 'general') || CATEGORIES[0];
        const name = isAr ? category.name_ar : isRu ? category.name_ru : category.name_en;
        return {
            name,
            value: dataMap[catId],
            color: category.color,
            icon: category.icon
        };
    }).sort((a, b) => b.value - a.value);

    // Daily Trend Data
    const dailyData = Array.from({ length: period }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const barData = dailyData.map(dateStr => {
        const dayExpenses = expenses
            .filter(t => t.date.startsWith(dateStr))
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const dayIncome = incomes
            .filter(t => t.date.startsWith(dateStr))
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const dateObj = new Date(dateStr);
        return {
            name: period <= 7
                ? new Intl.DateTimeFormat(language, { weekday: 'short' }).format(dateObj)
                : `${dateObj.getDate()}`,
            amount: dayExpenses,
            income: dayIncome,
            fullDate: dateStr
        };
    });

    const maxAmount = Math.max(...barData.map(d => d.amount));
    const minAmount = Math.min(...barData.filter(d => d.amount > 0).map(d => d.amount)) || 0;
    const averageDaily = expenses.length > 0
        ? totalExpenses / (barData.filter(d => d.amount > 0).length || 1)
        : 0;
    const hasData = expenses.length > 0;

    // Top category emoji
    const topCatEmoji = pieData.length > 0 ? '🔥' : '';

    // Custom Tooltip for Charts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card p-4 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                    <p className="text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">{label}</p>
                    <p className="text-white font-display font-bold text-xl">
                        {Number(payload[0].value).toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 pb-32 pt-2">

            {/* Header */}
            <div className="flex items-center justify-between px-2 mb-2 pt-4 animate-slide-up-fade">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                        <PieIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-display font-bold text-white leading-none tracking-wide text-glow">{t.reports}</h2>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-wider">
                            {filteredTx.length} {isAr ? 'عملية' : isRu ? 'операций' : 'transactions'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2 px-2 animate-slide-up-fade" style={{ animationDelay: '50ms' }}>
                {([7, 14, 30] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border ${period === p
                            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'glass-card text-zinc-500 border-transparent hover:text-white'
                            }`}
                    >
                        {p}{isAr ? ' يوم' : isRu ? ' дн' : 'd'}
                    </button>
                ))}
            </div>

            {hasData ? (
                <>
                    {/* 1. Hero Stats – 3 Columns */}
                    <div className="grid grid-cols-3 gap-3 px-1 animate-scale-in" style={{ animationDelay: '100ms' }}>
                        {/* Total Spent */}
                        <div className="glass-panel p-4 rounded-[2rem] relative overflow-hidden group">
                            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-red-500/15 blur-[40px] rounded-full"></div>
                            <div className="relative z-10">
                                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <ArrowUpRight size={8} />{isAr ? 'المصروف' : isRu ? 'Расход' : 'Spent'}
                                </p>
                                <p className="text-lg font-display font-bold text-white tabular-nums tracking-tight">
                                    {totalExpenses.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Total Income */}
                        <div className="glass-panel p-4 rounded-[2rem] relative overflow-hidden group">
                            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-secondary/15 blur-[40px] rounded-full"></div>
                            <div className="relative z-10">
                                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <ArrowDownLeft size={8} />{isAr ? 'الدخل' : isRu ? 'Доход' : 'Income'}
                                </p>
                                <p className="text-lg font-display font-bold text-secondary tabular-nums tracking-tight">
                                    {totalIncome.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Net Flow */}
                        <div className="glass-panel p-4 rounded-[2rem] relative overflow-hidden group">
                            <div className={`absolute -bottom-6 -left-6 w-20 h-20 blur-[40px] rounded-full ${netFlow >= 0 ? 'bg-secondary/15' : 'bg-red-500/15'}`}></div>
                            <div className="relative z-10">
                                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <Activity size={8} />{isAr ? 'الصافي' : isRu ? 'Нетто' : 'Net'}
                                </p>
                                <p className={`text-lg font-display font-bold tabular-nums tracking-tight ${netFlow >= 0 ? 'text-secondary' : 'text-red-400'}`}>
                                    {netFlow >= 0 ? '+' : ''}{netFlow.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Daily Average + Burn */}
                    <div className="grid grid-cols-2 gap-3 px-1 animate-scale-in" style={{ animationDelay: '150ms' }}>
                        <div className="glass-panel p-5 rounded-[2rem] relative overflow-hidden group">
                            <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-blue-500/10 blur-[50px] rounded-full"></div>
                            <div className="relative z-10">
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Calculator size={10} />{isAr ? 'المتوسط اليومي' : isRu ? 'Средний / день' : 'Daily Avg'}
                                </p>
                                <p className="text-2xl font-display font-bold text-white tabular-nums tracking-tight">
                                    {averageDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                        </div>
                        <div className="glass-panel p-5 rounded-[2rem] relative overflow-hidden group">
                            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-orange-500/10 blur-[50px] rounded-full"></div>
                            <div className="relative z-10">
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Flame size={10} />{isAr ? 'أعلى فئة' : isRu ? 'Топ категория' : 'Top Category'}
                                </p>
                                <p className="text-lg font-display font-bold text-white tracking-tight truncate">
                                    {pieData[0]?.name || '—'}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                    {pieData[0] ? `${((pieData[0].value / totalExpenses) * 100).toFixed(0)}%` : ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Weekly Activity (Neon Bar Chart) */}
                    <div className="glass-panel p-6 rounded-[2.5rem] animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-display font-bold text-white flex items-center gap-2 text-base tracking-wide">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                                {isAr ? 'النشاط اليومي' : isRu ? 'Ежедневная активность' : 'Daily Activity'}
                            </h3>
                            <div className="flex gap-3">
                                <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_red]"></div>{isAr ? 'أعلى' : 'Max'}</span>
                                <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_#10B981]"></div>{isAr ? 'أدنى' : 'Min'}</span>
                            </div>
                        </div>

                        <div className="h-[200px] w-full -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} barSize={period <= 7 ? 16 : period <= 14 ? 10 : 7}>
                                    <CartesianGrid vertical={false} stroke="#333" strokeOpacity={0.3} strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#52525b"
                                        tick={{ fill: '#a1a1aa', fontSize: period <= 14 ? 10 : 8, fontWeight: 700, fontFamily: 'Inter' }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff', opacity: 0.05, radius: 10 }} />
                                    <Bar dataKey="amount" radius={[6, 6, 6, 6]}>
                                        {barData.map((entry, index) => {
                                            let color = '#3b82f6';
                                            let opacity = 0.7;

                                            if (entry.amount === maxAmount && maxAmount > 0) { color = '#ef4444'; opacity = 1; }
                                            else if (entry.amount === minAmount && entry.amount > 0) { color = '#10B981'; opacity = 1; }

                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={color}
                                                    fillOpacity={opacity}
                                                    style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Spending Breakdown (Donut & List) */}
                    <div className="glass-panel p-6 rounded-[2.5rem] animate-slide-up-fade" style={{ animationDelay: '300ms' }}>
                        <h3 className="font-display font-bold text-white mb-6 flex items-center gap-2 text-base tracking-wide">
                            <DollarSign className="w-5 h-5 text-secondary" />
                            {isAr ? 'تفصيل المصروفات' : isRu ? 'Распределение расходов' : 'Breakdown'}
                        </h3>

                        <div className="flex flex-col items-center gap-8">
                            {/* Donut Chart */}
                            <div className="h-[220px] w-[220px] relative">
                                <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl scale-75 animate-pulse-slow"></div>

                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={70}
                                            outerRadius={95}
                                            paddingAngle={5}
                                            dataKey="value"
                                            cornerRadius={8}
                                            stroke="none"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                    style={{ filter: `drop-shadow(0 0 8px ${entry.color}40)` }}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Center Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">
                                        {isAr ? 'المجموع' : isRu ? 'Итого' : 'Total'}
                                    </span>
                                    <span className="text-2xl font-display font-bold text-white tabular-nums drop-shadow-md">{totalExpenses.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Categories List */}
                            <div className="w-full space-y-5">
                                {pieData.slice(0, 6).map((cat, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border border-white/5 transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: `${cat.color}15` }}
                                                >
                                                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: cat.color }}></div>
                                                </div>
                                                <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{cat.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-display font-bold text-white block tabular-nums tracking-wide">{cat.value.toLocaleString()}</span>
                                                <span className="text-[10px] text-zinc-500 font-mono">{((cat.value / totalExpenses) * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        {/* Animated Progress Bar */}
                                        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out relative group-hover:brightness-125"
                                                style={{ width: `${(cat.value / totalExpenses) * 100}%`, backgroundColor: cat.color, boxShadow: `0 0 12px ${cat.color}` }}
                                            >
                                                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/40 blur-[4px]"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center opacity-50 animate-scale-in">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 border-dashed">
                        <PieIcon size={40} strokeWidth={1} className="text-zinc-600" />
                    </div>
                    <p className="text-lg font-display font-bold text-white">
                        {isAr ? 'لا توجد بيانات بعد' : isRu ? 'Нет данных' : 'No data yet'}
                    </p>
                    <p className="text-sm text-zinc-500 mt-2">
                        {isAr ? 'ابدأ بإضافة معاملات' : isRu ? 'Начните добавлять транзакции' : 'Start adding transactions'}
                    </p>
                </div>
            )}
        </div>
    );
};