import { GoogleGenAI } from "@google/genai";
import { Transaction, TransactionType } from "../types";

export interface ReceiptAnalysisResult {
  amount: number;
  date: string;
  vendor: string;
  category: string;
  type: TransactionType;
}

export interface MagicInputResult {
  amount: number;
  category: string;
  vendor: string;
  date: string;
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

// --- 1. Magic Input Analysis ---
export const parseMagicInput = async (
  text: string, 
  apiKey: string, 
  language: string
): Promise<MagicInputResult> => {
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze this financial text: "${text}".
    Extract:
    1. Amount (number)
    2. Category (Infer strictly from the list below).
    3. Vendor (e.g. "KFC", "Uber", "Boss")
    4. Type (expense or income)
    5. Date (YYYY-MM-DD) - Default to today ${new Date().toISOString().split('T')[0]} if not specified.

    Language context: ${language}.
    
    ALLOWED CATEGORIES (IDs):
    food, groceries, transport, housing, utilities, health, education, travel, entertainment, shopping, personal_care, subscriptions, debt, gifts, salary, transfer, general.

    RULES:
    - If it's a utility bill (electricity, internet, water), use 'utilities'.
    - If it doesn't fit specific categories, use 'general'.
    - Do NOT invent new categories.

    Return JSON: { "amount": number, "category": string, "vendor": string, "type": "expense"|"income", "date": "YYYY-MM-DD" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    });
    return JSON.parse(cleanJson(response.text || '{}')) as MagicInputResult;
  } catch (e) {
    throw new Error("Magic input failed");
  }
};

// --- 2. Deep Financial Analysis ---
export const getDeepFinancialAnalysis = async (
  transactions: Transaction[],
  balance: number,
  currency: string,
  language: string,
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });

  const summary = {
    currentBalance: balance,
    currency,
    transactions: transactions.slice(0, 30).map(t => ({
      date: t.date,
      amount: t.amount,
      cat: t.category,
      type: t.type
    }))
  };

  const prompt = `
    Act as a senior financial advisor.
    Data: ${JSON.stringify(summary)}
    
    Task: Provide a strict, professional report.
    1. **Status**: Health check.
    2. **Burn Rate**: When will money run out?
    3. **Leaks**: Identify bad spending habits.
    4. **Advice**: 3 actionable steps.

    Language: ${language === 'ar' ? 'Arabic' : 'English'}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    });
    return response.text || "Report generation failed.";
  } catch (primaryError) {
    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [{ text: prompt }] },
        });
        return response.text || "Fallback report failed.";
    } catch (e) { throw e; }
  }
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  const ai = new GoogleGenAI({ apiKey });
  try {
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: 'Test' }] },
    });
    return true;
  } catch {
    try {
        await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [{ text: 'Test' }] },
        });
        return true;
    } catch { return false; }
  }
};

// --- 3. Onboarding Analysis ---
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
    Analyze these financial images for onboarding.
    1. Image 1 (Balance): Extract the total available balance number.
    2. Image 2 (Salary Slip/Notif): CRITICAL -> Extract the AMOUNT and the EXACT DATE of payment (YYYY-MM-DD).
    3. Others: Receipts/Expenses.

    Language: ${language}.
    
    ALLOWED CATEGORIES for transactions:
    food, groceries, transport, housing, utilities, health, education, travel, entertainment, shopping, personal_care, subscriptions, debt, gifts, salary, transfer, general.

    RULES:
    - Map expenses STRICTLY to the list above.
    - Use 'general' if unclear. Do NOT default to 'utilities' unless it's a bill.

    Return strictly JSON:
    {
      "currentBalance": number,
      "lastSalary": { "amount": number, "date": "YYYY-MM-DD" },
      "transactions": [{ "amount": number, "date": "YYYY-MM-DD", "vendor": string, "category": string, "type": "expense" | "income" }]
    }
  `;

  if (balanceFile) parts.push(await fileToGenerativePart(balanceFile));
  if (salaryFile) parts.push(await fileToGenerativePart(salaryFile));
  for (const file of expenseFiles) parts.push(await fileToGenerativePart(file));
  parts.push({ text: promptContext });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    const result = JSON.parse(cleanJson(response.text || '{}')) as OnboardingAnalysisResult;
    result.transactions = result.transactions.map(t => ({ ...t, category: t.category.toLowerCase() }));
    return result;
  } catch (primaryError) {
    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts },
        });
        const result = JSON.parse(cleanJson(response.text || '{}')) as OnboardingAnalysisResult;
        result.transactions = result.transactions.map(t => ({ ...t, category: t.category.toLowerCase() }));
        return result;
    } catch (e) { throw e; }
  }
};

// --- 4. Receipt Analysis ---
export const analyzeReceipt = async (
  file: File, 
  apiKey: string,
  language: string
): Promise<ReceiptAnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(file);

  const prompt = `
    Analyze this receipt/invoice.
    Extract:
    1. Amount (number)
    2. Date (YYYY-MM-DD)
    3. Vendor Name
    4. Category (Choose STRICTLY from the list below).
    5. Type (income/expense)

    ALLOWED CATEGORIES:
    food, groceries, transport, housing, utilities, health, education, travel, entertainment, shopping, personal_care, subscriptions, debt, gifts, salary, transfer, general.

    CRITICAL RULES:
    - Use 'utilities' ONLY for: Electricity, Water, Internet, Phone bills.
    - Use 'food' for restaurants, 'groceries' for supermarkets.
    - If unsure, use 'general'.

    Return JSON: { "amount": number, "date": "YYYY-MM-DD", "vendor": string, "category": string, "type": "income"|"expense" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    const result = JSON.parse(cleanJson(response.text || '{}')) as ReceiptAnalysisResult;
    if (result.category) result.category = result.category.toLowerCase();
    return result;
  } catch (primaryError) {
    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [imagePart, { text: prompt }] },
        });
        const result = JSON.parse(cleanJson(response.text || '{}')) as ReceiptAnalysisResult;
        if (result.category) result.category = result.category.toLowerCase();
        return result;
    } catch (e) { throw e; }
  }
};