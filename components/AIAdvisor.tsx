import React, { useState } from 'react';
import { Transaction, UserSettings } from '../types';
import { getDeepFinancialAnalysis } from '../services/geminiService';
import { BrainCircuit, Loader2, X, Download, Lock } from 'lucide-react';
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
    // Guest check
    if (user.isGuest || !user.apiKey) {
        return;
    }

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

  // Trigger generation on mount if not exists and not guest
  React.useEffect(() => {
    if (!report && !user.isGuest) generateReport();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-10">
      <div className="max-w-2xl mx-auto mt-10 mb-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-sber-green rounded-2xl flex items-center justify-center shadow-lg shadow-sber-green/20">
                <BrainCircuit className="text-white w-6 h-6" />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-white">
                 {user.language === 'ar' ? 'المستشار المالي الذكي' : user.language === 'ru' ? 'Финансовый советник' : 'AI Financial Advisor'}
               </h2>
               <p className="text-xs text-gray-400">Powered by Gemini</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {user.isGuest ? (
             <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                    <Lock className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Feature Locked</h3>
                <p className="text-gray-400 max-w-sm">
                    {user.language === 'ar' 
                     ? 'المستشار المالي الذكي يحتاج إلى مفتاح API. يرجى إضافته من الإعدادات.' 
                     : 'The AI Advisor requires a valid Gemini API Key. Please add one in Settings to unlock this feature.'}
                </p>
                <button 
                  onClick={onClose}
                  className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-700"
                >
                  Close
                </button>
             </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <Loader2 className="w-16 h-16 text-sber-green animate-spin" />
            <p className="text-gray-400 animate-pulse text-center max-w-xs">
              {user.language === 'ar' 
                ? 'جاري تحليل نفقاتك، وكشف الأخطاء، وإعداد خطة احترافية...' 
                : 'Analyzing your spending patterns, finding mistakes, and generating a professional report...'}
            </p>
          </div>
        ) : (
          <div className="bg-sber-card border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <div className={`prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-sber-green max-w-none ${user.language === 'ar' ? 'text-right' : 'text-left'}`} dir={user.language === 'ar' ? 'rtl' : 'ltr'}>
                <ReactMarkdown
                   components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-sber-green mb-4 border-b border-zinc-700 pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-8 mb-4 flex items-center gap-2 before:content-['•'] before:text-sber-green" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 text-gray-300 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800" {...props} />,
                      li: ({node, ...props}) => <li className="marker:text-sber-green" {...props} />,
                      strong: ({node, ...props}) => <strong className="text-sber-green font-bold bg-sber-green/10 px-1 rounded" {...props} />,
                   }}
                >
                  {report || ''}
                </ReactMarkdown>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button 
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl border border-zinc-700"
              >
                  <Download className="w-5 h-5" />
                  {t.download_report}
              </button>
              <button 
                  onClick={onClose}
                  className="flex-1 bg-sber-green hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-sber-green/20"
              >
                  {t.close_report}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};