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
  // Find category or default
  const category = CATEGORIES.find(c => c.id === transaction.category) || CATEGORIES.find(c => c.id === 'general') || CATEGORIES[0];
  
  // Resolve Icon dynamically
  const IconComponent = (Icons as any)[category.icon] || Icons.HelpCircle;

  const isExpense = transaction.type === 'expense';
  const categoryName = language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en;
  
  return (
    <div className="group relative bg-[#121214] hover:bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-[1.5rem] p-4 flex items-center justify-between transition-all duration-300 active:scale-95 shadow-sm">
      
      {/* Left Side: Icon & Info */}
      <div className="flex items-center gap-4">
        {/* Glowing Icon Container */}
        <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-110 duration-300"
            style={{ 
                backgroundColor: `${category.color}15`, // 15 = hex opacity
                boxShadow: `0 0 15px -5px ${category.color}40` // Glow effect
            }}
        >
            <IconComponent size={20} style={{ color: category.color }} strokeWidth={2.5} />
            
            {/* Inner light reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        {/* Text Details */}
        <div className="flex flex-col">
            <h3 className="font-bold text-white text-base leading-tight mb-1">
              {transaction.vendor || categoryName}
            </h3>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
                    {categoryName}
                </span>
                {transaction.note && (
                    <span className="text-[10px] text-zinc-600 truncate max-w-[100px] border-l border-white/10 pl-2">
                        {transaction.note}
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Right Side: Amount */}
      <div className="text-right">
        <div className={`font-bold text-lg tabular-nums tracking-tight ${isExpense ? 'text-white' : 'text-emerald-400'}`}>
            {isExpense ? '-' : '+'}{transaction.amount.toLocaleString()} 
        </div>
        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest opacity-60">
            {currency}
        </div>
      </div>
    </div>
  );
};