import React, { useState, useEffect } from 'react';
import {
    hasReviewForCurrentWeek,
    submitWeeklyReview,
    getCurrentWeekId
} from '../services/weeklyReviewService';
import { getActivationMetrics } from '../services/analyticsService';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

const WeeklyReviewModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [metrics, setMetrics] = useState<any>(null);
    const [decision, setDecision] = useState('');

    useEffect(() => {
        checkReviewStatus();
    }, []);

    const checkReviewStatus = async () => {
        try {
            const hasReview = await hasReviewForCurrentWeek();
            if (!hasReview) {
                // Fetch context data for the review
                const activationData = await getActivationMetrics();
                setMetrics(activationData);
                setIsOpen(true);
            }
        } catch (error) {
            console.error("Failed to check weekly review status", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decision.trim()) return;

        setSubmitting(true);
        try {
            await submitWeeklyReview(decision);
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to submit review", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-800/50 p-8 border-b border-slate-700">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-brand-500/20 rounded-xl">
                            <AlertCircle className="w-8 h-8 text-brand-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Weekly Operating Review</h2>
                            <p className="text-slate-400">Week {getCurrentWeekId()} • Action Required</p>
                        </div>
                    </div>
                    <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-200">
                        <p><strong>Ritual Check:</strong> You cannot dismiss this screen. Review the metrics below and commit to ONE single operating decision for this week.</p>
                    </div>
                </div>

                <div className="p-8">
                    {/* Metrics Snapshot */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                            <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Total Users</span>
                            <div className="text-2xl font-bold text-white mt-1">{metrics?.totalUsers}</div>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                            <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Activation Rate</span>
                            <div className={`text-2xl font-bold mt-1 ${(metrics?.activationRate || 0) < 30 ? 'text-red-400' :
                                    (metrics?.activationRate || 0) < 40 ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                {metrics?.activationRate.toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">
                                What is the ONE single action you will take this week?
                            </label>
                            <textarea
                                value={decision}
                                onChange={(e) => setDecision(e.target.value)}
                                placeholder="e.g. Stop outreach and rewrite onboarding emails..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 h-32 resize-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!decision.trim() || submitting}
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Commit & Unlock Admin</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default WeeklyReviewModal;
