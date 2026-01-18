import React, { useState, useEffect } from 'react';
import { UserSettings, Transaction } from '../types';
import { getDeepFinancialAnalysis } from '../services/geminiService';
import { X, Download, Sparkles, Bot, RefreshCw, ChevronRight, ShieldCheck, Target, BrainCircuit, Cpu } from 'lucide-react';
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
        <div className="flex items-center gap-3 animate-slide-up-fade">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_#a855f7]"></div>
            <span className="text-xs text-zinc-400 font-mono tracking-widest uppercase">{text}</span>
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
      setReport("Signal lost. Neural link failed. Check API Key.");
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
      {/* Backdrop with Blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500 animate-fade-in" 
        onClick={onClose}
      />

      {/* Main Holographic Card */}
      <div className="relative w-full max-w-2xl glass-panel rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up-fade border border-white/10">
        
        {/* Animated Header Background */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-20">
          <div className="flex items-center gap-4">
             <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-lg opacity-40 animate-pulse"></div>
                <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shadow-lg relative z-10 backdrop-blur-md">
                    <Bot className="text-purple-400 w-6 h-6" />
                </div>
             </div>
             <div>
               <h2 className="text-xl font-display font-bold text-white flex items-center gap-2 tracking-wide text-glow">
                 Gemini Advisor
                 <span className="text-[9px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold tracking-widest uppercase">PRO</span>
               </h2>
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Powered by Google AI</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full glass hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 scrollbar-hide min-h-[400px] relative z-10">
            {user.isGuest || !user.apiKey ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/5 relative">
                        <ShieldCheck className="w-10 h-10 text-zinc-500" />
                        <div className="absolute inset-0 border border-white/5 rounded-full animate-ping opacity-20"></div>
                    </div>
                    <div className="max-w-xs mx-auto">
                        <h3 className="text-xl font-display font-bold text-white mb-2">Access Restricted</h3>
                        <p className="text-zinc-500 text-sm">
                            {user.language === 'ar' 
                            ? 'المستشار الذكي يتطلب مفتاح API. يرجى إضافته من الإعدادات.' 
                            : 'AI Advisor requires a valid Gemini API Key. Please add one in Settings.'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="glass-card hover:bg-white/10 px-8 py-3 rounded-xl font-bold text-sm transition-colors text-white"
                    >
                        Close
                    </button>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-10">
                    {/* Neural Network Loader */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                        <div className="absolute inset-2 border-2 border-t-purple-500 border-r-transparent border-b-purple-500/50 border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Cpu className="text-purple-400 w-10 h-10 animate-pulse" />
                        </div>
                        {/* Orbiting particles */}
                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa] animate-ping"></div>
                    </div>
                    
                    <div className="space-y-3 text-left w-64">
                        <LoadingStep text="Initializing Neural Core..." delay={0} />
                        <LoadingStep text="Scanning Transaction Matrix..." delay={1200} />
                        <LoadingStep text="Detecting Anomalies..." delay={2800} />
                        <LoadingStep text="Synthesizing Strategy..." delay={4500} />
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-slide-up-fade">
                    <div className={`prose prose-invert max-w-none ${user.language === 'ar' ? 'text-right' : 'text-left'}`} dir={user.language === 'ar' ? 'rtl' : 'ltr'}>
                        <ReactMarkdown
                            components={{
                                h1: ({node, ...props}) => (
                                    <div className="mb-8 border-b border-white/10 pb-4">
                                        <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-2" {...props} />
                                    </div>
                                ),
                                h2: ({node, ...props}) => (
                                    <div className="mt-10 mb-4 flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <Target className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <h2 className="text-lg font-display font-bold text-white m-0 tracking-wide" {...props} />
                                    </div>
                                ),
                                ul: ({node, ...props}) => <ul className="grid grid-cols-1 gap-3 my-4 list-none p-0" {...props} />,
                                li: ({node, ...props}) => (
                                    <li className="glass-card p-4 rounded-xl border border-white/5 flex items-start gap-3 hover:bg-white/5 transition-colors group">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sber-green shadow-[0_0_8px_#22c55e] shrink-0 group-hover:scale-125 transition-transform"></div>
                                        <span className="text-sm text-zinc-300 leading-relaxed font-medium" {...props} />
                                    </li>
                                ),
                                strong: ({node, ...props}) => <strong className="text-purple-300 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded text-xs uppercase tracking-wider" {...props} />,
                                p: ({node, ...props}) => <p className="text-zinc-400 text-sm leading-relaxed mb-4" {...props} />,
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
            <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md flex gap-3 relative z-20">
                <button 
                    onClick={generateReport}
                    className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center text-zinc-400 hover:text-white transition-colors hover:bg-white/5"
                >
                    <RefreshCw size={20} />
                </button>
                <button 
                    onClick={handleDownload}
                    className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-wider text-xs"
                >
                    <Download size={18} />
                    {t.download_report}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};