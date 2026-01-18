import React from 'react';
import { UserSettings, BudgetPlan, PlanType } from '../types';
import { Shield, Scale, Coffee, CheckCircle, CalendarDays, Calculator, AlertTriangle, PiggyBank, Sparkles } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface Props {
  user: UserSettings;
  onSelectPlan: (plan: BudgetPlan) => void;
}

export const BudgetPlans: React.FC<Props> = ({ user, onSelectPlan }) => {
  const t = TRANSLATIONS[user.language];

  // --- 1. THE BRAIN: Advanced Financial Engine ---

  // A. Time Analysis
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextSalary = user.nextSalaryDate ? new Date(user.nextSalaryDate) : null;
  if (!nextSalary || nextSalary < today) {
      nextSalary = new Date(today);
      nextSalary.setDate(today.getDate() + (user.salaryInterval || 30));
  }
  nextSalary.setHours(0, 0, 0, 0);

  const diffTime = nextSalary.getTime() - today.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // B. Weighted Days Logic
  let weekendsCount = 0;
  let weekdaysCount = 0;
  for (let i = 0; i < daysRemaining; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = d.getDay();
      const isWeekend = user.language === 'ar' ? (day === 5 || day === 6) : (day === 6 || day === 0);
      if (isWeekend) weekendsCount++;
      else weekdaysCount++;
  }

  // C. Liability Analysis
  const currentMonthPrefix = today.toISOString().slice(0, 7);
  const bills = user.recurringBills || [];
  
  const unpaidBillsTotal = bills.reduce((sum, bill) => {
      const isPaidThisMonth = bill.lastPaidDate && bill.lastPaidDate.startsWith(currentMonthPrefix);
      return isPaidThisMonth ? sum : sum + bill.amount;
  }, 0);

  // D. Net Disposable Income
  const grossBalance = user.currentBalance > 0 ? user.currentBalance : 0;
  const netDisposable = Math.max(0, grossBalance - unpaidBillsTotal);
  
  const isCritical = grossBalance < unpaidBillsTotal;

  // --- 2. Plan Generation Strategy ---

  const createSmartPlan = (type: PlanType): BudgetPlan => {
      let safetyBufferPct = 0;
      let weekendMultiplier = 1.0;
      let savingsAggression = 0;

      if (type === 'austerity') {
          safetyBufferPct = 0.20;
          weekendMultiplier = 1.0;
          savingsAggression = 0.30;
      } else if (type === 'balanced') {
          safetyBufferPct = 0.10;
          weekendMultiplier = 1.3;
          savingsAggression = 0.15;
      } else { // Comfort
          safetyBufferPct = 0.05;
          weekendMultiplier = 1.6;
          savingsAggression = 0.0;
      }

      const afterBuffer = netDisposable * (1 - safetyBufferPct);
      const spendablePool = afterBuffer * (1 - savingsAggression);
      const projectedSavings = (netDisposable - spendablePool) + (grossBalance - netDisposable - unpaidBillsTotal);
      
      const weightedDivisor = weekdaysCount + (weekendsCount * weekendMultiplier);
      const baseDaily = Math.floor(spendablePool / Math.max(1, weightedDivisor));
      
      const todayIsWeekend = user.language === 'ar' 
        ? (today.getDay() === 5 || today.getDay() === 6)
        : (today.getDay() === 6 || today.getDay() === 0);

      const todayLimit = todayIsWeekend ? Math.floor(baseDaily * weekendMultiplier) : baseDaily;

      let desc_en = '', desc_ar = '', desc_ru = '';
      if (type === 'austerity') {
          desc_en = `Survival mode. Reserves ${unpaidBillsTotal} for bills + 20% buffer.`;
          desc_ar = `وضع النجاة. يحجز ${unpaidBillsTotal} للفواتير + 20% طوارئ.`;
          desc_ru = `Режим выживания. Резерв ${unpaidBillsTotal} на счета.`;
      } else if (type === 'balanced') {
          desc_en = `Smart mix. ${weekendMultiplier}x spending on weekends.`;
          desc_ar = `مزيج ذكي. صرف ${weekendMultiplier}x في عطلة نهاية الأسبوع.`;
          desc_ru = `Умный микс. ${weekendMultiplier}x на выходных.`;
      } else {
          desc_en = `Max lifestyle. ${weekendMultiplier}x weekend boost. Minimal buffer.`;
          desc_ar = `رفاهية قصوى. ${weekendMultiplier}x زيادة للعطلة. هامش بسيط.`;
          desc_ru = `Макс. стиль. ${weekendMultiplier}x на выходных.`;
      }

      return {
          type,
          dailyLimit: todayLimit > 0 ? todayLimit : 0,
          monthlySavingsProjected: Math.floor(projectedSavings),
          description_en: desc_en,
          description_ar: desc_ar,
          description_ru: desc_ru
      };
  };

  const plans: BudgetPlan[] = isCritical 
    ? [createSmartPlan('austerity')]
    : [createSmartPlan('austerity'), createSmartPlan('balanced'), createSmartPlan('comfort')];

  // UI Helpers
  const PLANS_CONFIG = {
    austerity: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', shadow: 'shadow-yellow-500/20' },
    balanced: { color: 'text-sber-green', bg: 'bg-sber-green/10', border: 'border-sber-green/30', shadow: 'shadow-sber-green/20' },
    comfort: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', shadow: 'shadow-blue-500/20' }
  };

  const getIcon = (type: PlanType) => {
    switch(type) {
      case 'austerity': return <Shield className={`w-6 h-6 ${PLANS_CONFIG.austerity.color} drop-shadow-md`} />;
      case 'balanced': return <Scale className={`w-6 h-6 ${PLANS_CONFIG.balanced.color} drop-shadow-md`} />;
      case 'comfort': return <Coffee className={`w-6 h-6 ${PLANS_CONFIG.comfort.color} drop-shadow-md`} />;
    }
  };

  const getTitle = (type: PlanType) => {
      const titles = {
          ar: { austerity: 'خطة التقشف', balanced: 'المتوازنة (الذكية)', comfort: 'خطة الرفاهية' },
          en: { austerity: 'Survival Mode', balanced: 'Smart Balanced', comfort: 'Comfort Mode' },
          ru: { austerity: 'Выживание', balanced: 'Баланс', comfort: 'Комфорт' }
      };
      return (titles as any)[user.language][type] || type;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. The Financial Reality Check (Header) */}
      <div className="glass-card p-6 rounded-[2.5rem] relative overflow-hidden animate-slide-up-fade">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none animate-pulse-glow"></div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
               {/* Time Context */}
               <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2 text-zinc-400">
                       <CalendarDays size={14} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">{user.language === 'ar' ? 'حتى الراتب' : 'Until Payday'}</span>
                   </div>
                   <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-display font-bold text-white tracking-tighter tabular-nums text-glow">{daysRemaining}</span>
                        <span className="text-xs text-zinc-500 font-bold uppercase">{user.language === 'ar' ? 'يوم' : 'days'}</span>
                   </div>
                   <div className="flex gap-2 text-[9px] mt-1">
                       <span className="bg-white/5 px-2 py-1 rounded-md text-zinc-400 border border-white/5">{weekdaysCount} Work</span>
                       <span className="bg-white/5 px-2 py-1 rounded-md text-zinc-400 border border-white/5">{weekendsCount} Off</span>
                   </div>
               </div>

               {/* Money Context */}
               <div className="flex flex-col gap-1 text-right">
                   <div className="flex items-center gap-2 justify-end text-zinc-400">
                       <span className="text-[10px] font-bold uppercase tracking-widest">{user.language === 'ar' ? 'السيولة الحقيقية' : 'Disposable'}</span>
                       <Calculator size={14} />
                   </div>
                   <div className={`flex items-baseline justify-end gap-1 ${isCritical ? 'text-red-500' : 'text-sber-green'}`}>
                        <span className="text-3xl font-display font-bold tabular-nums text-glow">{netDisposable.toLocaleString()}</span>
                        <span className="text-xs font-bold">{user.currency}</span>
                   </div>
                   {unpaidBillsTotal > 0 && (
                       <p className="text-[10px] text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-full ml-auto w-fit">
                           -{unpaidBillsTotal} {user.language === 'ar' ? 'محجوزة' : 'reserved'}
                       </p>
                   )}
               </div>
          </div>

          {/* Progress Bar: Bills vs Disposable */}
          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden flex border border-white/5">
              <div 
                className="h-full bg-red-500 shadow-[0_0_10px_red]" 
                style={{ width: `${Math.min((unpaidBillsTotal / grossBalance) * 100, 100)}%` }} 
              />
              <div 
                className="h-full bg-sber-green shadow-[0_0_10px_#22c55e]" 
                style={{ width: `${Math.min((netDisposable / grossBalance) * 100, 100)}%` }} 
              />
          </div>
      </div>

      {/* 2. Critical Warning */}
      {isCritical && (
          <div className="glass-card bg-red-500/10 border-red-500/20 p-4 rounded-2xl flex items-start gap-4 animate-pulse-glow">
              <div className="p-2 bg-red-500/20 rounded-full text-red-500 shadow-lg"><AlertTriangle size={20} /></div>
              <div>
                  <h4 className="text-red-400 font-bold text-xs uppercase tracking-wider">{user.language === 'ar' ? 'عجز مالي حرج!' : 'Critical Deficit!'}</h4>
                  <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed">
                      {user.language === 'ar' 
                      ? `رصيدك الحالي (${grossBalance}) أقل من الفواتير المستحقة (${unpaidBillsTotal}). لا يمكنك اختيار خطة رفاهية.` 
                      : `Your balance (${grossBalance}) is less than due bills (${unpaidBillsTotal}). Comfort plans disabled.`}
                  </p>
              </div>
          </div>
      )}

      {/* 3. The Plans */}
      <div className="grid grid-cols-1 gap-3 animate-scale-in" style={{ animationDelay: '100ms' }}>
        {plans.map((plan, idx) => {
          const isSelected = user.selectedPlan === plan.type;
          const config = PLANS_CONFIG[plan.type];
          
          return (
            <button
              key={plan.type}
              onClick={() => onSelectPlan(plan)}
              className={`
                relative p-5 rounded-[2rem] border transition-all duration-300 flex flex-col gap-3 text-left group overflow-hidden
                ${isSelected 
                  ? `glass-card ${config.bg} ${config.border} ring-1 ring-inset ${config.color.replace('text', 'ring')} transform scale-[1.02] shadow-2xl` 
                  : 'glass-card hover:bg-white/5 hover:border-white/10 active:scale-[0.98]'
                }
              `}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {isSelected && (
                  <div className="absolute top-4 right-4 animate-scale-in text-white">
                      <div className={`absolute inset-0 blur-lg opacity-50 ${config.color.replace('text-', 'bg-')}`}></div>
                      <CheckCircle className={`w-6 h-6 fill-current relative z-10 ${config.color}`} />
                  </div>
              )}
              
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3.5 rounded-2xl glass-card border border-white/5 ${isSelected ? 'shadow-inner' : ''}`}>
                    {getIcon(plan.type)}
                </div>
                <div>
                    <h4 className={`font-display font-bold text-lg ${isSelected ? 'text-white' : 'text-zinc-200'} tracking-wide`}>{getTitle(plan.type)}</h4>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                         {user.language === 'ar' ? 'الحد اليومي' : 'Daily Limit'}
                         {plan.type !== 'austerity' && (
                             <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] text-white border border-white/5">
                                 {plan.type === 'balanced' ? '+30%' : '+60%'} Weekend
                             </span>
                         )}
                    </span>
                </div>
              </div>
              
              <div className="relative z-10 pl-1 mt-1">
                 <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-display font-bold tabular-nums tracking-tighter ${isSelected ? 'text-white text-glow' : 'text-zinc-400'}`}>
                        {plan.dailyLimit}
                    </span>
                    <span className="text-sm font-bold text-zinc-600">{user.currency}</span>
                 </div>
                 
                 <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-[90%] font-medium">
                    {user.language === 'ar' ? plan.description_ar : user.language === 'ru' ? plan.description_ru : plan.description_en}
                 </p>
              </div>

              {/* Advanced Stats Badge */}
              <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                   {plan.monthlySavingsProjected > 0 && (
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
                            <PiggyBank size={12} />
                            <span>+{plan.monthlySavingsProjected} Save</span>
                        </div>
                   )}
                   {plan.type === 'austerity' && (
                       <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`}>
                           <Shield size={12} />
                           <span>Max Buffer</span>
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