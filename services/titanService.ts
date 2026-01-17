import { GoogleGenAI } from "@google/genai";
import { Transaction, UserSettings, TitanAnalysis } from "../types";

const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// Helper for image processing
const fileToGenerativePart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- 1. Vision: Extract Item & Price ---
export const extractItemFromImage = async (
  file: File,
  apiKey: string
): Promise<{ name: string; price: number }> => {
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(file);

  const prompt = `
    Analyze this image (price tag, product page, or receipt).
    Extract:
    1. Item Name (short and concise, e.g., "Sony Headphones").
    2. Price (numeric value only, ignore currency symbol).

    Return STRICT JSON: { "name": "string", "price": number }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (error) {
    console.error("Titan Vision Error:", error);
    throw new Error("Failed to scan image.");
  }
};

// --- 2. Titan Core: Multiverse Analysis ---
export const analyzeMultiverse = async (
  user: UserSettings,
  history: Transaction[],
  itemName: string,
  itemPrice: number
): Promise<TitanAnalysis> => {
  if (!user.apiKey) throw new Error("API Key missing");
  
  const ai = new GoogleGenAI({ apiKey: user.apiKey });

  // 1. Analyze Real Habits (Not Assumptions)
  const expenseStats: Record<string, number> = {};
  history.filter(t => t.type === 'expense').forEach(t => {
      const key = t.vendor ? t.vendor : t.category;
      expenseStats[key] = (expenseStats[key] || 0) + t.amount;
  });
  
  // Get top 3 money leaks
  const topHabits = Object.entries(expenseStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, amount]) => `${name} (${amount})`)
      .join(', ');

  // 2. Prepare Financial Context
  const today = new Date().toISOString().split('T')[0];
  const monthlyBills = user.recurringBills?.reduce((sum, b) => sum + b.amount, 0) || 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const spendingHistory = history
    .filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  const context = {
    spendingBalance: user.currentBalance, // Spending Wallet
    savingsBalance: user.savingsBalance, // Savings Wallet (Added)
    currency: user.currency,
    salary: user.lastSalaryAmount || 0,
    salaryDate: user.nextSalaryDate || "Unknown",
    monthlyFixedBills: monthlyBills,
    avgMonthlySpending: spendingHistory,
    topHabits: topHabits || "General Spending", 
    itemToBuy: itemName,
    itemPrice: itemPrice,
    today: today,
    language: user.language
  };

  const prompt = `
    Act as a "Titan Financial Simulator". I want to simulate the impact of buying "${itemName}" for ${itemPrice} ${user.currency}.
    
    Context: ${JSON.stringify(context)}
    
    CRITICAL INSTRUCTIONS:
    1. **Language**: The output JSON values MUST be in ${user.language === 'ar' ? 'Arabic' : user.language === 'ru' ? 'Russian' : 'English'}.
    2. **Habits**: Use "topHabits" (${context.topHabits}) for specific sacrifice suggestions.
    3. **Wallets Logic**: 
       - User has "Spending Wallet" (${context.spendingBalance}) and "Savings Wallet" (${context.savingsBalance}).
       - If 'itemPrice' > 'spendingBalance', the purchase implies **dipping into SAVINGS**. This is a major risk. Mention it in "Risks" and "The Collapse" description.
       - In "Wealth" scenario, simulate adding 'itemPrice' TO the existing 'savingsBalance' to show total potential growth (Compound interest effect on the total nest egg).
    
    Task: Generate a JSON report with 3 distinct timelines (3 months projection) and life energy analysis.

    1. **Scenario 1: Collapse (Red)**
       - User buys the item NOW.
       - If spending balance drops below 0, show it dropping into negative or indicate Savings depletion.
       - Event Label: "Savings Breach ⚠️" if savings are touched.
    
    2. **Scenario 2: Warrior (Yellow)**
       - User buys the item NOW.
       - But adopts "Austerity Mode" to recover the spent amount without touching savings if possible.
    
    3. **Scenario 3: Wealth (Green)**
       - User DOES NOT buy.
       - User invests this amount + keeps existing savings.
       - Show the trajectory of TOTAL Savings (${context.savingsBalance} + ${itemPrice}) growing over 3 months.

    4. **Life Energy**:
       - Calculate hours of work based on salary (${context.salary}). 
       - Suggest a SPECIFIC sacrifice based on "topHabits".

    5. **Risks**:
       - Will buying this cause missing a bill? (Bills total: ${monthlyBills}).
       - Will this break the savings lock?

    Return STRICT JSON matching this interface:
    {
      "scenarios": [
        { 
            "id": "collapse", 
            "name": "Name in User Lang", 
            "description": "Description in User Lang (Mention savings breach if applicable)", 
            "color": "#EF4444", 
            "finalBalance": number,
            "timeline": [{"date": "YYYY-MM-DD", "balance": number, "event": string | null}] 
        },
        { 
            "id": "warrior", 
            "name": "Name in User Lang", 
            "description": "Description in User Lang", 
            "color": "#EAB308", 
            "finalBalance": number,
            "timeline": [...] 
        },
        { 
            "id": "wealth", 
            "name": "Name in User Lang", 
            "description": "Description in User Lang", 
            "color": "#22C55E", 
            "finalBalance": number,
            "timeline": [...] 
        }
      ],
      "risks": [
        { "billName": string, "date": string, "severity": "high"|"critical", "message": "Message in User Lang" }
      ],
      "lifeEnergy": {
        "hoursOfWork": number,
        "daysOfLife": number,
        "sacrifice": "Sacrifice Advice in User Lang"
      },
      "aiVerdict": "Short advice in User Lang (max 20 words)."
    }

    Generate 10-15 timeline points per scenario.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    });

    const text = response.text || "{}";
    return JSON.parse(cleanJson(text)) as TitanAnalysis;
    
  } catch (error) {
    console.error("Titan Service Error:", error);
    throw new Error("Titan Simulation Failed.");
  }
};