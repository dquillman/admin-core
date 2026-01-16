import React, { useState, useEffect } from 'react';
import { getAppConfig, updateAppConfig } from '../services/firestoreService';
import { useApp } from '../context/AppContext';
import {
    CreditCard,
    Clock,
    Zap,
    ShieldCheck,
    Save,
    Loader2,
    Settings,
    AlertCircle
} from 'lucide-react';


const PlansPage: React.FC = () => {
    const { appId } = useApp();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<any>({
        trialDays: 7,
        trialHasFullProAccess: true,
        planLimits: {
            starter: { maxQuizzes: 5, maxAIGeneration: 10 },
            pro: { maxQuizzes: 1000, maxAIGeneration: 500 }
        }
    });
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, [appId]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const data = await getAppConfig(appId, 'plans');
            if (data) setConfig(data);
        } catch (err) {
            console.error("Fetch plans config error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        try {
            await updateAppConfig(appId, 'plans', config);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Save plans config error:", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Plans & Trials</h1>
                    <p className="text-slate-400">Configure subscription tiers and trial settings</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <ShieldCheck className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                    {saving ? 'Saving...' : success ? 'Config Saved' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Trial Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                                <Clock className="w-6 h-6 text-amber-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Trial Settings</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Trial Duration (Days)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={config.trialDays}
                                        onChange={(e) => setConfig({ ...config, trialDays: parseInt(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">Days</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-800 rounded-2xl">
                                <input
                                    type="checkbox"
                                    id="proAccess"
                                    checked={config.trialHasFullProAccess}
                                    onChange={(e) => setConfig({ ...config, trialHasFullProAccess: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-700 text-amber-500 focus:ring-amber-500/50 bg-slate-900"
                                />
                                <label htmlFor="proAccess" className="text-sm font-medium text-slate-200 cursor-pointer">
                                    Trial gives full PRO features
                                </label>
                            </div>

                            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-300 leading-relaxed">
                                    Trial configuration applies to all new signups immediately. Existing trials will retain their original end dates.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plan Limits */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-brand-600/10 rounded-xl">
                                <Settings className="w-6 h-6 text-brand-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Feature Limits</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Starter Plan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Starter Tier</h3>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Max Quizzes</label>
                                        <input
                                            type="number"
                                            value={config.planLimits.starter.maxQuizzes}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                planLimits: {
                                                    ...config.planLimits,
                                                    starter: { ...config.planLimits.starter, maxQuizzes: parseInt(e.target.value) }
                                                }
                                            })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Max AI Generations</label>
                                        <input
                                            type="number"
                                            value={config.planLimits.starter.maxAIGeneration}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                planLimits: {
                                                    ...config.planLimits,
                                                    starter: { ...config.planLimits.starter, maxAIGeneration: parseInt(e.target.value) }
                                                }
                                            })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pro Plan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Pro Tier</h3>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Max Quizzes</label>
                                        <input
                                            type="number"
                                            value={config.planLimits.pro.maxQuizzes}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                planLimits: {
                                                    ...config.planLimits,
                                                    pro: { ...config.planLimits.pro, maxQuizzes: parseInt(e.target.value) }
                                                }
                                            })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Max AI Generations</label>
                                        <input
                                            type="number"
                                            value={config.planLimits.pro.maxAIGeneration}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                planLimits: {
                                                    ...config.planLimits,
                                                    pro: { ...config.planLimits.pro, maxAIGeneration: parseInt(e.target.value) }
                                                }
                                            })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex items-center gap-6">
                        <div className="p-4 bg-slate-800 rounded-2xl">
                            <CreditCard className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold">Stripe Integration</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                Pricing IDs and subscription flows are managed in the main App Backend.
                                Configure checkout success redirects to point back to the main application.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlansPage;
