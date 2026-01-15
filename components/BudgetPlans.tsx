import React from 'react';
import { UserSettings, BudgetPlan, PlanType } from '../types';
import { Shield, Scale, Coffee, CheckCircle } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface Props {
  user: UserSettings;
  onSelectPlan: (plan: BudgetPlan) => void;
}

export const BudgetPlans: React.FC<Props> = ({ user, onSelectPlan }) => {
  const t = TRANSLATIONS[user.language];

  // Logic to calculate budget
  // 1. Calculate days remaining in month (or until next salary)
  const today = new Date();
  const nextSalary = user.nextSalaryDate ? new Date(user.nextSalaryDate) : new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const diffTime = Math.abs(nextSalary.getTime() - today.getTime());
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  // 2. Base Daily Budget = Current Balance / Days
  const baseDaily = (user.currentBalance > 0 ? user.currentBalance : 0) / daysRemaining;

  const plans: BudgetPlan[] = [
    {
      type: 'austerity',
      dailyLimit: Math.floor(baseDaily * 0.6), // 60% of base
      monthlySavingsProjected: Math.floor(baseDaily * 0.4 * daysRemaining),
      description_en: 'Strict savings mode. Essentials only.',
      description_ar: 'وضع توفير صارم. للضروريات فقط.',
      description_ru: 'Строгий режим экономии. Только необходимое.',
    },
    {
      type: 'balanced',
      dailyLimit: Math.floor(baseDaily * 0.85), // 85% of base
      monthlySavingsProjected: Math.floor(baseDaily * 0.15 * daysRemaining),
      description_en: 'Smart balance between life and savings.',
      description_ar: 'توازن ذكي بين الحياة والادخار.',
      description_ru: 'Разумный баланс между жизнью и сбережениями.',
    },
    {
      type: 'comfort',
      dailyLimit: Math.floor(baseDaily * 1.0), // 100% of base
      monthlySavingsProjected: 0,
      description_en: 'Spend your full available budget comfortably.',
      description_ar: 'صرف الميزانية المتاحة بالكامل براحة.',
      description_ru: 'Комфортно тратьте весь доступный бюджет.',
    }
  ];

  const getIcon = (type: PlanType) => {
    switch(type) {
      case 'austerity': return <Shield className="w-8 h-8 text-yellow-500" />;
      case 'balanced': return <Scale className="w-8 h-8 text-sber-green" />;
      case 'comfort': return <Coffee className="w-8 h-8 text-blue-400" />;
    }
  };

  const getTitle = (type: PlanType) => {
    if (user.language === 'ar') {
      return type === 'austerity' ? 'التقشف' : type === 'balanced' ? 'التوازن' : 'الراحة';
    }
    if (user.language === 'ru') {
        return type === 'austerity' ? 'Аскетизм' : type === 'balanced' ? 'Баланс' : 'Комфорт';
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold px-2">{user.language === 'ar' ? 'خطط الميزانية المقترحة' : user.language === 'ru' ? 'Рекомендуемые планы' : 'Suggested Budget Plans'}</h3>
      <div className="grid grid-cols-1 gap-4">
        {plans.map((plan) => {
          const isSelected = user.selectedPlan === plan.type;
          return (
            <button
              key={plan.type}
              onClick={() => onSelectPlan(plan)}
              className={`relative p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 text-left ${
                isSelected 
                  ? 'bg-sber-green/10 border-sber-green shadow-[0_0_20px_rgba(33,160,56,0.3)]' 
                  : 'bg-sber-card border-zinc-800 hover:border-zinc-600'
              }`}
            >
              {isSelected && <div className="absolute top-3 right-3"><CheckCircle className="text-sber-green w-5 h-5" /></div>}
              
              <div className="bg-black/40 p-3 rounded-full">
                {getIcon(plan.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-lg">{getTitle(plan.type)}</h4>
                  <span className="font-mono font-bold text-white text-lg">{plan.dailyLimit} <span className="text-xs text-gray-400">{user.currency}/day</span></span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  {user.language === 'ar' ? plan.description_ar : user.language === 'ru' ? plan.description_ru : plan.description_en}
                </p>
                {plan.monthlySavingsProjected > 0 && (
                   <div className="inline-block bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full font-bold">
                      {user.language === 'ar' ? 'توفير متوقع: ' : 'Save: '} +{plan.monthlySavingsProjected}
                   </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};