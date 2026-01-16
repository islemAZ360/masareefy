import React, { useState, useEffect } from 'react';
import { UserSettings, Transaction } from '../types';
import { getDeepFinancialAnalysis } from '../services/geminiService';
import { BrainCircuit, Loader2, X, Download, Lock, Sparkles, ChevronRight, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TRANSLATIONS } from '../constants';

interface Props {
  user: UserSettings;
  transactions: Transaction[];
  onClose: () => void;
}

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
    link.download = `Masareefy_Report_${new Date().toISOString().split('T')[0]}.md`;
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
        className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-300" 
        onClick={onClose}
      />

      {/* Main Card */}
      <div className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 duration-500">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1C1C1E]/50 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Bot className="text-white w-7 h-7" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 {user.language === 'ar' ? 'المستشار المالي' : 'AI Financial Advisor'}
                 <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/10 font-mono">BETA</span>
               </h2>
               <p className="text-xs text-gray-400">Powered by Gemini 2.0</p>
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
        <div className="overflow-y-auto p-6 scrollbar-hide">
            {user.isGuest || !user.apiKey ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                        <Lock className="w-10 h-10 text-zinc-600" />
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
                <div className="flex flex-col items-center justify-center py-24 space-y-8">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-indigo-500/30 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                        <Sparkles className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                    </div>
                    <p className="text-gray-400 animate-pulse text-sm text-center max-w-xs font-medium">
                        {user.language === 'ar' 
                            ? 'جاري تحليل نفقاتك، وكشف الأخطاء، وإعداد خطة احترافية...' 
                            : 'Analyzing spending patterns, finding leaks, and generating report...'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className={`prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-indigo-400 prose-ul:list-disc prose-li:marker:text-indigo-500 max-w-none ${user.language === 'ar' ? 'text-right' : 'text-left'}`} dir={user.language === 'ar' ? 'rtl' : 'ltr'}>
                        <ReactMarkdown
                            components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mb-6 pb-4 border-b border-white/10 flex items-center gap-2" {...props} />,
                                h2: ({node, ...props}) => <div className="mt-8 mb-4 flex items-center gap-3"><div className="w-1 h-6 bg-indigo-500 rounded-full"></div><h2 className="text-lg font-bold text-white m-0" {...props} /></div>,
                                ul: ({node, ...props}) => <ul className="bg-[#1C1C1E] p-5 rounded-2xl border border-white/5 space-y-2 my-4" {...props} />,
                                li: ({node, ...props}) => <li className="text-sm text-gray-300 pl-2" {...props} />,
                                strong: ({node, ...props}) => <strong className="text-indigo-300 font-bold" {...props} />,
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
            <div className="p-6 border-t border-white/5 bg-[#1C1C1E]/80 backdrop-blur-md flex gap-4">
                <button 
                    onClick={handleDownload}
                    className="flex-1 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white font-bold py-4 rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Download size={18} />
                    {t.download_report}
                </button>
                <button 
                    onClick={onClose}
                    className="flex-1 bg-white text-black hover:bg-gray-200 font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    {t.close_report}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};