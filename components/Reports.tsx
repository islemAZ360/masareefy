import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { Transaction, Language } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { AlertTriangle, TrendingUp, DollarSign, PieChart as PieIcon, ArrowRight } from 'lucide-react';

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
    const catKey = curr.category || 'utilities';
    acc[catKey] = (acc[catKey] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(dataMap).map(catId => {
    const category = CATEGORIES.find(c => c.id === catId) || CATEGORIES[4];
    const name = language === 'ar' ? category.name_ar : category.name_en;
    return {
      name,
      value: dataMap[catId],
      color: category.color,
      icon: category.icon
    };
  }).sort((a, b) => b.value - a.value);

  // Weekly Trend Data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const barData = last7Days.map(dateStr => {
    const dayTotal = expenses
      .filter(t => t.date.startsWith(dateStr))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const dateObj = new Date(dateStr);
    return {
      name: new Intl.DateTimeFormat(language, { weekday: 'short' }).format(dateObj),
      amount: dayTotal
    };
  });

  const hasData = expenses.length > 0;
  const topCategory = pieData.length > 0 ? pieData[0] : null;

  return (
    <div className="space-y-6 pb-24">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-2 mb-2">
         <div className="bg-sber-green/10 p-3 rounded-2xl border border-sber-green/20">
             <PieIcon className="w-6 h-6 text-sber-green" />
         </div>
         <h2 className="text-2xl font-bold text-white leading-none">{t.reports}</h2>
      </div>

      {/* 1. Smart Insight Card (The "Headline") */}
      {hasData && topCategory && (
        <div className="bg-gradient-to-br from-[#1C1C1E] to-black p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-red-400">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Top Spending</span>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="text-3xl font-bold text-white mb-1">{topCategory.name}</h3>
                        <p className="text-sm text-gray-400">
                            {((topCategory.value / totalExpenses) * 100).toFixed(0)}% of your expenses
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-mono font-bold text-white">{topCategory.value.toLocaleString()}</p>
                    </div>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full mt-4 overflow-hidden">
                    <div 
                        className="h-full bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                        style={{ width: `${(topCategory.value / totalExpenses) * 100}%` }}
                    />
                </div>
            </div>
        </div>
      )}

      {/* 2. Donut Chart Section */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] border border-white/5">
        <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-sber-green" /> Spending Distribution
        </h3>
        
        {hasData ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Chart */}
                <div className="h-[220px] w-[220px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                cornerRadius={8}
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#000', borderRadius: '12px', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: number) => value.toLocaleString()}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-gray-500 font-bold uppercase">Total</span>
                        <span className="text-xl font-bold text-white tabular-nums">{totalExpenses.toLocaleString()}</span>
                    </div>
                </div>

                {/* Categories List */}
                <div className="flex-1 w-full space-y-4">
                    {pieData.slice(0, 4).map((cat, idx) => (
                        <div key={idx} className="group">
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                    <span className="text-sm font-medium text-gray-200">{cat.name}</span>
                                </div>
                                <span className="text-sm font-bold text-white">{cat.value.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(cat.value / totalExpenses) * 100}%`, backgroundColor: cat.color }}
                                />
                            </div>
                        </div>
                    ))}
                    {pieData.length > 4 && (
                        <button className="w-full text-xs text-gray-500 py-2 hover:text-white transition-colors flex items-center justify-center gap-1">
                            View All Categories <ArrowRight size={12} />
                        </button>
                    )}
                </div>
            </div>
        ) : (
            <div className="py-10 text-center text-gray-500">No data to display.</div>
        )}
      </div>

      {/* 3. Weekly Trend (Bar Chart) */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] border border-white/5">
         <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" /> Weekly Activity
         </h3>
         
         <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={12}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#333" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#52525b" 
                        tick={{fill: '#71717a', fontSize: 10}} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                    />
                    <Tooltip 
                        cursor={{fill: '#ffffff', opacity: 0.05, radius: 4}}
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                    />
                    <Bar 
                        dataKey="amount" 
                        fill="url(#barGradient)" 
                        radius={[10, 10, 10, 10]} 
                    />
                </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

    </div>
  );
};