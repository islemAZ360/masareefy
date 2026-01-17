import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction, Language } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { TrendingUp, DollarSign, PieChart as PieIcon, TrendingDown, Calculator, Activity, Calendar } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  language: Language;
}

export const Reports: React.FC<Props> = ({ transactions, language }) => {
  const t = TRANSLATIONS[language];

  // Logic: Filter Expenses
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  // Group by Category
  const dataMap = expenses.reduce((acc, curr) => {
    const amount = Number(curr.amount);
    const catKey = curr.category || 'general';
    acc[catKey] = (acc[catKey] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(dataMap).map(catId => {
    const category = CATEGORIES.find(c => c.id === catId) || CATEGORIES.find(c => c.id === 'general') || CATEGORIES[0];
    const name = language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en;
    return {
      name,
      value: dataMap[catId],
      color: category.color,
      icon: category.icon
    };
  }).sort((a, b) => b.value - a.value);

  // Weekly Trend Data & Analysis
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const barData = last7Days.map(dateStr => {
    const dayTotal = expenses
      .filter(t => t.date === dateStr) 
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const dateObj = new Date(dateStr);
    return {
      name: new Intl.DateTimeFormat(language, { weekday: 'short' }).format(dateObj),
      fullDate: dateStr,
      amount: dayTotal
    };
  });

  const maxAmount = Math.max(...barData.map(d => d.amount));
  const minAmount = Math.min(...barData.filter(d => d.amount > 0).map(d => d.amount)) || 0;
  const averageDaily = totalExpenses / (barData.filter(d => d.amount > 0).length || 1);
  const hasData = expenses.length > 0;

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="glass-strong border border-white/10 p-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                  <p className="text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">{label}</p>
                  <p className="text-white font-bold text-lg font-mono">
                      {Number(payload[0].value).toLocaleString()}
                  </p>
              </div>
          );
      }
      return null;
  };

  return (
    <div className="space-y-6 pb-32">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-2 mb-2 pt-4 animate-slide-down">
         <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20 shadow-[0_0_15px_rgba(33,160,56,0.2)]">
             <PieIcon className="w-6 h-6 text-sber-green" />
         </div>
         <h2 className="text-3xl font-bold text-white leading-none tracking-tight">{t.reports}</h2>
      </div>

      {hasData ? (
          <>
            {/* 1. Hero Stats Row */}
            <div className="grid grid-cols-2 gap-3 px-1">
                {/* Total Spent */}
                <div className="glass-panel p-5 rounded-[2rem] relative overflow-hidden group animate-scale-in" style={{ animationDelay: '0.1s' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <TrendingDown size={48} />
                    </div>
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-red-500/20 blur-2xl rounded-full"></div>
                    
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Activity size={10} /> Total Spent
                    </p>
                    <h3 className="text-2xl font-bold text-white tabular-nums tracking-tight drop-shadow-md">
                        {totalExpenses.toLocaleString()}
                    </h3>
                    <div className="mt-2 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg w-fit">
                        Expense
                    </div>
                </div>

                {/* Daily Average */}
                <div className="glass-panel p-5 rounded-[2rem] relative overflow-hidden group animate-scale-in" style={{ animationDelay: '0.2s' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Calculator size={48} />
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-blue-500/20 blur-2xl rounded-full"></div>

                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Calendar size={10} /> Daily Avg
                    </p>
                    <h3 className="text-2xl font-bold text-white tabular-nums tracking-tight drop-shadow-md">
                        {averageDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h3>
                    <div className="mt-2 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg w-fit">
                        Last 7 Days
                    </div>
                </div>
            </div>

            {/* 2. Weekly Activity (Neon Bar Chart) */}
            <div className="glass-panel p-6 rounded-[2rem] animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" /> Weekly Flow
                    </h3>
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>Max</span>
                        <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-sber-green shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>Min</span>
                    </div>
                </div>
                
                <div className="h-[220px] w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} barSize={12}>
                            <CartesianGrid vertical={false} stroke="#333" strokeOpacity={0.5} strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#52525b" 
                                tick={{fill: '#71717a', fontSize: 10, fontWeight: 700}} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff', opacity: 0.03, radius: 8}} />
                            <Bar dataKey="amount" radius={[6, 6, 6, 6]}>
                                {barData.map((entry, index) => {
                                    let color = '#3b82f6'; // Blue
                                    let opacity = 0.6;
                                    
                                    if (entry.amount === maxAmount && maxAmount > 0) { color = '#ef4444'; opacity = 1; } // Red Max
                                    else if (entry.amount === minAmount && entry.amount > 0) { color = '#22c55e'; opacity = 1; } // Green Min
                                    
                                    return (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={color} 
                                            fillOpacity={opacity}
                                            style={{ filter: `drop-shadow(0 0 8px ${color}60)` }} 
                                        />
                                    );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Spending Breakdown (Donut & List) */}
            <div className="glass-panel p-6 rounded-[2rem] animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <h3 className="font-bold text-white mb-8 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-sber-green" /> Breakdown
                </h3>
                
                <div className="flex flex-col items-center gap-8">
                    {/* Donut Chart */}
                    <div className="h-[240px] w-[240px] relative">
                        {/* Background Glow */}
                        <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl scale-75 animate-pulse-slow"></div>
                        
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={75}
                                    outerRadius={105}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={8}
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color} 
                                            style={{ filter: `drop-shadow(0 0 6px ${entry.color}40)` }} 
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total</span>
                            <span className="text-2xl font-bold text-white tabular-nums drop-shadow-md">{totalExpenses.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Categories List */}
                    <div className="w-full space-y-5">
                        {pieData.slice(0, 5).map((cat, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg border border-white/5" 
                                            style={{ backgroundColor: `${cat.color}15` }}
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: cat.color }}></div>
                                        </div>
                                        <span className="text-sm font-bold text-zinc-200">{cat.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-white block tabular-nums">{cat.value.toLocaleString()}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">{((cat.value / totalExpenses) * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                {/* Animated Progress Bar */}
                                <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out relative group-hover:brightness-125"
                                        style={{ width: `${(cat.value / totalExpenses) * 100}%`, backgroundColor: cat.color, boxShadow: `0 0 10px ${cat.color}80` }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </>
      ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50 animate-fade-in">
             <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 border-dashed">
                <PieIcon size={40} strokeWidth={1} className="text-zinc-600" />
             </div>
             <p className="text-lg font-bold text-white">No data yet</p>
             <p className="text-sm text-zinc-500">Add transactions to see reports.</p>
          </div>
      )}
    </div>
  );
};