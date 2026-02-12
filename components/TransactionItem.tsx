import React from 'react';
import { Transaction, Currency, TransactionType } from '../types';
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
  const isExpense = transaction.type === TransactionType.EXPENSE;
  const categoryName = language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en;

  // Format relative time
  const getRelativeTime = () => {
    const now = new Date();
    const txDate = new Date(transaction.date);
    const diffMs = now.getTime() - txDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return language === 'ar' ? 'الآن' : language === 'ru' ? 'Только что' : 'Just now';
    if (diffHours < 24) return language === 'ar' ? `منذ ${diffHours} ساعة` : language === 'ru' ? `${diffHours} ч назад` : `${diffHours}h ago`;
    if (diffDays === 1) return language === 'ar' ? 'أمس' : language === 'ru' ? 'Вчера' : 'Yesterday';
    if (diffDays < 7) return language === 'ar' ? `منذ ${diffDays} أيام` : language === 'ru' ? `${diffDays} дн назад` : `${diffDays}d ago`;
    return txDate.toLocaleDateString(language, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="group relative glass-card p-4 rounded-[1.8rem] flex items-center justify-between transition-all duration-500 hover:bg-white/5 hover:border-white/15 overflow-hidden active:scale-[0.98] ripple-effect">

      {/* Cinematic Shimmer Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none skew-x-12"></div>

      {/* Left Side: Icon & Info */}
      <div className="flex items-center gap-4 relative z-10 flex-1 min-w-0">

        {/* Neon Glow Icon Container */}
        <div
          className="w-13 h-13 min-w-[3.25rem] rounded-2xl flex items-center justify-center relative transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 border border-white/5"
          style={{
            backgroundColor: `${category.color}10`,
            boxShadow: `0 0 30px -5px ${category.color}25`
          }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md rounded-2xl" style={{ backgroundColor: category.color }}></div>
          <IconComponent size={20} style={{ color: category.color }} strokeWidth={2.5} className="relative z-10 drop-shadow-md group-hover:text-white transition-colors" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="font-bold text-white text-sm leading-none tracking-wide group-hover:text-primary transition-colors truncate">
            {transaction.vendor || categoryName}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 backdrop-blur-sm uppercase tracking-wider shrink-0">
              {categoryName}
            </span>
            <span className="text-[9px] text-zinc-600 font-mono shrink-0">
              {getRelativeTime()}
            </span>
            {transaction.note && (
              <span className="text-[10px] text-zinc-500 truncate max-w-[80px] font-medium">
                • {transaction.note}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Side: Amount */}
      <div className="text-right relative z-10 shrink-0 ml-3">
        <div className={`font-display font-bold text-base tabular-nums tracking-tight ${isExpense ? 'text-white' : 'text-secondary drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`}>
          {isExpense ? '-' : '+'}{transaction.amount.toLocaleString()}
        </div>
        <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest font-mono">
          {currency}
        </div>
      </div>

      {/* Wallet indicator dot */}
      {transaction.wallet === 'savings' && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_6px_#10B981]" title="Savings"></div>
      )}
    </div>
  );
};