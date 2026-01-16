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
  // Find category or default to 'general' to prevent misleading 'utilities' fallback
  const category = CATEGORIES.find(c => c.id === transaction.category) || CATEGORIES.find(c => c.id === 'general') || CATEGORIES[0];
  
  // Resolve Icon dynamically safely
  const IconComponent = (Icons as any)[category.icon] || Icons.HelpCircle;

  const isExpense = transaction.type === 'expense';
  
  return (
    <div className="group relative overflow-hidden bg-[#1C1C1E] hover:bg-[#2C2C2E] rounded-2xl p-4 transition-all duration-300 border border-white/5 hover:border-white/10 active:scale-[0.98]">
      {/* Decorative Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          {/* Icon Box with Dynamic Color Glow */}
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-300"
            style={{ 
                background: `linear-gradient(135deg, ${category.color}20, ${category.color}05)`,
                border: `1px solid ${category.color}30`,
                boxShadow: `0 4px 12px ${category.color}15`
            }}
          >
            <IconComponent size={22} style={{ color: category.color }} strokeWidth={2.5} />
          </div>
          
          {/* Details */}
          <div className="flex flex-col">
            <h3 className="font-bold text-white text-base leading-tight">
              {transaction.vendor || (language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en)}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
                {/* Category Tag */}
                <span className="text-[10px] text-zinc-400 font-bold bg-zinc-900/80 px-2 py-0.5 rounded-md border border-white/5">
                    {language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en}
                </span>
                {/* Note truncation */}
                {transaction.note && (
                    <span className="text-xs text-zinc-600 truncate max-w-[120px]">• {transaction.note}</span>
                )}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
            <div className={`font-bold text-lg tabular-nums tracking-tight ${isExpense ? 'text-white' : 'text-sber-green'}`}>
                {isExpense ? '-' : '+'}{transaction.amount.toLocaleString()} 
                <span className="text-xs font-medium text-zinc-500 ml-0.5 align-top opacity-70">{currency}</span>
            </div>
        </div>
      </div>
    </div>
  );
};