import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction, Language } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { TrendingUp, DollarSign, PieChart as PieIcon, TrendingDown, Layers, Calculator } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  language: Language;
}

const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-[#121214]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 shadow-xl ${className}`}>
        {children}
    </div>
);

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
    // Ensure accurate date matching
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

  // Find Max and Min for coloring
  const maxAmount = Math.max(...barData.map(d => d.amount));
  const minAmount = Math.min(...barData.filter(d => d.amount > 0).map(d => d.amount)) || 0;
  const averageDaily = totalExpenses / (barData.filter(d => d.amount > 0).length || 1);

  const hasData = expenses.length > 0;
  const topCategory = pieData.length > 0 ? pieData[0] : null;

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="bg-black/90 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                  <p className="text-xs text-zinc-400 font-bold mb-1">{label}</p>
                  <p className="text-white font-bold text-sm">
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
      <div className="flex items-center gap-3 px-2 mb-2 pt-4">
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
                <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <TrendingDown size={48} />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Spent</p>
                    <h3 className="text-2xl font-bold text-white tabular-nums tracking-tight">
                        {totalExpenses.toLocaleString()}
                    </h3>
                    <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Expense
                    </div>
                </GlassCard>

                {/* Daily Average */}
                <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Calculator size={48} />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Daily Avg</p>
                    <h3 className="text-2xl font-bold text-white tabular-nums tracking-tight">
                        {averageDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h3>
                    <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Last 7 Days
                    </div>
                </GlassCard>
            </div>

            {/* 2. Weekly Activity (Smart Bar Chart) */}
            <GlassCard>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" /> Weekly Flow
                    </h3>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-[9px] text-zinc-500"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>Max</span>
                        <span className="flex items-center gap-1 text-[9px] text-zinc-500"><div className="w-1.5 h-1.5 rounded-full bg-sber-green"></div>Min</span>
                    </div>
                </div>
                
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} barSize={16}>
                            <CartesianGrid vertical={false} stroke="#ffffff" strokeOpacity={0.05} strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#52525b" 
                                tick={{fill: '#71717a', fontSize: 10, fontWeight: 600}} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff', opacity: 0.05, radius: 8}} />
                            <Bar dataKey="amount" radius={[8, 8, 8, 8]}>
                                {barData.map((entry, index) => {
                                    let color = '#3b82f6'; // Default Blue
                                    if (entry.amount === maxAmount && maxAmount > 0) color = '#ef4444'; // Red for Max
                                    else if (entry.amount === minAmount && entry.amount > 0) color = '#22c55e'; // Green for Min
                                    
                                    return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            {/* 3. Spending Breakdown (Donut & List) */}
            <GlassCard>
                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-sber-green" /> Breakdown
                </h3>
                
                <div className="flex flex-col items-center gap-8">
                    {/* Donut Chart */}
                    <div className="h-[220px] w-[220px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                    cornerRadius={6}
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 5px ${entry.color}40)` }} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total</span>
                            <span className="text-xl font-bold text-white tabular-nums">{totalExpenses.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Categories List */}
                    <div className="w-full space-y-4">
                        {pieData.slice(0, 5).map((cat, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg" 
                                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor]"></div>
                                        </div>
                                        <span className="text-sm font-bold text-gray-200">{cat.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-white block">{cat.value.toLocaleString()}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">{((cat.value / totalExpenses) * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                        style={{ width: `${(cat.value / totalExpenses) * 100}%`, backgroundColor: cat.color }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[1px]"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>
          </>
      ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
             <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 border-dashed">
                <PieIcon size={40} strokeWidth={1} />
             </div>
             <p className="text-lg font-bold text-white">No data yet</p>
             <p className="text-sm text-zinc-500">Add transactions to see reports.</p>
          </div>
      )}
    </div>
  );
};