import React, { useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrainCircuit, Zap, AlertTriangle, Clock, Activity, ShieldAlert, Sparkles, ChevronLeft, ScanLine, Wallet, PiggyBank, Receipt, Cpu, ChevronRight } from 'lucide-react';
import { UserSettings, Transaction, TitanAnalysis } from '../types';
import { analyzeMultiverse, extractItemFromImage } from '../services/titanService';

interface Props {
  user: UserSettings;
  transactions: Transaction[];
  onBack: () => void;
}

export const TitanSimulator: React.FC<Props> = ({ user, transactions, onBack }) => {
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<TitanAnalysis | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate stats for context bar
  const totalBills = user.recurringBills?.reduce((sum, b) => sum + b.amount, 0) || 0;

  // Local Translations
  const txt = {
      title: { en: "TITAN ENGINE", ar: "محرك التيتان", ru: "ДВИГАТЕЛЬ ТИТАН" },
      subtitle: { en: "Temporal Probability Simulator", ar: "محاكي الاحتمالات الزمنية", ru: "Симулятор вероятностей" },
      desire: { en: "Target Acquisition", ar: "تحديد الهدف الشرائي", ru: "Цель покупки" },
      itemName: { en: "Item Designation", ar: "اسم المنتج", ru: "Название товара" },
      itemPlaceholder: { en: "e.g. iPhone 16 Pro", ar: "مثلاً: آيفون 16", ru: "например, iPhone 16" },
      price: { en: "Estimated Cost", ar: "التكلفة التقديرية", ru: "Цена" },
      simulate: { en: "Initialize Simulation", ar: "بدء المحاكاة", ru: "Запуск симуляции" },
      collapsing: { en: "Collapsing Timelines...", ar: "جاري دمج المسارات الزمنية...", ru: "Анализ временных линий..." },
      scanning: { en: "Scanning Optical Data...", ar: "جاري تحليل البيانات البصرية...", ru: "Сканирование..." },
      scanBtn: { en: "Scan Tag / Product", ar: "مسح المنتج / السعر", ru: "Сканировать товар" },
      lifeEnergy: { en: "Life Energy Drain", ar: "استنزاف طاقة الحياة", ru: "Расход энергии" },
      hours: { en: "Work Hours Required", ar: "ساعات العمل المطلوبة", ru: "Часов работы" },
      trajectories: { en: "Timeline Projections", ar: "إسقاطات المسار الزمني", ru: "Проекции" },
      risks: { en: "Critical Anomalies", ar: "شذوذ مالي حرج", ru: "Критические риски" },
      verdict: { en: "AI System Verdict", ar: "حكم النظام الذكي", ru: "Вердикт системы" },
      newSim: { en: "Reset System", ar: "إعادة ضبط النظام", ru: "Сброс" },
      // Status Bar Labels
      wallet: { en: "LIQUIDITY", ar: "السيولة", ru: "ЛИКВИДНОСТЬ" },
      savings: { en: "RESERVES", ar: "الاحتياطي", ru: "РЕЗЕРВЫ" },
      bills: { en: "LIABILITIES", ar: "الالتزامات", ru: "ОБЯЗАТЕЛЬСТВА" },
  };

  const t = (key: keyof typeof txt) => txt[key][user.language];

  const handleSimulate = async () => {
    if (!item || !price) return;
    setLoading(true);
    try {
      const analysis = await analyzeMultiverse(user, transactions, item, parseFloat(price));
      setResult(analysis);
    } catch (e) {
      alert(user.language === 'ar' ? "حدث خطأ في المحرك الزمني." : "Temporal engine malfunction.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setScanning(true);
      try {
          const data = await extractItemFromImage(file, user.apiKey);
          if (data.name) setItem(data.name);
          if (data.price) setPrice(data.price.toString());
      } catch (error) {
          alert(user.language === 'ar' ? "فشل تحليل الصورة" : "Failed to scan image");
      } finally {
          setScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // Merge timelines for the chart
  const getChartData = () => {
    if (!result) return [];
    const baseTimeline = result.scenarios[0].timeline;
    
    return baseTimeline.map((point, index) => {
        const collapsePoint = result.scenarios.find(s => s.id === 'collapse')?.timeline[index];
        const warriorPoint = result.scenarios.find(s => s.id === 'warrior')?.timeline[index];
        const wealthPoint = result.scenarios.find(s => s.id === 'wealth')?.timeline[index];

        return {
            date: point.date.slice(5), // MM-DD
            Collapse: collapsePoint?.balance || 0,
            Warrior: warriorPoint?.balance || 0,
            Wealth: wealthPoint?.balance || 0,
        };
    });
  };

  const chartData = getChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-purple-500/50 p-4 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.3)] backdrop-blur-xl">
          <p className="text-purple-300 text-[10px] font-mono mb-2 tracking-widest uppercase">T-Minus: {label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-3 mb-1">
                <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}` }}></div>
                <span className="text-xs font-bold text-white w-20 uppercase tracking-wider">{p.name}</span>
                <span className="text-xs font-mono text-white tabular-nums">{Number(p.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 pb-32 relative overflow-hidden" dir={user.language === 'ar' ? 'rtl' : 'ltr'}>
        
        {/* Background Grid & Ambience */}
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-8 px-2 pt-2">
            <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors group">
                <ChevronLeft size={20} className={`text-zinc-400 group-hover:text-white transition-colors ${user.language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1">
                    <BrainCircuit className="text-purple-500 animate-pulse w-5 h-5" />
                    <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400 tracking-[0.2em] font-mono uppercase shadow-purple-500/50 drop-shadow-sm">
                        {t('title')}
                    </h2>
                </div>
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                <p className="text-[9px] text-purple-300/60 font-mono tracking-widest mt-1 uppercase">{t('subtitle')}</p>
            </div>
            <div className="w-10" />
        </div>

        {!result ? (
            <div className="relative z-10 animate-in fade-in zoom-in duration-700">
                {/* Input Card */}
                <div className="bg-[#050505]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-1 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative group overflow-hidden">
                    
                    {/* Animated Border Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-indigo-600/20 opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    
                    <div className="relative bg-[#0A0A0A] rounded-[2.3rem] p-6 overflow-hidden">
                        
                        {/* HUD Status Bar */}
                        <div className="flex justify-between items-center gap-0 mb-8 p-1 rounded-2xl bg-[#000000] border border-white/10 relative z-10 shadow-inner">
                            {/* Spending */}
                            <div className="flex-1 flex flex-col items-center py-3 border-r border-white/5 relative group/hud">
                                <span className="text-[8px] text-zinc-600 uppercase tracking-[0.2em] mb-1 flex items-center gap-1 group-hover/hud:text-purple-400 transition-colors">
                                    <Wallet size={8} /> {t('wallet')}
                                </span>
                                <span className="text-white font-bold font-mono text-xs tabular-nums tracking-wide">{user.currentBalance.toLocaleString()}</span>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-purple-500/50 opacity-0 group-hover/hud:opacity-100 transition-opacity"></div>
                            </div>
                            
                            {/* Savings */}
                            <div className="flex-1 flex flex-col items-center py-3 border-r border-white/5 relative group/hud">
                                    <span className="text-[8px] text-zinc-600 uppercase tracking-[0.2em] mb-1 flex items-center gap-1 group-hover/hud:text-sber-green transition-colors">
                                        <PiggyBank size={8} /> {t('savings')}
                                    </span>
                                    <span className="text-sber-green font-bold font-mono text-xs tabular-nums tracking-wide">{user.savingsBalance.toLocaleString()}</span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-sber-green/50 opacity-0 group-hover/hud:opacity-100 transition-opacity"></div>
                            </div>
                            
                            {/* Bills */}
                            <div className="flex-1 flex flex-col items-center py-3 relative group/hud">
                                    <span className="text-[8px] text-zinc-600 uppercase tracking-[0.2em] mb-1 flex items-center gap-1 group-hover/hud:text-red-400 transition-colors">
                                        <Receipt size={8} /> {t('bills')}
                                    </span>
                                    <span className="text-red-400 font-bold font-mono text-xs tabular-nums tracking-wide">-{totalBills.toLocaleString()}</span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-red-500/50 opacity-0 group-hover/hud:opacity-100 transition-opacity"></div>
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em] mb-2">{t('desire')}</h3>
                            <div className="w-12 h-1 bg-purple-900/30 mx-auto rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 w-1/3 animate-shimmer"></div>
                            </div>
                        </div>
                        
                        {/* Scan Button */}
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full mb-6 py-5 rounded-2xl bg-[#111] border border-white/5 flex items-center justify-center gap-3 text-zinc-400 hover:text-purple-300 hover:border-purple-500/30 hover:bg-[#151515] hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all group/scan relative z-10 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
                            {scanning ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-mono uppercase tracking-widest animate-pulse">{t('scanning')}</span>
                                </div>
                            ) : (
                                <>
                                    <ScanLine size={18} className="group-hover/scan:text-purple-400 transition-colors" />
                                    <span className="font-bold text-xs tracking-[0.2em] uppercase">{t('scanBtn')}</span>
                                </>
                            )}
                        </button>
                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleScanImage} />

                        <div className="space-y-5 relative z-10">
                            <div className="group/input">
                                <label className="text-[9px] text-zinc-600 uppercase font-bold tracking-[0.2em] mx-2 mb-1.5 block group-focus-within/input:text-purple-400 transition-colors">{t('itemName')}</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={item}
                                        onChange={e => setItem(e.target.value)}
                                        placeholder={t('itemPlaceholder')}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder-zinc-800 focus:border-purple-500 focus:shadow-[0_0_25px_rgba(168,85,247,0.2)] focus:bg-purple-900/5 outline-none transition-all font-medium"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/5 group-focus-within/input:bg-purple-500 transition-colors shadow-[0_0_10px_currentColor]"></div>
                                </div>
                            </div>

                            <div className="group/input">
                                <label className="text-[9px] text-zinc-600 uppercase font-bold tracking-[0.2em] mx-2 mb-1.5 block group-focus-within/input:text-purple-400 transition-colors">{t('price')} ({user.currency})</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-2xl font-bold text-white placeholder-zinc-800 focus:border-purple-500 focus:shadow-[0_0_25px_rgba(168,85,247,0.2)] focus:bg-purple-900/5 outline-none transition-all font-mono"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 font-mono text-xs">{user.currency}</div>
                                </div>
                            </div>

                            <button 
                                onClick={handleSimulate}
                                disabled={!item || !price || loading}
                                className="relative w-full h-16 mt-4 rounded-xl overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 bg-[length:200%_100%] animate-gradient-x group-hover/btn:brightness-125 transition-all"></div>
                                <div className="absolute inset-0 flex items-center justify-center gap-3">
                                    {loading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span className="font-bold text-xs uppercase tracking-[0.2em] animate-pulse">{t('collapsing')}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Zap className="fill-white w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                            <span className="font-black text-sm tracking-[0.2em] uppercase">{t('simulate')}</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700 pb-10">
                
                {/* 1. Life Energy Card (Sci-Fi Module) */}
                <div className="relative bg-[#09090b] border border-purple-500/30 rounded-[2rem] p-6 overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.15)] group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-[50px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
                    
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <Activity size={12} className="animate-pulse" /> {t('lifeEnergy')}
                            </h4>
                            <div className="flex items-baseline gap-3">
                                <span className="text-5xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">{result.lifeEnergy.hoursOfWork.toFixed(1)}</span>
                                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{t('hours')}</span>
                            </div>
                            <div className="mt-4 p-3 bg-purple-500/10 border-l-2 border-purple-500 rounded-r-lg">
                                <p className="text-xs text-purple-200 italic leading-relaxed">
                                    "{result.lifeEnergy.sacrifice}"
                                </p>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full border border-purple-500/30 flex items-center justify-center bg-black shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                <Clock className="text-purple-400" size={24} />
                            </div>
                            <div className="absolute -inset-1 border border-purple-500/20 rounded-full animate-ping opacity-20"></div>
                        </div>
                    </div>
                </div>

                {/* 2. Multiverse Chart (Holographic) */}
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                    
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Cpu size={12} /> {t('trajectories')}
                        </h4>
                        <div className="flex gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                             <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                    
                    <div className="h-[220px] w-full -ml-2 relative z-10" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCollapse" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorWarrior" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EAB308" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                <XAxis dataKey="date" stroke="#444" tick={{fontSize: 9, fontFamily: 'monospace'}} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#444" tick={{fontSize: 9, fontFamily: 'monospace'}} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                                
                                <Area type="monotone" dataKey="Collapse" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCollapse)" activeDot={{r: 4, strokeWidth: 0, fill: '#fff'}} />
                                <Area type="monotone" dataKey="Warrior" stroke="#EAB308" strokeWidth={2} fillOpacity={1} fill="url(#colorWarrior)" activeDot={{r: 4, strokeWidth: 0, fill: '#fff'}} />
                                <Area type="monotone" dataKey="Wealth" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorWealth)" activeDot={{r: 4, strokeWidth: 0, fill: '#fff'}} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Chart Legend */}
                    <div className="grid grid-cols-3 gap-2 mt-6 relative z-10" dir="ltr">
                        {[
                            { label: 'Collapse', color: 'bg-red-500', text: 'text-red-500' },
                            { label: 'Warrior', color: 'bg-yellow-500', text: 'text-yellow-500' },
                            { label: 'Wealth', color: 'bg-green-500', text: 'text-green-500' }
                        ].map(item => (
                            <div key={item.label} className="bg-white/5 border border-white/5 rounded-lg p-2 flex flex-col items-center">
                                <div className={`w-1.5 h-1.5 rounded-full ${item.color} mb-1 shadow-[0_0_8px_currentColor]`}></div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${item.text}`}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Risks & Verdict */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Risks Module */}
                    {result.risks.length > 0 && (
                        <div className="bg-red-950/20 border border-red-500/30 rounded-[1.5rem] p-5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-600/10 rounded-full blur-xl"></div>
                            <h4 className="text-red-500 font-bold text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <ShieldAlert size={14} /> {t('risks')}
                            </h4>
                            <div className="space-y-3">
                                {result.risks.map((risk, idx) => (
                                    <div key={idx} className="flex items-start gap-3 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
                                        <div>
                                            <p className="text-xs text-red-200 font-bold leading-snug">{risk.message}</p>
                                            <p className="text-[10px] text-red-400/60 font-mono mt-1">DETECTED AT: {risk.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Verdict (Terminal Style) */}
                    <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/30 rounded-[1.5rem] p-6 relative overflow-hidden shadow-lg">
                         <div className="absolute top-0 right-0 p-4 opacity-10 animate-pulse">
                             <Sparkles size={60} />
                         </div>
                         <h4 className="text-indigo-300 font-bold text-[9px] uppercase tracking-[0.3em] mb-3 border-b border-indigo-500/20 pb-2 inline-block">
                             {t('verdict')}
                         </h4>
                         <p className="text-lg font-bold text-white leading-snug font-mono">
                             <span className="text-indigo-400 mr-2">{">"}</span>
                             "{result.aiVerdict}"
                             <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse"></span>
                         </p>
                    </div>
                </div>

                <button 
                    onClick={() => { setResult(null); setItem(''); setPrice(''); }}
                    className="w-full py-4 rounded-xl border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 group"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> {t('newSim')}
                </button>
            </div>
        )}
    </div>
  );
};