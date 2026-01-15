import { GoogleGenAI } from "@google/genai";
import { Transaction, TransactionType } from "../types";

export interface ReceiptAnalysisResult {
  amount: number;
  date: string;
  vendor: string;
  category: string;
  type: TransactionType;
}

export interface OnboardingAnalysisResult {
  currentBalance: number;
  lastSalary: {
    amount: number;
    date: string;
  };
  transactions: {
    amount: number;
    date: string;
    vendor: string;
    category: string;
    type: 'expense' | 'income';
  }[];
  salaryFrequencyInferred: 'monthly' | 'weekly' | 'bi-weekly';
}

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

const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- New Feature: Deep Financial Analysis ---
export const getDeepFinancialAnalysis = async (
  transactions: Transaction[],
  balance: number,
  currency: string,
  language: string,
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });

  const expenses = transactions.filter(t => t.type === 'expense');
  const income = transactions.filter(t => t.type === 'income');

  // Prepare a summary for the prompt (to avoid token limits if many txs)
  const summary = {
    currentBalance: balance,
    currency,
    totalExpenses: expenses.reduce((sum, t) => sum + t.amount, 0),
    totalIncome: income.reduce((sum, t) => sum + t.amount, 0),
    transactionCount: transactions.length,
    recentTransactions: transactions.slice(0, 20).map(t => ({
      date: t.date,
      amount: t.amount,
      category: t.category,
      vendor: t.vendor,
      type: t.type
    }))
  };

  const prompt = `
    Act as a professional senior financial advisor. I am providing you with my financial data summary.
    
    Data:
    ${JSON.stringify(summary, null, 2)}

    Your task is to generate a professional, strict, and constructive report.
    
    Structure of the report (Use Markdown):
    1. **Executive Summary**: Brief health check of my finances.
    2. **Spending Patterns & Mistakes**: Identify 3 specific mistakes I am making based on the categories and vendors. Be direct.
    3. **Cash Flow Analysis**: Analyze my income vs expense ratio.
    4. **Actionable Recommendations**: Give me 3 concrete steps to save money immediately.

    Tone: Professional, slightly strict but helpful.
    Language: ${language === 'ar' ? 'Arabic' : language === 'ru' ? 'Russian' : 'English'}.
  `;

  try {
    // Attempt Primary Model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    });
    return response.text || "Could not generate report.";
  } catch (primaryError) {
    console.warn("Primary model (gemini-3-flash-preview) failed. Switching to fallback (gemini-2.5-flash).", primaryError);
    try {
      // Attempt Fallback Model
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
      });
      return response.text || "Could not generate report from fallback.";
    } catch (fallbackError) {
      console.error("Deep Analysis Error (Both models failed):", fallbackError);
      throw fallbackError;
    }
  }
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    // Primary
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: 'Test' }] },
    });
    return true;
  } catch (primaryError) {
    console.warn("API Key Validation: Primary model failed, trying fallback.", primaryError);
    try {
      // Fallback
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: 'Test' }] },
      });
      return true;
    } catch (fallbackError) {
      console.error("API Key Validation Error (Both models failed):", fallbackError);
      return false;
    }
  }
};

export const analyzeOnboardingData = async (
  balanceFile: File | null,
  salaryFile: File | null,
  expenseFiles: File[],
  apiKey: string,
  language: string
): Promise<OnboardingAnalysisResult> => {
  
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];
  
  let promptContext = `
    You are a financial AI assistant. I am providing you with several images to set up my financial profile.
    1. The FIRST image provided is my CURRENT BANK BALANCE screenshot. Extract the total available balance.
    2. The SECOND image provided is my LAST SALARY SLIP/NOTIFICATION. Extract the amount and the date it was received.
    3. The REMAINING images are RECEIPTS/EXPENSES. Extract the details for each transaction.
    Based on the salary date and expenses, infer if I am paid monthly, weekly, or bi-weekly.
    Language context: ${language}.
    IMPORTANT: Return the result strictly as valid JSON. Do not use Markdown formatting.
    The categories must be strictly one of: food, groceries, transport, housing, utilities, health, education, travel, gifts.
    The JSON structure must be:
    {
      "currentBalance": number,
      "lastSalary": { "amount": number, "date": "YYYY-MM-DD" },
      "transactions": [{ "amount": number, "date": "YYYY-MM-DD", "vendor": string, "category": string, "type": "expense" | "income" }],
      "salaryFrequencyInferred": "monthly" | "weekly" | "bi-weekly"
    }
  `;

  if (balanceFile) {
    parts.push(await fileToGenerativePart(balanceFile));
    promptContext += " (Image 1: Balance)";
  }
  if (salaryFile) {
    parts.push(await fileToGenerativePart(salaryFile));
    promptContext += " (Image 2: Salary)";
  }
  for (const file of expenseFiles) {
    parts.push(await fileToGenerativePart(file));
  }

  parts.push({ text: promptContext });

  try {
    // Primary
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    const text = response.text;
    if (!text) throw new Error("No response from primary model");
    const jsonString = cleanJson(text);
    const result = JSON.parse(jsonString) as OnboardingAnalysisResult;
    result.transactions = result.transactions.map(t => ({ ...t, category: t.category.toLowerCase() }));
    return result;
  } catch (primaryError) {
    console.warn("Onboarding Analysis: Primary model failed, trying fallback (gemini-2.5-flash).", primaryError);
    try {
       // Fallback
       const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
      });
      const text = response.text;
      if (!text) throw new Error("No response from fallback model");
      const jsonString = cleanJson(text);
      const result = JSON.parse(jsonString) as OnboardingAnalysisResult;
      result.transactions = result.transactions.map(t => ({ ...t, category: t.category.toLowerCase() }));
      return result;
    } catch (fallbackError) {
       console.error("Onboarding Analysis Error (Both models failed):", fallbackError);
       throw fallbackError;
    }
  }
};

export const analyzeReceipt = async (
  file: File, 
  apiKey: string,
  language: string
): Promise<ReceiptAnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(file);

  const prompt = `
    Analyze this receipt image. 
    Extract the total amount, the date (YYYY-MM-DD format), the vendor/merchant name, and categorize the expense.
    Determine if it is an INCOME or EXPENSE.
    The category should be one of: food, groceries, transport, housing, utilities, health, education, travel, gifts. If unsure, use 'utilities'.
    Language context is ${language}.
    IMPORTANT: Return the result strictly as valid JSON.
    {
      "amount": number,
      "date": "YYYY-MM-DD",
      "vendor": string,
      "category": string,
      "type": "income" | "expense"
    }
  `;

  try {
    // Primary
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    const text = response.text;
    if (!text) throw new Error("No response from primary AI");
    const jsonString = cleanJson(text);
    const result = JSON.parse(jsonString) as ReceiptAnalysisResult;
    if (result.category) { result.category = result.category.toLowerCase(); }
    return result;
  } catch (primaryError) {
    console.warn("Receipt Analysis: Primary model failed, trying fallback (gemini-2.5-flash).", primaryError);
    try {
      // Fallback
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
      });
      const text = response.text;
      if (!text) throw new Error("No response from fallback AI");
      const jsonString = cleanJson(text);
      const result = JSON.parse(jsonString) as ReceiptAnalysisResult;
      if (result.category) { result.category = result.category.toLowerCase(); }
      return result;
    } catch (fallbackError) {
      console.error("Gemini Analysis Error (Both models failed):", fallbackError);
      throw fallbackError;
    }
  }
};