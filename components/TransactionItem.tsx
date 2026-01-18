import React from 'react';
import { Transaction, Currency } from '../types';
import { CATEGORIES } from '../constants';
import * as Icons from 'lucide-react';

interface Props {
  transaction: Transaction;
  currency: Currency;
  language: 'en' | 'ar' | 'ru';
}

export const TransactionItem: React.FC<Props> = ({ transaction, currency, language }) => {
  const category = CATEGORIES.find(c => c.id === transaction.category) || CATEGORIES.find(c => c.id === 'general') || CATEGORIES[0];
  const IconComponent = (Icons as any)[category.icon] || Icons.HelpCircle;
  const isExpense = transaction.type === 'expense';
  const categoryName = language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en;
  
  return (
    <div className="group relative glass-card p-4 rounded-[1.8rem] flex items-center justify-between transition-all duration-500 hover:bg-white/5 hover:border-white/15 overflow-hidden active:scale-[0.98]">
      
      {/* Cinematic Shimmer Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none skew-x-12"></div>

      {/* Left Side: Icon & Info */}
      <div className="flex items-center gap-4 relative z-10">
        
        {/* Neon Glow Icon Container */}
        <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center relative transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 border border-white/5"
            style={{ 
                backgroundColor: `${category.color}10`, // 10% opacity
                boxShadow: `0 0 30px -5px ${category.color}25` // Colored Glow
            }}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md" style={{ backgroundColor: category.color }}></div>
            <IconComponent size={22} style={{ color: category.color }} strokeWidth={2.5} className="relative z-10 drop-shadow-md group-hover:text-white transition-colors" />
        </div>
        
        {/* Text Details */}
        <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-white text-base leading-none tracking-wide group-hover:text-primary transition-colors">
              {transaction.vendor || categoryName}
            </h3>
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-zinc-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 backdrop-blur-sm uppercase tracking-wider">
                    {categoryName}
                </span>
                {transaction.note && (
                    <span className="text-[10px] text-zinc-500 truncate max-w-[100px] sm:max-w-[150px] font-medium">
                        • {transaction.note}
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Right Side: Amount */}
      <div className="text-right relative z-10">
        <div className={`font-display font-bold text-lg tabular-nums tracking-tight drop-shadow-lg ${isExpense ? 'text-white' : 'text-secondary'}`}>
            {isExpense ? '-' : '+'}{transaction.amount.toLocaleString()} 
        </div>
        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest font-mono">
            {currency}
        </div>
      </div>
    </div>
  );
};