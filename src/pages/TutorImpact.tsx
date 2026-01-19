import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getTutorImpactMetrics, type TutorImpactMetrics } from '../services/analyticsService';
import {
    Brain,
    Clock,
    RotateCcw,
    TrendingUp,
    Zap, // Added Zap
    Loader2
} from 'lucide-react';

const TutorImpact: React.FC = () => {
    const { isAdmin, loading: authLoading } = useAuth();
    const [metrics, setMetrics] = useState<TutorImpactMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchMetrics();
        }
    }, [authLoading, isAdmin]);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const data = await getTutorImpactMetrics();
            setMetrics(data);
        } catch (error) {
            console.error("Failed to fetch tutor metrics", error);
        } finally {
            setLoading(false);
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
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Tutor Impact</h1>
                <p className="text-slate-400">Measuring the effectiveness of AI explanations on learning outcomes</p>
            </div>

            {/* Impact Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Correlation Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-purple-500/20 rounded-2xl">
                            <Zap className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Retention Impact</h2>
                            <p className="text-slate-400">Correlation algorithm v1</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-5xl font-bold text-white">
                                {(metrics?.correlationScore || 0) > 0
                                    ? ((metrics?.correlationScore || 0) / 100 + 1).toFixed(1) + 'x'
                                    : '---'}
                            </span>
                            <span className="text-lg text-emerald-400 font-bold">Better Retention</span>
                        </div>
                        <p className="text-slate-300 text-lg leading-relaxed">
                            Users who read explanations are <strong className="text-white">
                                {(metrics?.correlationScore || 0) > 0 ? ((metrics?.correlationScore || 0) / 100 + 1).toFixed(1) : '...'} times more likely
                            </strong> to return within 24 hours than those who don't.
                        </p>
                    </div>

                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Marketing Copy Swipe File</h4>
                        <p className="text-white font-mono text-sm">
                            "Our intelligent tutor explains your mistakes instantly. Students who use it are {(metrics?.correlationScore || 0)}% more consistent with their study habits."
                        </p>
                    </div>
                </div>

                {/* Engagement Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <h2 className="text-xl font-bold text-white mb-6">Deep Work Analysis</h2>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Average Read Time</span>
                                <span className="text-white font-bold">{metrics?.avgExplanationTime.toFixed(1)}s</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Target: 30s-60s per explanation</p>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Wrong Answers Reviewed</span>
                                <span className="text-white font-bold">{metrics?.wrongAnswersReviewed}%</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${metrics?.wrongAnswersReviewed}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Healthy engagement is &gt; 50%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Raw Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl">
                            <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Read Time</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{metrics?.avgExplanationTime.toFixed(1)}s</p>
                    <p className="text-xs text-slate-500 mt-1">Avg time per explanation</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl">
                            <Brain className="w-6 h-6 text-purple-500" />
                        </div>
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Review Rate</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{metrics?.wrongAnswersReviewed}%</p>
                    <p className="text-xs text-slate-500 mt-1">Wrong answers reviewed</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                            <RotateCcw className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Return Rate</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{metrics?.returnRate24h}%</p>
                    <p className="text-xs text-slate-500 mt-1">Users returning in 24h</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl">
                            <TrendingUp className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Calculated Impact</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">+{metrics?.correlationScore}</p>
                    <p className="text-xs text-slate-500 mt-1">Score improvement correlation</p>
                </div>
            </div>
        </div>
    );
};

export default TutorImpact;
