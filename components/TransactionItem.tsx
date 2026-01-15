import React from 'react';
import { Transaction, Currency, ExpenseCategory } from '../types';
import { CATEGORIES } from '../constants';
import * as Icons from 'lucide-react';

interface Props {
  transaction: Transaction;
  currency: Currency;
  language: 'en' | 'ar' | 'ru';
}

export const TransactionItem: React.FC<Props> = ({ transaction, currency, language }) => {
  const category = CATEGORIES.find(c => c.id === transaction.category) || CATEGORIES[4]; // Default to Utilities
  // Safer icon resolution with fallback
  const IconComponent = (Icons as any)[category.icon] || Icons.HelpCircle || Icons.AlertCircle || Icons.Circle;

  const isExpense = transaction.type === 'expense';
  
  // Format Date
  const dateObj = new Date(transaction.date);
  const dateStr = new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(dateObj);

  return (
    <div className="flex items-center justify-between p-4 mb-3 bg-sber-card rounded-2xl hover:bg-sber-gray transition-colors">
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
          style={{ backgroundColor: category.color }}
        >
          {IconComponent ? <IconComponent size={20} /> : <div className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="font-semibold text-white text-base">
            {transaction.vendor || (language === 'ar' ? category.name_ar : language === 'ru' ? category.name_ru : category.name_en)}
          </h3>
          <p className="text-xs text-gray-400">{dateStr} • {transaction.note || ''}</p>
        </div>
      </div>
      <div className={`font-bold text-base ${isExpense ? 'text-white' : 'text-sber-green'}`}>
        {isExpense ? '-' : '+'}{transaction.amount.toLocaleString()} <span className="text-xs font-normal text-gray-400">{currency}</span>
      </div>
    </div>
  );
};