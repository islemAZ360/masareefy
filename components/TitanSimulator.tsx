import React, { useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrainCircuit, Zap, AlertTriangle, Clock, Activity, ShieldAlert, Sparkles, ChevronLeft, ScanLine, Wallet, PiggyBank, Receipt, Calculator } from 'lucide-react';
import { UserSettings, Transaction, TitanAnalysis } from '../types';
import { analyzeMultiverse, extractItemFromImage } from '../services/titanService';
import { simulateMultiverseStandard } from '../services/standardTitanService';

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

    const totalBills = user.recurringBills?.reduce((sum, b) => sum + b.amount, 0) || 0;

    const txt = {
        title: { en: "TITAN ENGINE", ar: "محرك التيتان", ru: "ДВИГАТЕЛЬ ТИТАН" },
        desire: { en: "What do you desire?", ar: "ماذا تريد أن تشتري؟", ru: "Что вы хотите купить?" },
        itemName: { en: "Item Name", ar: "اسم المنتج", ru: "Название товара" },
        itemPlaceholder: { en: "e.g. iPhone 16 Pro", ar: "مثلاً: آيفون 16", ru: "например, iPhone 16" },
        price: { en: "Price", ar: "السعر", ru: "Цена" },
        simulate: { en: "Simulate Future", ar: "محاكاة المستقبل", ru: "Симуляция будущего" },
        collapsing: { en: "Collapsing Timelines...", ar: "جاري تحليل المسارات...", ru: "Анализ временных линий..." },
        computing: { en: "Computing Scenarios...", ar: "حساب السيناريوهات...", ru: "Вычисление сценариев..." },
        scanning: { en: "Scanning...", ar: "جاري المسح...", ru: "Сканирование..." },
        scanBtn: { en: "Scan Tag / Product", ar: "تصوير المنتج / السعر", ru: "Сканировать товар" },
        lifeEnergy: { en: "Life Energy Cost", ar: "تكلفة طاقة الحياة", ru: "Стоимость жизненной энергии" },
        hours: { en: "Hours of Work", ar: "ساعات عمل", ru: "Часов работы" },
        trajectories: { en: "Future Trajectories", ar: "المسارات المستقبلية", ru: "Будущие траектории" },
        risks: { en: "Critical Risks Detected", ar: "مخاطر حرجة مكتشفة", ru: "Обнаружены критические риски" },
        verdict: { en: "Titan Verdict", ar: "حكم التيتان", ru: "Вердикт Титана" },
        newSim: { en: "Run New Simulation", ar: "محاكاة جديدة", ru: "Новая симуляция" },
        quote: {
            en: "\"The Titan Engine calculates not just the cost of money, but the cost of life energy and opportunity.\"",
            ar: "\"محرك التيتان لا يحسب تكلفة المال فحسب، بل يحسب تكلفة طاقة الحياة والفرص الضائعة.\"",
            ru: "\"Титан рассчитывает не только денежную стоимость, но и затраты жизненной энергии и упущенные возможности.\""
        },
        wallet: { en: "Spending", ar: "صرف", ru: "Расходы" },
        savings: { en: "Savings", ar: "تجميع", ru: "Сбережения" },
        bills: { en: "Bills", ar: "فواتير", ru: "Счета" },
        stdMode: { en: "MATH ENGINE", ar: "المحرك الرياضي", ru: "МАТЕМАТИКА" },
    };

    const t = (key: keyof typeof txt) => txt[key][user.language];

    const handleSimulate = async () => {
        if (!item || !price) return;
        const numPrice = parseFloat(price);

        // Standard Mode: Use Math-Based Simulation
        if (!user.isAIMode || !user.apiKey) {
            setLoading(true);
            // Small delay for nice loading animation
            await new Promise(resolve => setTimeout(resolve, 800));
            try {
                const analysis = simulateMultiverseStandard(user, transactions, item, numPrice);
                setResult(analysis);
            } catch (e) {
                alert(user.language === 'ar' ? "حدث خطأ في المحرك الرياضي." : "Math engine error.");
            } finally {
                setLoading(false);
            }
            return;
        }

        // AI Mode
        setLoading(true);
        try {
            const analysis = await analyzeMultiverse(user, transactions, item, numPrice);
            setResult(analysis);
        } catch (e) {
            alert(user.language === 'ar' ? "حدث خطأ في المحرك الزمني." : "Temporal engine malfunction.");
        } finally {
            setLoading(false);
        }
    };

    const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user.isAIMode || !user.apiKey) {
            alert(user.language === 'ar' ? "أدخل اسم المنتج والسعر يدوياً." : "Enter product name and price manually.");
            return;
        }
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

    const getChartData = () => {
        if (!result) return [];
        const baseTimeline = result.scenarios[0].timeline;
        return baseTimeline.map((point, index) => {
            const collapsePoint = result.scenarios.find(s => s.id === 'collapse')?.timeline[index];
            const warriorPoint = result.scenarios.find(s => s.id === 'warrior')?.timeline[index];
            const wealthPoint = result.scenarios.find(s => s.id === 'wealth')?.timeline[index];
            return {
                date: point.date.slice(5),
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
                <div className="glass-strong border border-purple-500/30 p-4 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                    <p className="text-zinc-400 text-xs font-mono mb-2">{label}</p>
                    {payload.map((p: any) => (
                        <div key={p.name} className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                            <span className="text-xs font-bold text-white w-20">{p.name}:</span>
                            <span className="text-xs font-mono text-white">{Number(p.value).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const isStandardMode = !user.isAIMode || !user.apiKey;

    return (
        <div className="min-h-[85vh] bg-transparent text-white font-sans selection:bg-purple-500/30 pb-32 animate-fade-in" dir={user.language === 'ar' ? 'rtl' : 'ltr'}>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="p-2 glass rounded-full hover:bg-white/10 transition-colors">
                    <ChevronLeft size={20} className={user.language === 'ar' ? 'rotate-180' : ''} />
                </button>
                <div className="flex items-center gap-2">
                    {isStandardMode ? (
                        <Calculator className="text-emerald-500 animate-pulse" />
                    ) : (
                        <BrainCircuit className="text-purple-500 animate-pulse" />
                    )}
                    <h2 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${isStandardMode ? 'from-emerald-400 to-teal-400' : 'from-purple-400 to-indigo-400'} tracking-wider font-mono drop-shadow-md`}>
                        {isStandardMode ? t('stdMode') : t('title')}
                    </h2>
                </div>
                <div className="w-10" />
            </div>

            {!result ? (
                <div className="animate-slide-up">
                    {/* Input Section */}
                    <div className="glass-panel border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-64 h-64 ${isStandardMode ? 'bg-emerald-600/10' : 'bg-purple-600/10'} rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:opacity-50 transition-colors duration-1000`}></div>

                        {/* Financial Status Bar */}
                        <div className="flex justify-between items-center gap-2 mb-8 p-3 rounded-2xl bg-black/40 border border-white/5 relative z-10 backdrop-blur-md">
                            <div className="flex-1 flex flex-col items-center">
                                <span className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Wallet size={10} /> {t('wallet')}
                                </span>
                                <span className="text-white font-bold font-mono text-sm tabular-nums">{user.currentBalance.toLocaleString()}</span>
                            </div>
                            <div className="w-[1px] h-8 bg-white/10"></div>
                            <div className="flex-1 flex flex-col items-center">
                                <span className="text-[9px] text-sber-green uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <PiggyBank size={10} /> {t('savings')}
                                </span>
                                <span className="text-sber-green font-bold font-mono text-sm tabular-nums">{user.savingsBalance.toLocaleString()}</span>
                            </div>
                            <div className="w-[1px] h-8 bg-white/10"></div>
                            <div className="flex-1 flex flex-col items-center">
                                <span className="text-[9px] text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Receipt size={10} /> {t('bills')}
                                </span>
                                <span className="text-red-400 font-bold font-mono text-sm tabular-nums">-{totalBills.toLocaleString()}</span>
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-center mb-6 drop-shadow-lg">{t('desire')}</h3>

                        {/* Scan Button (only visible when AI is active) */}
                        {!isStandardMode && (
                            <>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full mb-6 py-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center gap-3 text-zinc-400 hover:text-white hover:border-purple-500/50 hover:bg-black/60 transition-all group/scan relative z-10"
                                >
                                    {scanning ? (
                                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <ScanLine size={20} className="group-hover/scan:text-purple-400" />
                                    )}
                                    <span className="font-bold text-sm tracking-wide">{scanning ? t('scanning') : t('scanBtn')}</span>
                                </button>
                                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleScanImage} />
                            </>
                        )}

                        <div className="space-y-6 relative z-10">
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mx-2 mb-1 block">{t('itemName')}</label>
                                <input
                                    type="text"
                                    value={item}
                                    onChange={e => setItem(e.target.value)}
                                    placeholder={t('itemPlaceholder')}
                                    className={`w-full bg-black/50 border border-zinc-800 rounded-2xl p-4 text-white placeholder-zinc-700 ${isStandardMode ? 'focus:border-emerald-500 focus:shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'focus:border-purple-500 focus:shadow-[0_0_20px_rgba(168,85,247,0.2)]'} outline-none transition-all`}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mx-2 mb-1 block">{t('price')} ({user.currency})</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    className={`w-full bg-black/50 border border-zinc-800 rounded-2xl p-4 text-3xl font-bold text-white placeholder-zinc-800 ${isStandardMode ? 'focus:border-emerald-500' : 'focus:border-purple-500'} outline-none transition-all`}
                                />
                            </div>

                            <button
                                onClick={handleSimulate}
                                disabled={!item || !price || loading}
                                className={`w-full h-16 ${isStandardMode ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:shadow-[0_0_60px_rgba(147,51,234,0.5)]'} rounded-2xl font-bold text-lg tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 text-white`}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="animate-pulse">{isStandardMode ? t('computing') : t('collapsing')}</span>
                                    </div>
                                ) : (
                                    <>
                                        {t('simulate')} <Zap className="fill-white" size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 text-center px-6">
                        <p className="text-xs text-zinc-500 leading-relaxed font-mono italic">
                            {t('quote')}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-slide-up">

                    {/* 1. Life Energy Card */}
                    <div className="glass-panel border border-purple-500/20 rounded-[2rem] p-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-purple-500/5 blur-xl"></div>
                        <div className="shimmer-overlay"></div>
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Activity size={14} /> {t('lifeEnergy')}
                                </h4>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-4xl font-bold text-white tabular-nums drop-shadow-md">{result.lifeEnergy.hoursOfWork.toFixed(1)}</span>
                                    <span className="text-sm text-zinc-500 font-bold">{t('hours')}</span>
                                </div>
                                <p className="text-sm text-zinc-300 mt-3 border-l-2 border-purple-500 pl-3 italic">
                                    "{result.lifeEnergy.sacrifice}"
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                                <Clock className="text-purple-400" size={24} />
                            </div>
                        </div>
                    </div>

                    {/* 2. Multiverse Chart */}
                    <div className="glass-panel border border-white/5 rounded-[2rem] p-6 shadow-2xl">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Activity size={14} /> {t('trajectories')}
                        </h4>

                        <div className="h-[250px] w-full -ml-2" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorCollapse" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorWarrior" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#555" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <Tooltip content={<CustomTooltip />} />

                                    <Area type="monotone" dataKey="Collapse" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCollapse)" />
                                    <Area type="monotone" dataKey="Warrior" stroke="#EAB308" strokeWidth={2} fillOpacity={1} fill="url(#colorWarrior)" />
                                    <Area type="monotone" dataKey="Wealth" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorWealth)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex justify-between mt-4 px-2" dir="ltr">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                <span className="text-[10px] text-zinc-400">Collapse</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                                <span className="text-[10px] text-zinc-400">Warrior</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                <span className="text-[10px] text-zinc-400">Wealth</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Risks & Verdict */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Risks */}
                        {result.risks.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-[1.5rem] p-5">
                                <h4 className="text-red-500 font-bold text-sm mb-3 flex items-center gap-2">
                                    <ShieldAlert size={16} /> {t('risks')}
                                </h4>
                                <div className="space-y-2">
                                    {result.risks.map((risk, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs text-red-300 bg-red-500/5 p-2 rounded-lg">
                                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                            <span>{risk.message} ({risk.date})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Verdict */}
                        <div className={`bg-gradient-to-br ${isStandardMode ? 'from-emerald-900/40 to-teal-900/40 border-emerald-500/30' : 'from-indigo-900/40 to-purple-900/40 border-indigo-500/30'} border rounded-[1.5rem] p-6 relative overflow-hidden shadow-lg`}>
                            <div className="absolute top-0 right-0 p-4 opacity-20 animate-pulse-slow">
                                <Sparkles size={60} />
                            </div>
                            <h4 className={`${isStandardMode ? 'text-emerald-300' : 'text-indigo-300'} font-bold text-xs uppercase tracking-widest mb-2`}>{t('verdict')}</h4>
                            <p className="text-lg font-bold text-white leading-snug drop-shadow-md">
                                "{result.aiVerdict}"
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => { setResult(null); setItem(''); setPrice(''); }}
                        className="w-full py-4 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold glass"
                    >
                        {t('newSim')}
                    </button>
                </div>
            )}
        </div>
    );
};