import { UserSettings, Transaction, TitanAnalysis, TitanScenario, RiskAlert, LifeEnergy, TransactionType } from '../types';

// ============================================================================
// STANDARD TITAN ENGINE V2 – Enhanced with Monte Carlo & Opportunity Cost
// Pure Math-Driven Scenario Analysis with Realistic Volatility
// ============================================================================

// Pseudo-random with seed for reproducible results
function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF;
        return (state >>> 0) / 0xFFFFFFFF;
    };
}

/**
 * Simulate 3 future financial scenarios based on a purchase decision.
 * V2: Now with Monte Carlo volatility, inflation modeling, and opportunity cost.
 */
export const simulateMultiverseStandard = (
    user: UserSettings,
    transactions: Transaction[],
    itemName: string,
    itemPrice: number
): TitanAnalysis => {
    const balance = user.currentBalance;
    const monthlyIncome = user.lastSalaryAmount || 0;
    const totalBills = (user.recurringBills || []).reduce((s, b) => s + b.amount, 0);

    // Calculate spending patterns from last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentExpenses = transactions
        .filter(t => (t.type === TransactionType.EXPENSE || t.type === 'expense' as any) && new Date(t.date) >= thirtyDaysAgo);
    const totalRecentSpend = recentExpenses.reduce((s, t) => s + t.amount, 0);
    const dailySpending = totalRecentSpend / 30 || (balance * 0.03);

    // Calculate spending volatility (standard deviation)
    const dailyAmounts: number[] = [];
    for (let d = 0; d < 30; d++) {
        const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dayTotal = recentExpenses
            .filter(t => t.date.startsWith(dayDate))
            .reduce((s, t) => s + t.amount, 0);
        dailyAmounts.push(dayTotal);
    }
    const mean = dailyAmounts.reduce((s, v) => s + v, 0) / dailyAmounts.length;
    const variance = dailyAmounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / dailyAmounts.length;
    const volatility = Math.sqrt(variance);

    // Life Energy Calculation
    const lifeEnergy = calculateLifeEnergy(itemPrice, monthlyIncome, itemName, user.language);

    // Generate 3 Scenarios with Monte Carlo volatility
    const rng = seededRandom(Math.round(itemPrice * 1000 + balance));
    const scenarios: TitanScenario[] = [
        generateCollapseScenario(balance, itemPrice, dailySpending, volatility, totalBills, monthlyIncome, rng, user.language),
        generateWarriorScenario(balance, itemPrice, dailySpending, volatility, totalBills, monthlyIncome, rng, user.language),
        generateWealthScenario(balance, itemPrice, dailySpending, volatility, totalBills, monthlyIncome, rng, user.language),
    ];

    // Risk Analysis (enhanced)
    const risks = analyzeRisks(balance, itemPrice, dailySpending, totalBills, monthlyIncome, user.savingsBalance || 0, itemName, user.language);

    // Generate Verdict
    const aiVerdict = generateVerdict(balance, itemPrice, dailySpending, totalBills, monthlyIncome, user.savingsBalance || 0, itemName, user.language);

    return { scenarios, risks, lifeEnergy, aiVerdict };
};

/**
 * Calculate life energy cost with detailed breakdown
 */
function calculateLifeEnergy(price: number, monthlyIncome: number, itemName: string, language: string): LifeEnergy {
    const isAr = language === 'ar';
    const isRu = language === 'ru';

    const hourlyRate = monthlyIncome > 0 ? monthlyIncome / 176 : price / 10;
    const hoursOfWork = hourlyRate > 0 ? price / hourlyRate : 0;
    const daysOfLife = hoursOfWork / 8;

    let sacrifice: string;
    if (hoursOfWork <= 1) {
        sacrifice = isAr ? '☕ أقل من ساعة عمل – تكلفة تافهة'
            : isRu ? '☕ Менее часа работы – пустяковая стоимость'
                : '☕ Less than an hour of work – negligible cost';
    } else if (hoursOfWork <= 4) {
        sacrifice = isAr ? `⏰ نصف يوم عمل (${hoursOfWork.toFixed(1)} ساعة) مقابل ${itemName}`
            : isRu ? `⏰ Полдня работы (${hoursOfWork.toFixed(1)} ч) за ${itemName}`
                : `⏰ Half a workday (${hoursOfWork.toFixed(1)}h) for ${itemName}`;
    } else if (hoursOfWork <= 8) {
        sacrifice = isAr ? `💼 يوم عمل كامل من حياتك (${hoursOfWork.toFixed(1)} ساعة)`
            : isRu ? `💼 Целый рабочий день (${hoursOfWork.toFixed(1)} ч)`
                : `💼 A full workday of your life (${hoursOfWork.toFixed(1)}h)`;
    } else if (hoursOfWork <= 40) {
        sacrifice = isAr ? `📅 أسبوع كامل من العمل الشاق (${daysOfLife.toFixed(1)} أيام)`
            : isRu ? `📅 Целая рабочая неделя (${daysOfLife.toFixed(1)} дней)`
                : `📅 An entire work week (${daysOfLife.toFixed(1)} days)`;
    } else if (hoursOfWork <= 176) {
        sacrifice = isAr ? `📆 شهر كامل من حياتك المهنية (${daysOfLife.toFixed(0)} يوم عمل). فكّر ملياً!`
            : isRu ? `📆 Целый месяц работы (${daysOfLife.toFixed(0)} дней). Подумайте!`
                : `📆 A full month of your career (${daysOfLife.toFixed(0)} work days). Think carefully!`;
    } else {
        const months = (hoursOfWork / 176).toFixed(1);
        sacrifice = isAr ? `🚨 أكثر من ${months} شهر عمل متواصل! هذا استثمار ضخم في وقت حياتك.`
            : isRu ? `🚨 Более ${months} месяцев непрерывной работы! Серьёзная инвестиция.`
                : `🚨 More than ${months} months of non-stop work! A massive life-time investment.`;
    }

    return { hoursOfWork: Math.round(hoursOfWork * 10) / 10, daysOfLife: Math.round(daysOfLife * 10) / 10, sacrifice };
}

/**
 * Scenario 1: COLLAPSE – Buy, continue same habits, with realistic volatility
 */
function generateCollapseScenario(
    balance: number, price: number, dailySpending: number, volatility: number,
    monthlyBills: number, monthlyIncome: number, rng: () => number, language: string
): TitanScenario {
    const isAr = language === 'ar';
    const isRu = language === 'ru';

    const timeline: { date: string; balance: number; event?: string }[] = [];
    let running = balance - price;

    for (let week = 0; week < 12; week++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + week * 7);

        if (week > 0) {
            // Monte Carlo: add volatility noise
            const noise = (rng() - 0.5) * 2 * volatility * 2;
            running -= (dailySpending + noise / 7) * 7;

            if (week % 4 === 0) {
                running -= monthlyBills;
                running += monthlyIncome;
            }

            // Inflation: 3% annual → ~0.058% weekly
            running *= (1 - 0.0003 * 7);
        }

        const event = week === 0
            ? (isAr ? `شراء ${price.toLocaleString()}` : isRu ? `Покупка ${price.toLocaleString()}` : `Purchase ${price.toLocaleString()}`)
            : running <= 0
                ? (isAr ? '💀 إفلاس' : isRu ? '💀 Банкрот' : '💀 Bankrupt')
                : undefined;

        timeline.push({
            date: futureDate.toISOString().split('T')[0],
            balance: Math.max(0, Math.round(running)),
            event
        });
    }

    return {
        id: 'collapse',
        name: isAr ? '🔴 الانهيار' : isRu ? '🔴 Крушение' : '🔴 Collapse',
        description: isAr ? 'تشتري وتستمر بنفس العادات – مع تقلبات واقعية'
            : isRu ? 'Покупаете и продолжаете как обычно – с реалистичными колебаниями'
                : 'Buy and maintain current habits – with realistic volatility',
        color: '#EF4444',
        timeline,
        finalBalance: timeline[timeline.length - 1].balance,
    };
}

/**
 * Scenario 2: WARRIOR – Buy but cut spending by 35% with discipline
 */
function generateWarriorScenario(
    balance: number, price: number, dailySpending: number, volatility: number,
    monthlyBills: number, monthlyIncome: number, rng: () => number, language: string
): TitanScenario {
    const isAr = language === 'ar';
    const isRu = language === 'ru';

    const timeline: { date: string; balance: number; event?: string }[] = [];
    let running = balance - price;
    const reducedDaily = dailySpending * 0.65;

    for (let week = 0; week < 12; week++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + week * 7);

        if (week > 0) {
            const noise = (rng() - 0.5) * volatility * 1.2; // Less volatile due to discipline
            running -= (reducedDaily + noise / 7) * 7;

            if (week % 4 === 0) {
                running -= monthlyBills;
                running += monthlyIncome;
            }
        }

        const event = week === 0
            ? (isAr ? 'بدء وضع المحارب' : isRu ? 'Режим воина' : 'Warrior mode activated')
            : week === 4
                ? (isAr ? '💪 شهر من الانضباط' : isRu ? '💪 Месяц дисциплины' : '💪 1 month of discipline')
                : undefined;

        timeline.push({
            date: futureDate.toISOString().split('T')[0],
            balance: Math.max(0, Math.round(running)),
            event
        });
    }

    return {
        id: 'warrior',
        name: isAr ? '🟡 المحارب' : isRu ? '🟡 Воин' : '🟡 Warrior',
        description: isAr ? 'تشتري لكن تقلل مصاريفك 35% بانضباط صارم'
            : isRu ? 'Покупаете, но сокращаете расходы на 35% с жёсткой дисциплиной'
                : 'Buy but cut spending by 35% with strict discipline',
        color: '#EAB308',
        timeline,
        finalBalance: timeline[timeline.length - 1].balance,
    };
}

/**
 * Scenario 3: WEALTH – Skip purchase, invest at 8% annually, compound weekly
 */
function generateWealthScenario(
    balance: number, price: number, dailySpending: number, volatility: number,
    monthlyBills: number, monthlyIncome: number, rng: () => number, language: string
): TitanScenario {
    const isAr = language === 'ar';
    const isRu = language === 'ru';

    const timeline: { date: string; balance: number; event?: string }[] = [];
    let running = balance;
    const weeklyReturn = 0.08 / 52;
    let investedAmount = price; // Amount that would have been spent

    for (let week = 0; week < 12; week++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + week * 7);

        if (week > 0) {
            const noise = (rng() - 0.5) * volatility * 0.8;
            running -= (dailySpending + noise / 7) * 7;

            // Investment grows
            investedAmount *= (1 + weeklyReturn);

            if (week % 4 === 0) {
                running -= monthlyBills;
                running += monthlyIncome;
            }
        }

        const totalValue = running + investedAmount;

        const event = week === 0
            ? (isAr ? '📈 بدء الاستثمار' : isRu ? '📈 Начало инвестиции' : '📈 Investment started')
            : week === 11
                ? (isAr ? `💰 العائد: +${Math.round(investedAmount - price).toLocaleString()}` : isRu ? `💰 Доход: +${Math.round(investedAmount - price).toLocaleString()}` : `💰 Return: +${Math.round(investedAmount - price).toLocaleString()}`)
                : undefined;

        timeline.push({
            date: futureDate.toISOString().split('T')[0],
            balance: Math.max(0, Math.round(totalValue)),
            event
        });
    }

    return {
        id: 'wealth',
        name: isAr ? '🟢 بناء الثروة' : isRu ? '🟢 Богатство' : '🟢 Wealth Builder',
        description: isAr ? 'لا تشتري وتستثمر المبلغ بعائد 8% سنوياً مركب'
            : isRu ? 'Не покупаете и инвестируете с доходностью 8% годовых'
                : 'Skip purchase and invest at 8% annually, compounded weekly',
        color: '#22C55E',
        timeline,
        finalBalance: timeline[timeline.length - 1].balance,
    };
}

/**
 * Enhanced risk analysis with 6 rules
 */
function analyzeRisks(
    balance: number, price: number, dailySpending: number,
    monthlyBills: number, monthlyIncome: number, savings: number,
    itemName: string, language: string
): RiskAlert[] {
    const isAr = language === 'ar';
    const isRu = language === 'ru';
    const risks: RiskAlert[] = [];
    const afterPurchase = balance - price;
    const daysToZero = dailySpending > 0 ? Math.floor(afterPurchase / dailySpending) : 999;
    const now = new Date();

    // Risk 1: Can't cover bills
    if (afterPurchase < monthlyBills) {
        const d = new Date(now); d.setDate(d.getDate() + 7);
        risks.push({
            billName: itemName,
            message: isAr ? '⚠️ لن تستطيع تغطية الفواتير الشهرية بعد الشراء!'
                : isRu ? '⚠️ Не сможете оплатить ежемесячные счета!'
                    : '⚠️ Can\'t cover monthly bills after purchase!',
            severity: 'critical',
            date: d.toISOString().split('T')[0]
        });
    }

    // Risk 2: Balance drops below 20%
    if (afterPurchase < balance * 0.2) {
        const d = new Date(now); d.setDate(d.getDate() + 3);
        risks.push({
            billName: itemName,
            message: isAr ? '📉 الرصيد سينخفض لأقل من 20%'
                : isRu ? '📉 Баланс упадёт ниже 20%'
                    : '📉 Balance drops below 20% of current level',
            severity: 'high',
            date: d.toISOString().split('T')[0]
        });
    }

    // Risk 3: Less than 7 days runway
    if (daysToZero < 7) {
        const d = new Date(now); d.setDate(d.getDate() + daysToZero);
        risks.push({
            billName: itemName,
            message: isAr ? `💀 ستصل لصفر خلال ${daysToZero} أيام فقط!`
                : isRu ? `💀 Деньги закончатся через ${daysToZero} дней!`
                    : `💀 You'll hit zero in just ${daysToZero} days!`,
            severity: 'critical',
            date: d.toISOString().split('T')[0]
        });
    }

    // Risk 4: Price > Monthly Income
    if (price > monthlyIncome && monthlyIncome > 0) {
        risks.push({
            billName: itemName,
            message: isAr ? '🚨 سعر المنتج أكبر من راتبك الشهري!'
                : isRu ? '🚨 Цена товара больше месячной зарплаты!'
                    : '🚨 Item price exceeds your monthly income!',
            severity: 'critical',
            date: now.toISOString().split('T')[0]
        });
    }

    // Risk 5: No emergency fund
    if (savings < monthlyBills && afterPurchase < monthlyBills * 2) {
        const d = new Date(now); d.setDate(d.getDate() + 14);
        risks.push({
            billName: itemName,
            message: isAr ? '🛡️ ليس لديك صندوق طوارئ كافٍ'
                : isRu ? '🛡️ Нет достаточного аварийного фонда'
                    : '🛡️ Insufficient emergency fund',
            severity: 'high',
            date: d.toISOString().split('T')[0]
        });
    }

    // Risk 6: Price is more than 50% of balance
    if (price > balance * 0.5) {
        risks.push({
            billName: itemName,
            message: isAr ? '⚡ الشراء سيأكل أكثر من نصف رصيدك'
                : isRu ? '⚡ Покупка съест более половины баланса'
                    : '⚡ Purchase consumes over half your balance',
            severity: 'high',
            date: now.toISOString().split('T')[0]
        });
    }

    return risks;
}

/**
 * Generate a verdict using a scoring system (0-10)
 */
function generateVerdict(
    balance: number, price: number, dailySpending: number,
    monthlyBills: number, monthlyIncome: number, savings: number,
    itemName: string, language: string
): string {
    const isAr = language === 'ar';
    const isRu = language === 'ru';

    const afterPurchase = balance - price;
    const priceToIncome = monthlyIncome > 0 ? price / monthlyIncome : Infinity;
    const priceToBalance = price / Math.max(balance, 1);
    const canCoverBills = afterPurchase >= monthlyBills;
    const hasBackup = savings >= price * 0.5;
    const runwayAfter = dailySpending > 0 ? afterPurchase / dailySpending : 999;

    let score = 5;
    if (priceToBalance > 0.5) score -= 3;
    else if (priceToBalance > 0.3) score -= 2;
    else if (priceToBalance < 0.1) score += 2;
    if (!canCoverBills) score -= 3;
    if (hasBackup) score += 1;
    if (priceToIncome > 1) score -= 2;
    else if (priceToIncome < 0.1) score += 2;
    if (runwayAfter < 7) score -= 2;
    else if (runwayAfter > 30) score += 1;

    score = Math.max(0, Math.min(10, score));

    if (score >= 8) {
        return isAr
            ? `✅ الشراء آمن تماماً. ${itemName} لن يؤثر على استقرارك المالي. الوضع مريح – اشترِ بثقة. (${score}/10)`
            : isRu
                ? `✅ Покупка абсолютно безопасна. ${itemName} не повлияет на стабильность. Действуйте! (${score}/10)`
                : `✅ Purchase is safe. ${itemName} won't impact your financial stability. Go ahead with confidence. (${score}/10)`;
    } else if (score >= 6) {
        return isAr
            ? `⚠️ يمكنك شراء ${itemName}، لكن كن حذراً الأسابيع القادمة. قلل الإنفاق الاختياري وراقب رصيدك. (${score}/10)`
            : isRu
                ? `⚠️ Можете купить ${itemName}, но будьте осторожны. Сократите необязательные расходы. (${score}/10)`
                : `⚠️ You can buy ${itemName}, but watch your spending closely in coming weeks. Cut discretionary expenses. (${score}/10)`;
    } else if (score >= 3) {
        return isAr
            ? `🟠 شراء ${itemName} سيضغط على ميزانيتك بشدة. إذا لم يكن ضرورياً، انتظر الراتب القادم. رصيدك لن يتحمل ضربة بهذا الحجم. (${score}/10)`
            : isRu
                ? `🟠 Покупка ${itemName} серьёзно ударит по бюджету. Если не срочно – подождите зарплату. (${score}/10)`
                : `🟠 Buying ${itemName} will seriously strain your budget. Unless critical, wait for your next paycheck. (${score}/10)`;
    } else {
        return isAr
            ? `🔴 تحذير خطير: شراء ${itemName} الآن كارثي. سيأكل معظم رصيدك وقد لا تستطيع تغطية الفواتير. أجّل هذا الشراء بشكل قاطع. (${score}/10)`
            : isRu
                ? `🔴 Критическое предупреждение: покупка ${itemName} сейчас катастрофична. Отложите! (${score}/10)`
                : `🔴 Critical warning: Buying ${itemName} now is catastrophic. It will drain your balance and may leave bills uncovered. Absolutely delay this. (${score}/10)`;
    }
}
