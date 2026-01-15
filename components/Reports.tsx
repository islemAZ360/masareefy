import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, CartesianGrid } from 'recharts';
import { Transaction, Language } from '../types';
import { CATEGORIES, TRANSLATIONS } from '../constants';
import { FileWarning, PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  language: Language;
}

export const Reports: React.FC<Props> = ({ transactions, language }) => {
  const t = TRANSLATIONS[language];

  // Group by category (Expenses Only)
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  const dataMap = expenses.reduce((acc, curr) => {
    const amount = Number(curr.amount);
    const catKey = (curr.category || 'unknown').toLowerCase();
    acc[catKey] = (acc[catKey] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(dataMap).map(catId => {
    const category = CATEGORIES.find(c => c.id.toLowerCase() === catId.toLowerCase());
    const displayName = category 
      ? (language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en) 
      : catId.charAt(0).toUpperCase() + catId.slice(1);

    return {
      name: displayName,
      value: dataMap[catId],
      color: category ? category.color : '#6b7280'
    };
  }).sort((a, b) => b.value - a.value);

  // Last 7 days data for Bar Chart
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

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      <div className="px-2">
        <h2 className="text-3xl font-bold text-white mb-1">{t.reports}</h2>
        <p className="text-gray-400 text-sm">{language === 'ar' ? 'نظرة عامة على إنفاقك' : 'Overview of your spending'}</p>
      </div>
      
      {/* Pie Chart Card */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] shadow-xl border border-white/5 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-sber-green" />
                {t.expense} / {t.category}
             </h3>
             <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">Last 30 Days</span>
        </div>

        {hasData ? (
            <>
                <div className="h-[300px] w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={pieData}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={6}
                        >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => value.toLocaleString()}
                        />
                    </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Centered Total */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total</span>
                        <span className="text-3xl font-bold text-white tracking-tighter">
                            {totalExpenses.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                    {pieData.slice(0, 6).map((entry, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: entry.color, color: entry.color }} />
                                <span className="text-xs text-gray-300 font-medium truncate max-w-[80px]">{entry.name}</span>
                            </div>
                            <span className="text-xs font-bold text-white">{((entry.value / totalExpenses) * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </>
        ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-500 gap-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <FileWarning className="w-8 h-8 text-zinc-600" />
                </div>
                <p>No expense data found.</p>
            </div>
        )}
      </div>

      {/* Bar Chart Card */}
      <div className="bg-[#1C1C1E] p-6 rounded-[2rem] shadow-xl border border-white/5">
         <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sber-green" />
                Weekly Trend
            </h3>
         </div>
         
         {hasData ? (
             <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#21A038" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#21A038" stopOpacity={0.4}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#333" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#52525b" 
                        tick={{fill: '#71717a', fontSize: 10, fontWeight: 500}} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                    />
                    <YAxis 
                        stroke="#52525b" 
                        tick={{fill: '#71717a', fontSize: 10}} 
                        tickLine={false} 
                        axisLine={false}
                        tickCount={5}
                    />
                    <Tooltip 
                        cursor={{fill: '#ffffff', opacity: 0.05, radius: 8}}
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                        formatter={(value: number) => [value.toLocaleString(), 'Spent']}
                        itemStyle={{ color: '#21A038' }}
                    />
                    <Bar 
                        dataKey="amount" 
                        fill="url(#barGradient)" 
                        radius={[6, 6, 6, 6]} 
                        barSize={24}
                        minPointSize={2}
                    />
                    </BarChart>
                </ResponsiveContainer>
             </div>
         ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
                <p>No activity this week.</p>
            </div>
         )}
      </div>
    </div>
  );
};