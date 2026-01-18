import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Rocket, Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getMarketingAssets, updateMarketingAssets } from '../services/firestoreService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const MarketingAssets: React.FC = () => {
    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form Data
    const [primary, setPrimary] = useState('');
    const [secondary, setSecondary] = useState('');

    const { isAdmin, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && isAdmin) {
            loadData();
        }
    }, [authLoading, isAdmin]);

    const loadData = async () => {
        if (!isAdmin) return;
        try {
            setLoading(true);
            const data = await getMarketingAssets();
            if (data) {
                setPrimary(data.pro_value_primary || '');
                setSecondary(data.pro_value_secondary || '');
            } else {
                // Defaults if document doesn't exist yet
                setPrimary('Unlock your full potential with Exam Coach Pro');
                setSecondary('Get unlimited access to advanced analytics and premium question banks.');
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to load marketing assets.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);
            await updateMarketingAssets({
                pro_value_primary: primary,
                pro_value_secondary: secondary
            });
            setMessage({ type: 'success', text: 'Marketing messaging updated successfully.' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to save changes.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
                    <Rocket className="w-8 h-8 text-brand-500" />
                    Marketing Assets
                </h1>
                <p className="text-slate-400">Manage high-level product messaging for Exam Coach Pro.</p>
            </div>

            {/* Info Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                        <Rocket className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Exam Coach Pro Messaging</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            These values appear on the upgrade modals, pricing pages, and diagnostic reveal screens in the user app.
                            Changes propagate immediately to all users.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 mt-4">
                    {/* Primary Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                            Primary Pro Value Statement
                        </label>
                        <input
                            type="text"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-medium"
                            placeholder="e.g. Master your exam with AI-powered coaching"
                            value={primary}
                            onChange={(e) => setPrimary(e.target.value)}
                        />
                        <p className="text-xs text-slate-500">
                            The main headline users see when prompted to upgrade. Keep it punchy.
                        </p>
                    </div>

                    {/* Secondary Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                            Supporting Line
                        </label>
                        <input
                            type="text"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-medium"
                            placeholder="e.g. Unlimited practice modes, detailed analytics, and priority support."
                            value={secondary}
                            onChange={(e) => setSecondary(e.target.value)}
                        />
                        <p className="text-xs text-slate-500">
                            A subtitle or short description elaborating on the value proposition.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end pt-4 border-t border-slate-800 mt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg shadow-brand-500/20",
                            saving ? "bg-slate-700 cursor-not-allowed" : "bg-brand-600 hover:bg-brand-500 hover:scale-105 active:scale-95"
                        )}
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Message Toast */}
            {message && (
                <div className={cn(
                    "fixed bottom-8 right-8 p-4 rounded-2xl border text-sm flex items-center gap-3 z-[70] animate-in slide-in-from-bottom-4 shadow-2xl backdrop-blur-md",
                    message.type === 'success'
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                        : "bg-red-500/10 border-red-500/20 text-red-200"
                )}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default MarketingAssets;
