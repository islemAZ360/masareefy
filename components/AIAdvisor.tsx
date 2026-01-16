import React, { useState, useEffect } from 'react';
import { UserSettings, Transaction } from '../types';
import { getDeepFinancialAnalysis } from '../services/geminiService';
import { X, Download, Sparkles, Bot, RefreshCw, ChevronRight, ShieldCheck, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TRANSLATIONS } from '../constants';

interface Props {
  user: UserSettings;
  transactions: Transaction[];
  onClose: () => void;
}

const LoadingStep = ({ text, delay }: { text: string, delay: number }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    if (!visible) return null;
    return (
        <div className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-500">
            <div className="w-2 h-2 bg-sber-green rounded-full animate-pulse"></div>
            <span className="text-sm text-zinc-400 font-mono">{text}</span>
        </div>
    );
};

export const AIAdvisor: React.FC<Props> = ({ user, transactions, onClose }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = TRANSLATIONS[user.language];

  const generateReport = async () => {
    if (user.isGuest || !user.apiKey) return;

    setLoading(true);
    try {
      const result = await getDeepFinancialAnalysis(
        transactions,
        user.currentBalance,
        user.currency,
        user.language,
        user.apiKey
      );
      setReport(result);
    } catch (e) {
      setReport("Failed to generate report. Please check your API key and connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Masareefy_AI_Report_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!report && !user.isGuest) generateReport();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-500 animate-in fade-in" 
        onClick={onClose}
      />

      {/* Main Card */}
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 duration-500">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1C1C1E]/50 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-40 animate-pulse"></div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                    <Bot className="text-white w-6 h-6" />
                </div>
             </div>
             <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 Gemini Advisor
                 <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold tracking-wider">PRO</span>
               </h2>
               <p className="text-xs text-gray-400">Powered by Google AI</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 scrollbar-hide min-h-[400px]">
            {user.isGuest || !user.apiKey ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                        <ShieldCheck className="w-10 h-10 text-zinc-600" />
                    </div>
                    <div className="max-w-xs mx-auto">
                        <h3 className="text-xl font-bold text-white mb-2">Feature Locked</h3>
                        <p className="text-gray-400 text-sm">
                            {user.language === 'ar' 
                            ? 'المستشار الذكي يتطلب مفتاح API. يرجى إضافته من الإعدادات.' 
                            : 'AI Advisor requires a valid Gemini API Key. Please add one in Settings.'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-8">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-indigo-500/20 rounded-full animate-[spin_3s_linear_infinite]"></div>
                        <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-[spin_1.5s_linear_infinite]"></div>
                        <Sparkles className="absolute inset-0 m-auto text-indigo-400 animate-pulse w-8 h-8" />
                    </div>
                    
                    <div className="space-y-3 text-left w-64">
                        <LoadingStep text="Connecting to Neural Network..." delay={0} />
                        <LoadingStep text="Analyzing transaction history..." delay={1000} />
                        <LoadingStep text="Detecting spending patterns..." delay={2500} />
                        <LoadingStep text="Formulating strategic advice..." delay={4000} />
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-700">
                    <div className={`prose prose-invert max-w-none ${user.language === 'ar' ? 'text-right' : 'text-left'}`} dir={user.language === 'ar' ? 'rtl' : 'ltr'}>
                        <ReactMarkdown
                            components={{
                                // Custom Styling for Markdown Elements
                                h1: ({node, ...props}) => (
                                    <div className="mb-8 border-b border-white/10 pb-4">
                                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2" {...props} />
                                    </div>
                                ),
                                h2: ({node, ...props}) => (
                                    <div className="mt-10 mb-4 flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                            <Target className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <h2 className="text-lg font-bold text-white m-0" {...props} />
                                    </div>
                                ),
                                ul: ({node, ...props}) => <ul className="grid grid-cols-1 gap-3 my-4 list-none p-0" {...props} />,
                                li: ({node, ...props}) => (
                                    <li className="bg-[#1C1C1E] p-4 rounded-xl border border-white/5 flex items-start gap-3 hover:bg-[#252527] transition-colors">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-sber-green shrink-0"></div>
                                        <span className="text-sm text-gray-300 leading-relaxed" {...props} />
                                    </li>
                                ),
                                strong: ({node, ...props}) => <strong className="text-indigo-300 font-bold bg-indigo-500/10 px-1 rounded" {...props} />,
                                p: ({node, ...props}) => <p className="text-gray-400 text-sm leading-relaxed mb-4" {...props} />,
                            }}
                        >
                            {report || ''}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        {!loading && report && (
            <div className="p-6 border-t border-white/5 bg-[#1C1C1E]/80 backdrop-blur-md flex gap-3">
                <button 
                    onClick={generateReport}
                    className="w-14 h-14 rounded-2xl bg-[#2C2C2E] border border-white/5 flex items-center justify-center text-white hover:bg-[#3A3A3C] transition-colors"
                >
                    <RefreshCw size={20} />
                </button>
                <button 
                    onClick={handleDownload}
                    className="flex-1 bg-white text-black hover:bg-gray-200 font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Download size={20} />
                    {t.download_report}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};