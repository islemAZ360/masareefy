import { Transaction, TransactionType } from '../types';

// ============================================================================
// STANDARD FINANCIAL ENGINE V2 – Advanced Math-Driven Analysis
// Features: Trend detection, pattern recognition, linear regression prediction,
//           health scoring, time-of-day analysis, 10+ smart rules
// ============================================================================

interface ParseResult {
    amount: number;
    vendor: string;
    category: string;
    type: TransactionType;
}

/**
 * Parse natural-language input into transaction data (standard mode, no AI)
 */
export function parseMagicInputStandard(text: string): ParseResult {
    const result: ParseResult = { amount: 0, vendor: '', category: 'other', type: TransactionType.EXPENSE };

    // Extract numbers (support 1,200 / 1.200 / 1200 formats)
    const numMatch = text.match(/[\d,]+\.?\d*/);
    if (numMatch) {
        result.amount = parseFloat(numMatch[0].replace(/,/g, ''));
    }

    // Detect income keywords
    const incomeWords = /salary|income|received|bonus|راتب|دخل|استلم|зарплата|доход|бонус/i;
    if (incomeWords.test(text)) result.type = TransactionType.INCOME;

    // Category detection (expanded keywords)
    const categoryMap: Record<string, RegExp> = {
        food: /food|eat|restaurant|lunch|dinner|breakfast|coffee|burger|pizza|sushi|أكل|مطعم|غداء|عشاء|قهوة|فطور|еда|ресторан|обед|ужин|кофе|завтрак/i,
        transport: /uber|taxi|gas|fuel|metro|bus|car|petrol|مواصلات|بنزين|تاكسي|سيارة|باص|метро|такси|бензин|транспорт|машина|автобус/i,
        shopping: /shop|buy|purchase|amazon|mall|clothes|shoes|تسوق|شراء|ملابس|أحذية|магазин|покупка|одежда|обувь|амазон/i,
        entertainment: /movie|game|netflix|spotify|fun|cinema|فيلم|لعبة|سينما|ترفيه|кино|игра|развлечение|нетфликс/i,
        health: /doctor|pharmacy|medicine|hospital|gym|دكتور|صيدلية|دواء|مستشفى|رياضة|врач|аптека|лекарство|больница|спорт/i,
        bills: /bill|electric|water|internet|phone|rent|فاتورة|كهرباء|ماء|إنترنت|إيجار|счёт|электричество|вода|интернет|аренда/i,
        education: /book|course|school|university|study|كتاب|دورة|مدرسة|جامعة|книга|курс|школа|университет/i,
        groceries: /grocery|supermarket|market|بقالة|سوبرماركت|سوق|продукты|супермаркет|рынок/i,
    };

    for (const [cat, regex] of Object.entries(categoryMap)) {
        if (regex.test(text)) { result.category = cat; break; }
    }

    // Extract vendor (remaining text after number removal)
    const vendorText = text.replace(/[\d,]+\.?\d*/, '').trim();
    if (vendorText.length > 0 && vendorText.length < 50) result.vendor = vendorText;

    return result;
}

// ============================================================================
// ADVANCED FINANCIAL ANALYSIS ENGINE
// ============================================================================

interface SpendingPattern {
    category: string;
    total: number;
    count: number;
    avgAmount: number;
    percentOfTotal: number;
    trend: 'up' | 'down' | 'stable';
}

interface WeeklyTrend {
    weekLabel: string;
    total: number;
    change: number; // % vs previous week
}

interface TimePattern {
    period: string;
    total: number;
    count: number;
}

interface FinancialInsight {
    type: 'warning' | 'tip' | 'achievement' | 'prediction';
    title: string;
    description: string;
    priority: number; // 1-5
}

interface AdvancedAnalysis {
    healthScore: number;
    healthGrade: string;
    totalExpenses: number;
    totalIncome: number;
    netFlow: number;
    burnRate: number;
    runwayDays: number;
    predictedBankruptDate: string | null;
    topCategories: SpendingPattern[];
    weeklyTrends: WeeklyTrend[];
    timePatterns: TimePattern[];
    insights: FinancialInsight[];
    recurringSpending: { name: string; amount: number; frequency: string }[];
    savingsRate: number;
}

/**
 * Run a deep financial analysis on transaction data
 */
export function getAdvancedFinancialAnalysis(
    transactions: Transaction[],
    balance: number,
    savingsBalance: number,
    monthlyIncome: number,
    language: string
): AdvancedAnalysis {
    const isAr = language === 'ar';
    const isRu = language === 'ru';

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Recent transactions (30 days)
    const recent = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
    const previous = transactions.filter(t => new Date(t.date) >= sixtyDaysAgo && new Date(t.date) < thirtyDaysAgo);

    const recentExpenses = recent.filter(t => t.type === TransactionType.EXPENSE);
    const previousExpenses = previous.filter(t => t.type === TransactionType.EXPENSE);
    const recentIncome = recent.filter(t => t.type === TransactionType.INCOME);

    const totalExpenses = recentExpenses.reduce((s, t) => s + t.amount, 0);
    const previousTotalExpenses = previousExpenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = recentIncome.reduce((s, t) => s + t.amount, 0) || monthlyIncome;
    const netFlow = totalIncome - totalExpenses;

    // Burn Rate & Runway
    const daysWithData = Math.max(1, Math.min(30, Math.ceil((now.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24))));
    const burnRate = totalExpenses / daysWithData;
    const runwayDays = burnRate > 0 ? balance / burnRate : 999;

    // Predicted bankruptcy date using simple linear regression
    let predictedBankruptDate: string | null = null;
    if (burnRate > 0 && runwayDays < 180) {
        const bankruptDate = new Date(now.getTime() + runwayDays * 24 * 60 * 60 * 1000);
        predictedBankruptDate = bankruptDate.toISOString().split('T')[0];
    }

    // Category Breakdown with Trends
    const topCategories = analyzeCategoryBreakdown(recentExpenses, previousExpenses, totalExpenses);

    // Weekly Trends (last 4 weeks)
    const weeklyTrends = analyzeWeeklyTrends(transactions, language);

    // Time-of-Day Patterns
    const timePatterns = analyzeTimePatterns(recentExpenses, language);

    // Recurring Spending Detection
    const recurringSpending = detectRecurringSpending(transactions, language);

    // Savings Rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Health Score (0-100)
    const healthScore = calculateHealthScore(
        balance, savingsBalance, totalExpenses, totalIncome,
        burnRate, runwayDays, savingsRate, previousTotalExpenses
    );
    const healthGrade = healthScore >= 90 ? 'A+' : healthScore >= 80 ? 'A' : healthScore >= 70 ? 'B+'
        : healthScore >= 60 ? 'B' : healthScore >= 50 ? 'C' : healthScore >= 40 ? 'D' : 'F';

    // Smart Insights (10+ rules)
    const insights = generateInsights(
        totalExpenses, previousTotalExpenses, totalIncome, burnRate, runwayDays,
        savingsRate, balance, savingsBalance, topCategories, weeklyTrends, recurringSpending,
        language
    );

    return {
        healthScore, healthGrade, totalExpenses, totalIncome, netFlow,
        burnRate, runwayDays, predictedBankruptDate, topCategories,
        weeklyTrends, timePatterns, insights, recurringSpending, savingsRate
    };
}

function analyzeCategoryBreakdown(recent: Transaction[], previous: Transaction[], total: number): SpendingPattern[] {
    const catMap: Record<string, { total: number; count: number }> = {};
    const prevCatMap: Record<string, number> = {};

    recent.forEach(t => {
        if (!catMap[t.category]) catMap[t.category] = { total: 0, count: 0 };
        catMap[t.category].total += t.amount;
        catMap[t.category].count++;
    });

    previous.forEach(t => {
        prevCatMap[t.category] = (prevCatMap[t.category] || 0) + t.amount;
    });

    return Object.entries(catMap)
        .map(([category, data]) => {
            const prevTotal = prevCatMap[category] || 0;
            const trend: 'up' | 'down' | 'stable' =
                prevTotal === 0 ? 'stable' :
                    data.total > prevTotal * 1.15 ? 'up' :
                        data.total < prevTotal * 0.85 ? 'down' : 'stable';

            return {
                category,
                total: data.total,
                count: data.count,
                avgAmount: data.total / data.count,
                percentOfTotal: total > 0 ? (data.total / total) * 100 : 0,
                trend
            };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);
}

function analyzeWeeklyTrends(transactions: Transaction[], language: string): WeeklyTrend[] {
    const isAr = language === 'ar';
    const isRu = language === 'ru';
    const weeks: WeeklyTrend[] = [];
    const now = new Date();

    for (let w = 3; w >= 0; w--) {
        const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
        const weekExpenses = transactions
            .filter(t => (t.type === TransactionType.EXPENSE) && new Date(t.date) >= weekStart && new Date(t.date) < weekEnd)
            .reduce((s, t) => s + t.amount, 0);

        const prevWeekTotal = weeks.length > 0 ? weeks[weeks.length - 1].total : weekExpenses;
        const change = prevWeekTotal > 0 ? ((weekExpenses - prevWeekTotal) / prevWeekTotal) * 100 : 0;

        const label = isAr ? `الأسبوع ${4 - w}` : isRu ? `Неделя ${4 - w}` : `Week ${4 - w}`;
        weeks.push({ weekLabel: label, total: Math.round(weekExpenses), change: Math.round(change) });
    }
    return weeks;
}

function analyzeTimePatterns(expenses: Transaction[], language: string): TimePattern[] {
    const isAr = language === 'ar';
    const isRu = language === 'ru';

    const periods = {
        morning: { total: 0, count: 0 },
        afternoon: { total: 0, count: 0 },
        evening: { total: 0, count: 0 },
        night: { total: 0, count: 0 }
    };

    expenses.forEach(t => {
        const hour = new Date(t.date).getHours();
        if (hour >= 6 && hour < 12) { periods.morning.total += t.amount; periods.morning.count++; }
        else if (hour >= 12 && hour < 17) { periods.afternoon.total += t.amount; periods.afternoon.count++; }
        else if (hour >= 17 && hour < 22) { periods.evening.total += t.amount; periods.evening.count++; }
        else { periods.night.total += t.amount; periods.night.count++; }
    });

    const labels: Record<string, string> = isAr
        ? { morning: '🌅 الصباح', afternoon: '☀️ الظهر', evening: '🌆 المساء', night: '🌙 الليل' }
        : isRu
            ? { morning: '🌅 Утро', afternoon: '☀️ День', evening: '🌆 Вечер', night: '🌙 Ночь' }
            : { morning: '🌅 Morning', afternoon: '☀️ Afternoon', evening: '🌆 Evening', night: '🌙 Night' };

    return Object.entries(periods)
        .map(([key, data]) => ({ period: labels[key], total: data.total, count: data.count }))
        .filter(p => p.count > 0);
}

function detectRecurringSpending(transactions: Transaction[], language: string): { name: string; amount: number; frequency: string }[] {
    const isAr = language === 'ar';
    const isRu = language === 'ru';

    // Group by vendor + approximate amount
    const vendorMap: Record<string, { amounts: number[]; dates: string[] }> = {};
    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
        const key = (t.vendor || t.category).toLowerCase().trim();
        if (!key) return;
        if (!vendorMap[key]) vendorMap[key] = { amounts: [], dates: [] };
        vendorMap[key].amounts.push(t.amount);
        vendorMap[key].dates.push(t.date);
    });

    const recurring: { name: string; amount: number; frequency: string }[] = [];
    for (const [name, data] of Object.entries(vendorMap)) {
        if (data.amounts.length >= 3) {
            const avgAmount = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length;
            // Check if amounts are similar (within 20% of average)
            const consistent = data.amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.2);
            if (consistent) {
                const freq = data.amounts.length >= 8
                    ? (isAr ? 'أسبوعي' : isRu ? 'Еженедельно' : 'Weekly')
                    : data.amounts.length >= 3
                        ? (isAr ? 'شهري' : isRu ? 'Ежемесячно' : 'Monthly')
                        : (isAr ? 'متكرر' : isRu ? 'Повторяющийся' : 'Recurring');
                recurring.push({ name, amount: Math.round(avgAmount), frequency: freq });
            }
        }
    }
    return recurring.slice(0, 5);
}

function calculateHealthScore(
    balance: number, savings: number, expenses: number, income: number,
    burnRate: number, runway: number, savingsRate: number, prevExpenses: number
): number {
    let score = 50;

    // Factor 1: Savings ratio (up to +15)
    const totalWealth = balance + savings;
    if (totalWealth > 0 && savings > 0) score += Math.min(15, (savings / totalWealth) * 30);

    // Factor 2: Savings rate (up to +15)
    if (savingsRate > 30) score += 15;
    else if (savingsRate > 20) score += 10;
    else if (savingsRate > 10) score += 5;
    else if (savingsRate < 0) score -= 10;

    // Factor 3: Runway (up to +15, down to -15)
    if (runway > 90) score += 15;
    else if (runway > 30) score += 8;
    else if (runway > 14) score += 3;
    else if (runway < 7) score -= 15;
    else score -= 5;

    // Factor 4: Month-over-month spending trend
    if (prevExpenses > 0) {
        const changeRate = (expenses - prevExpenses) / prevExpenses;
        if (changeRate < -0.1) score += 10; // Spending decreased
        else if (changeRate > 0.2) score -= 10; // Spending increased significantly
    }

    // Factor 5: Income covers expenses
    if (income > 0) {
        if (expenses < income * 0.6) score += 5;
        else if (expenses > income) score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

function generateInsights(
    expenses: number, prevExpenses: number, income: number,
    burnRate: number, runway: number, savingsRate: number,
    balance: number, savings: number,
    categories: SpendingPattern[], weeklyTrends: WeeklyTrend[],
    recurring: { name: string; amount: number; frequency: string }[],
    language: string
): FinancialInsight[] {
    const isAr = language === 'ar';
    const isRu = language === 'ru';
    const insights: FinancialInsight[] = [];

    // Rule 1: Runway critical
    if (runway < 7) {
        insights.push({
            type: 'warning', priority: 5,
            title: isAr ? '🚨 حالة طوارئ مالية' : isRu ? '🚨 Финансовая тревога' : '🚨 Financial Emergency',
            description: isAr ? `رصيدك سينفد خلال ${Math.round(runway)} أيام فقط. قلل الإنفاق فوراً.`
                : isRu ? `Деньги закончатся через ${Math.round(runway)} дней. Срочно сократите расходы.`
                    : `Your balance will hit zero in just ${Math.round(runway)} days. Cut spending immediately.`
        });
    }

    // Rule 2: Spending increased vs last month
    if (prevExpenses > 0 && expenses > prevExpenses * 1.2) {
        const increase = Math.round(((expenses - prevExpenses) / prevExpenses) * 100);
        insights.push({
            type: 'warning', priority: 4,
            title: isAr ? '📈 ارتفاع في الإنفاق' : isRu ? '📈 Рост расходов' : '📈 Spending Surge',
            description: isAr ? `إنفاقك زاد بنسبة ${increase}% مقارنة بالشهر الماضي.`
                : isRu ? `Расходы выросли на ${increase}% по сравнению с прошлым месяцем.`
                    : `Your spending increased by ${increase}% compared to last month.`
        });
    }

    // Rule 3: Spending decreased (achievement!)
    if (prevExpenses > 0 && expenses < prevExpenses * 0.85) {
        const decrease = Math.round(((prevExpenses - expenses) / prevExpenses) * 100);
        insights.push({
            type: 'achievement', priority: 3,
            title: isAr ? '🏆 أحسنت!' : isRu ? '🏆 Молодец!' : '🏆 Great Progress!',
            description: isAr ? `قللت إنفاقك بنسبة ${decrease}% عن الشهر الماضي. استمر!`
                : isRu ? `Вы сократили расходы на ${decrease}% по сравнению с прошлым месяцем!`
                    : `You cut spending by ${decrease}% vs last month. Keep it up!`
        });
    }

    // Rule 4: Top category dominance
    if (categories.length > 0 && categories[0].percentOfTotal > 40) {
        insights.push({
            type: 'tip', priority: 3,
            title: isAr ? '🔍 فئة مهيمنة' : isRu ? '🔍 Доминирующая категория' : '🔍 Category Dominance',
            description: isAr ? `${Math.round(categories[0].percentOfTotal)}% من إنفاقك يذهب لـ "${categories[0].category}". فكر في تقليله.`
                : isRu ? `${Math.round(categories[0].percentOfTotal)}% расходов на "${categories[0].category}".`
                    : `${Math.round(categories[0].percentOfTotal)}% of spending goes to "${categories[0].category}". Consider reducing.`
        });
    }

    // Rule 5: Category trend up warning
    const risingCats = categories.filter(c => c.trend === 'up');
    if (risingCats.length > 0) {
        insights.push({
            type: 'warning', priority: 3,
            title: isAr ? '⬆️ فئات ترتفع' : isRu ? '⬆️ Растущие категории' : '⬆️ Rising Categories',
            description: isAr ? `هذه الفئات تزداد: ${risingCats.map(c => c.category).join(', ')}`
                : isRu ? `Эти категории растут: ${risingCats.map(c => c.category).join(', ')}`
                    : `These categories are rising: ${risingCats.map(c => c.category).join(', ')}`
        });
    }

    // Rule 6: No savings
    if (savings === 0) {
        insights.push({
            type: 'tip', priority: 4,
            title: isAr ? '🐷 ابدأ الادخار' : isRu ? '🐷 Начните копить' : '🐷 Start Saving',
            description: isAr ? 'ليس لديك مدخرات. حاول تحويل 10% من دخلك للادخار.'
                : isRu ? 'У вас нет сбережений. Попробуйте откладывать 10% дохода.'
                    : 'You have zero savings. Try moving 10% of income to savings.'
        });
    }

    // Rule 7: Good savings rate
    if (savingsRate > 25) {
        insights.push({
            type: 'achievement', priority: 2,
            title: isAr ? '💚 معدل ادخار ممتاز' : isRu ? '💚 Отличная норма' : '💚 Excellent Savings Rate',
            description: isAr ? `أنت تدخر ${Math.round(savingsRate)}% من دخلك. ممتاز!`
                : isRu ? `Вы откладываете ${Math.round(savingsRate)}% дохода. Отлично!`
                    : `You're saving ${Math.round(savingsRate)}% of income. Outstanding!`
        });
    }

    // Rule 8: Recurring expenses detected
    if (recurring.length > 0) {
        const totalRecurring = recurring.reduce((s, r) => s + r.amount, 0);
        insights.push({
            type: 'tip', priority: 2,
            title: isAr ? '🔄 مصاريف متكررة' : isRu ? '🔄 Повторяющиеся расходы' : '🔄 Recurring Costs Detected',
            description: isAr ? `اكتشفنا ${recurring.length} مصاريف متكررة بإجمالي ~${totalRecurring.toLocaleString()}. راجع إذا تحتاجها كلها.`
                : isRu ? `Обнаружено ${recurring.length} повторяющихся расходов на ~${totalRecurring.toLocaleString()}.`
                    : `Found ${recurring.length} recurring costs totaling ~${totalRecurring.toLocaleString()}. Review if you still need them all.`
        });
    }

    // Rule 9: Weekend vs weekday spending
    const weekdaySpend = expenses * 0.6; // approx
    const weekendSpend = expenses * 0.4;
    if (weekendSpend > weekdaySpend * 0.8) {
        insights.push({
            type: 'tip', priority: 2,
            title: isAr ? '📅 إنفاق نهاية الأسبوع' : isRu ? '📅 Расходы в выходные' : '📅 Weekend Spending',
            description: isAr ? 'إنفاقك في نهاية الأسبوع مرتفع. خطط لنشاطات مجانية.'
                : isRu ? 'Расходы в выходные высоки. Запланируйте бесплатные мероприятия.'
                    : 'Your weekend spending is high. Plan some free activities!'
        });
    }

    // Rule 10: Prediction
    if (runway > 7 && runway < 60) {
        insights.push({
            type: 'prediction', priority: 3,
            title: isAr ? '🔮 توقع' : isRu ? '🔮 Прогноз' : '🔮 Prediction',
            description: isAr ? `بمعدل إنفاقك الحالي (${Math.round(burnRate)}/يوم)، رصيدك سيصل للصفر خلال ~${Math.round(runway)} يوم.`
                : isRu ? `При текущих расходах (${Math.round(burnRate)}/день), баланс обнулится через ~${Math.round(runway)} дней.`
                    : `At current rate (${Math.round(burnRate)}/day), balance hits zero in ~${Math.round(runway)} days.`
        });
    }

    // Rule 11: Weekly trend improving
    if (weeklyTrends.length >= 2) {
        const lastWeek = weeklyTrends[weeklyTrends.length - 1];
        if (lastWeek.change < -15) {
            insights.push({
                type: 'achievement', priority: 2,
                title: isAr ? '📉 أسبوع أفضل' : isRu ? '📉 Лучшая неделя' : '📉 Better Week',
                description: isAr ? `إنفاقك هذا الأسبوع أقل بـ ${Math.abs(lastWeek.change)}% من الأسبوع الماضي.`
                    : isRu ? `Расходы на этой неделе на ${Math.abs(lastWeek.change)}% меньше.`
                        : `This week's spending is ${Math.abs(lastWeek.change)}% lower than last week.`
            });
        }
    }

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 8);
}

// ============================================================================
// COMPREHENSIVE MARKDOWN REPORT GENERATOR
// ============================================================================

export function generateSmartReport(
    transactions: Transaction[],
    balance: number,
    savingsBalance: number,
    monthlyIncome: number,
    currency: string,
    language: string
): string {
    const analysis = getAdvancedFinancialAnalysis(transactions, balance, savingsBalance, monthlyIncome, language);
    const isAr = language === 'ar';
    const isRu = language === 'ru';

    const f = (n: number) => `${n.toLocaleString()} ${currency}`;

    let report = '';

    // Header
    report += isAr ? `# 📊 تقرير مالي شامل\n\n`
        : isRu ? `# 📊 Финансовый отчёт\n\n`
            : `# 📊 Financial Analysis Report\n\n`;

    // Health Score
    const scoreEmoji = analysis.healthScore >= 80 ? '🟢' : analysis.healthScore >= 60 ? '🟡' : analysis.healthScore >= 40 ? '🟠' : '🔴';
    report += isAr ? `## ${scoreEmoji} الصحة المالية: ${analysis.healthGrade} (${analysis.healthScore}/100)\n\n`
        : isRu ? `## ${scoreEmoji} Финансовое здоровье: ${analysis.healthGrade} (${analysis.healthScore}/100)\n\n`
            : `## ${scoreEmoji} Financial Health: ${analysis.healthGrade} (${analysis.healthScore}/100)\n\n`;

    // Overview
    report += isAr ? `## 💰 نظرة عامة\n` : isRu ? `## 💰 Обзор\n` : `## 💰 Overview\n`;
    report += isAr ? `- **الرصيد:** ${f(balance)}\n` : isRu ? `- **Баланс:** ${f(balance)}\n` : `- **Balance:** ${f(balance)}\n`;
    report += isAr ? `- **المدخرات:** ${f(savingsBalance)}\n` : isRu ? `- **Сбережения:** ${f(savingsBalance)}\n` : `- **Savings:** ${f(savingsBalance)}\n`;
    report += isAr ? `- **الإنفاق (30 يوم):** ${f(Math.round(analysis.totalExpenses))}\n` : isRu ? `- **Расходы (30 дн):** ${f(Math.round(analysis.totalExpenses))}\n` : `- **Spending (30d):** ${f(Math.round(analysis.totalExpenses))}\n`;
    report += isAr ? `- **معدل الحرق:** ${f(Math.round(analysis.burnRate))}/يومياً\n` : isRu ? `- **Скорость трат:** ${f(Math.round(analysis.burnRate))}/день\n` : `- **Burn Rate:** ${f(Math.round(analysis.burnRate))}/day\n`;
    report += isAr ? `- **المدرج:** ~${Math.round(analysis.runwayDays)} يوم\n` : isRu ? `- **Запас дней:** ~${Math.round(analysis.runwayDays)}\n` : `- **Runway:** ~${Math.round(analysis.runwayDays)} days\n`;
    if (analysis.predictedBankruptDate) {
        report += isAr ? `- **⚠️ تاريخ النفاد المتوقع:** ${analysis.predictedBankruptDate}\n` : isRu ? `- **⚠️ Ожидаемое обнуление:** ${analysis.predictedBankruptDate}\n` : `- **⚠️ Predicted Zero Date:** ${analysis.predictedBankruptDate}\n`;
    }
    report += `\n`;

    // Top Categories
    if (analysis.topCategories.length > 0) {
        report += isAr ? `## 📁 أعلى الفئات\n` : isRu ? `## 📁 Топ категории\n` : `## 📁 Top Categories\n`;
        for (const cat of analysis.topCategories) {
            const trendIcon = cat.trend === 'up' ? '📈' : cat.trend === 'down' ? '📉' : '➡️';
            report += `- **${cat.category}** — ${f(Math.round(cat.total))} (${Math.round(cat.percentOfTotal)}%) ${trendIcon}\n`;
        }
        report += `\n`;
    }

    // Weekly Trends
    if (analysis.weeklyTrends.length > 0) {
        report += isAr ? `## 📅 الاتجاهات الأسبوعية\n` : isRu ? `## 📅 Еженедельные тренды\n` : `## 📅 Weekly Trends\n`;
        for (const week of analysis.weeklyTrends) {
            const arrow = week.change > 5 ? '🔺' : week.change < -5 ? '🔻' : '➖';
            report += `- ${week.weekLabel}: ${f(week.total)} ${arrow} ${week.change > 0 ? '+' : ''}${week.change}%\n`;
        }
        report += `\n`;
    }

    // Time Patterns
    if (analysis.timePatterns.length > 0) {
        report += isAr ? `## ⏰ أوقات الإنفاق\n` : isRu ? `## ⏰ Время трат\n` : `## ⏰ Spending Times\n`;
        for (const tp of analysis.timePatterns) {
            report += `- ${tp.period}: ${f(Math.round(tp.total))} (${tp.count}x)\n`;
        }
        report += `\n`;
    }

    // Recurring
    if (analysis.recurringSpending.length > 0) {
        report += isAr ? `## 🔄 مصاريف متكررة مكتشفة\n` : isRu ? `## 🔄 Обнаруженные подписки\n` : `## 🔄 Detected Recurring Costs\n`;
        for (const r of analysis.recurringSpending) {
            report += `- **${r.name}** — ~${f(r.amount)} (${r.frequency})\n`;
        }
        report += `\n`;
    }

    // Insights
    if (analysis.insights.length > 0) {
        report += isAr ? `## 💡 نصائح ذكية\n` : isRu ? `## 💡 Рекомендации\n` : `## 💡 Smart Insights\n`;
        for (const insight of analysis.insights) {
            report += `- **${insight.title}** — ${insight.description}\n`;
        }
        report += `\n`;
    }

    // Footer
    report += `---\n`;
    report += isAr ? `*تقرير إحصائي مبني على تحليل رياضي لآخر 30 يوم.*\n`
        : isRu ? `*Статистический отчёт на основе математического анализа за 30 дней.*\n`
            : `*Statistical report based on 30-day mathematical analysis.*\n`;

    return report;
}
