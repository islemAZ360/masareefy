import React from 'react';
import { UserSettings, BudgetPlan, PlanType } from '../types';
import { Shield, Scale, Coffee, CheckCircle, CalendarDays, Calculator, AlertTriangle, PiggyBank } from 'lucide-react';
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
      // Fallback: Estimate next salary based on interval
      nextSalary = new Date(today);
      nextSalary.setDate(today.getDate() + (user.salaryInterval || 30));
  }
  nextSalary.setHours(0, 0, 0, 0);

  const diffTime = nextSalary.getTime() - today.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // B. Weighted Days Logic (Weekends are more expensive)
  let weekendsCount = 0;
  let weekdaysCount = 0;
  for (let i = 0; i < daysRemaining; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = d.getDay();
      // Friday(5) & Saturday(6) are weekends in some regions (AR), Sat(6)/Sun(0) in others (EN/RU).
      const isWeekend = user.language === 'ar' ? (day === 5 || day === 6) : (day === 6 || day === 0);
      if (isWeekend) weekendsCount++;
      else weekdaysCount++;
  }

  // C. Liability Analysis (Scanning Recurring Bills)
  const currentMonthPrefix = today.toISOString().slice(0, 7); // YYYY-MM
  const bills = user.recurringBills || [];
  
  // Calculate total unpaid bills that are likely due before next salary
  // Assumption: Any bill not marked paid this month is a liability
  const unpaidBillsTotal = bills.reduce((sum, bill) => {
      const isPaidThisMonth = bill.lastPaidDate && bill.lastPaidDate.startsWith(currentMonthPrefix);
      return isPaidThisMonth ? sum : sum + bill.amount;
  }, 0);

  // D. Net Disposable Income (The Real Money)
  const grossBalance = user.currentBalance > 0 ? user.currentBalance : 0;
  // We reserve money for bills FIRST
  const netDisposable = Math.max(0, grossBalance - unpaidBillsTotal);
  
  const isCritical = grossBalance < unpaidBillsTotal; // Danger zone

  // --- 2. Plan Generation Strategy ---

  const createSmartPlan = (type: PlanType): BudgetPlan => {
      // Configuration based on Plan Type
      let safetyBufferPct = 0; // Hidden money for emergencies
      let weekendMultiplier = 1.0; // How much more to spend on weekends
      let savingsAggression = 0; // % to forcefully save from Disposable

      if (type === 'austerity') {
          safetyBufferPct = 0.20; // High buffer (20% hidden)
          weekendMultiplier = 1.0; // No weekend fun
          savingsAggression = 0.30; // Save 30% of what's left
      } else if (type === 'balanced') {
          safetyBufferPct = 0.10; // Moderate buffer
          weekendMultiplier = 1.3; // 30% more on weekends
          savingsAggression = 0.15; // Save 15%
      } else { // Comfort
          safetyBufferPct = 0.05; // Minimal buffer
          weekendMultiplier = 1.6; // 60% more on weekends (Party mode)
          savingsAggression = 0.0; // Spend it all
      }

      // 1. Deduct Safety Buffer
      const afterBuffer = netDisposable * (1 - safetyBufferPct);
      
      // 2. Deduct Planned Savings
      const spendablePool = afterBuffer * (1 - savingsAggression);
      const projectedSavings = (netDisposable - spendablePool) + (grossBalance - netDisposable - unpaidBillsTotal); // Math simplification: Total - Spent

      // 3. Weighted Daily Calculation
      // Formula: Total = (Weekdays * Daily) + (Weekends * Daily * Multiplier)
      // Total = Daily * (Weekdays + Weekends * Multiplier)
      // Daily = Total / (Weekdays + Weekends * Multiplier)
      
      const weightedDivisor = weekdaysCount + (weekendsCount * weekendMultiplier);
      const baseDaily = Math.floor(spendablePool / Math.max(1, weightedDivisor));
      
      // If today is weekend, show the boosted amount, else base amount
      const todayIsWeekend = user.language === 'ar' 
        ? (today.getDay() === 5 || today.getDay() === 6)
        : (today.getDay() === 6 || today.getDay() === 0);

      const todayLimit = todayIsWeekend ? Math.floor(baseDaily * weekendMultiplier) : baseDaily;

      // Descriptions
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
    ? [createSmartPlan('austerity')] // Only show austerity if broke
    : [createSmartPlan('austerity'), createSmartPlan('balanced'), createSmartPlan('comfort')];

  // UI Helpers
  const PLANS_CONFIG = {
    austerity: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    balanced: { color: 'text-sber-green', bg: 'bg-sber-green/10', border: 'border-sber-green/20' },
    comfort: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
  };

  const getIcon = (type: PlanType) => {
    switch(type) {
      case 'austerity': return <Shield className={`w-6 h-6 ${PLANS_CONFIG.austerity.color}`} />;
      case 'balanced': return <Scale className={`w-6 h-6 ${PLANS_CONFIG.balanced.color}`} />;
      case 'comfort': return <Coffee className={`w-6 h-6 ${PLANS_CONFIG.comfort.color}`} />;
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
      <div className="bg-[#1C1C1E] p-5 rounded-[1.5rem] border border-white/5 mx-1 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -z-10"></div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
               {/* Time Context */}
               <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2 text-zinc-400">
                       <CalendarDays size={14} />
                       <span className="text-[10px] font-bold uppercase tracking-wider">{user.language === 'ar' ? 'حتى الراتب' : 'Until Salary'}</span>
                   </div>
                   <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white">{daysRemaining}</span>
                        <span className="text-xs text-zinc-500">{user.language === 'ar' ? 'يوم' : 'days'}</span>
                   </div>
                   <div className="flex gap-2 text-[10px] mt-1">
                       <span className="bg-white/5 px-2 py-0.5 rounded text-zinc-400">{weekdaysCount} Work</span>
                       <span className="bg-white/5 px-2 py-0.5 rounded text-zinc-400">{weekendsCount} W/End</span>
                   </div>
               </div>

               {/* Money Context */}
               <div className="flex flex-col gap-1 text-right">
                   <div className="flex items-center gap-2 justify-end text-zinc-400">
                       <span className="text-[10px] font-bold uppercase tracking-wider">{user.language === 'ar' ? 'السيولة الحقيقية' : 'Disposable Cash'}</span>
                       <Calculator size={14} />
                   </div>
                   <div className={`flex items-baseline justify-end gap-1 ${isCritical ? 'text-red-500' : 'text-sber-green'}`}>
                        <span className="text-2xl font-bold tabular-nums">{netDisposable.toLocaleString()}</span>
                        <span className="text-xs">{user.currency}</span>
                   </div>
                   {unpaidBillsTotal > 0 && (
                       <p className="text-[10px] text-red-400/80 font-medium">
                           -{unpaidBillsTotal} {user.language === 'ar' ? 'محجوزة للفواتير' : 'reserved for bills'}
                       </p>
                   )}
               </div>
          </div>

          {/* Progress Bar: Bills vs Disposable */}
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-red-500/50" 
                style={{ width: `${Math.min((unpaidBillsTotal / grossBalance) * 100, 100)}%` }} 
                title="Reserved for Bills"
              />
              <div 
                className="h-full bg-sber-green" 
                style={{ width: `${Math.min((netDisposable / grossBalance) * 100, 100)}%` }} 
                title="Disposable"
              />
          </div>
      </div>

      {/* 2. Critical Warning */}
      {isCritical && (
          <div className="mx-1 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 w-6 h-6 shrink-0" />
              <div>
                  <h4 className="text-red-500 font-bold text-sm">{user.language === 'ar' ? 'عجز مالي حرج!' : 'Critical Deficit!'}</h4>
                  <p className="text-xs text-red-400 mt-1">
                      {user.language === 'ar' 
                      ? `رصيدك الحالي (${grossBalance}) أقل من الفواتير المستحقة (${unpaidBillsTotal}). لا يمكنك اختيار خطة رفاهية.` 
                      : `Your balance (${grossBalance}) is less than due bills (${unpaidBillsTotal}). Comfort plans disabled.`}
                  </p>
              </div>
          </div>
      )}

      {/* 3. The Plans */}
      <div className="grid grid-cols-1 gap-3 px-1">
        {plans.map((plan) => {
          const isSelected = user.selectedPlan === plan.type;
          const config = PLANS_CONFIG[plan.type];
          
          return (
            <button
              key={plan.type}
              onClick={() => onSelectPlan(plan)}
              className={`relative p-5 rounded-[1.5rem] border transition-all duration-300 flex flex-col gap-3 text-left group overflow-hidden ${
                isSelected 
                  ? `${config.bg} ${config.border} shadow-lg ring-1 ring-inset ${config.color.replace('text', 'ring')}` 
                  : 'bg-[#1C1C1E] border-white/5 hover:border-white/10'
              }`}
            >
              {isSelected && (
                  <div className="absolute top-4 right-4 animate-in zoom-in">
                      <CheckCircle className={`${config.color} w-6 h-6 fill-current opacity-20`} />
                      <CheckCircle className={`${config.color} w-6 h-6 absolute top-0 left-0`} />
                  </div>
              )}
              
              <div className="flex items-center gap-3 relative z-10">
                <div className={`p-3 rounded-2xl bg-black/40 border border-white/5 ${isSelected ? 'shadow-inner' : ''}`}>
                    {getIcon(plan.type)}
                </div>
                <div>
                    <h4 className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-gray-200'}`}>{getTitle(plan.type)}</h4>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                         {user.language === 'ar' ? 'الحد اليومي' : 'Daily Limit'}
                         {plan.type !== 'austerity' && (
                             <span className="bg-white/10 px-1 rounded text-[8px] text-white">
                                 {plan.type === 'balanced' ? '+30%' : '+60%'} W/END
                             </span>
                         )}
                    </span>
                </div>
              </div>
              
              <div className="relative z-10 pl-1">
                 <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold tabular-nums ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {plan.dailyLimit}
                    </span>
                    <span className="text-sm font-medium text-gray-500">{user.currency}</span>
                 </div>
                 
                 <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-[90%]">
                    {user.language === 'ar' ? plan.description_ar : user.language === 'ru' ? plan.description_ru : plan.description_en}
                 </p>
              </div>

              {/* Advanced Stats Badge */}
              <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                   {plan.monthlySavingsProjected > 0 && (
                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 bg-green-500/10 text-green-400`}>
                            <PiggyBank size={10} />
                            <span>+{plan.monthlySavingsProjected} Save</span>
                        </div>
                   )}
                   {plan.type === 'austerity' && (
                       <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 bg-yellow-500/10 text-yellow-500`}>
                           <Shield size={10} />
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