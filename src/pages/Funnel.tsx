import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getFunnelMetrics } from '../services/analyticsService';
import {
    ArrowRight,
    Loader2,
    Users,
    Zap,
    CreditCard,
    MousePointerClick
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const FunnelStep = ({ label, count, total, icon: Icon, color, isLast }: any) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return (
        <div className="relative flex-1">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-2xl bg-opacity-10", color)}>
                        <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
                    </div>
                    <span className="text-2xl font-bold text-white">{count}</span>
                </div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">{label}</h3>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-1000", color.replace('bg-opacity-10', ''))}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <p className="text-xs text-slate-500 mt-2 text-right">{percentage.toFixed(1)}% of total</p>
            </div>

            {!isLast && (
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 z-0 hidden lg:block">
                    <ArrowRight className="w-8 h-8 text-slate-700" />
                </div>
            )}
        </div>
    );
};

const FunnelPage: React.FC = () => {
    const { isAdmin, loading: authLoading } = useAuth();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchMetrics();
        }
    }, [authLoading, isAdmin]);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const data = await getFunnelMetrics();
            setMetrics(data);
        } catch (error) {
            console.error("Failed to fetch funnel metrics", error);
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
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Conversion Funnel</h1>
                <p className="text-slate-400">Tracking the user journey from signup to payment</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-4 relative px-4">
                <FunnelStep
                    label="Total Users"
                    count={metrics.users}
                    total={metrics.users}
                    icon={Users}
                    color="bg-blue-500"
                />
                <FunnelStep
                    label="Activated"
                    count={metrics.activated}
                    total={metrics.users}
                    icon={Zap}
                    color="bg-orange-500"
                />
                <FunnelStep
                    label="Pricing Viewed"
                    count={metrics.pricingViewed}
                    total={metrics.users}
                    icon={CreditCard}
                    color="bg-purple-500"
                />
                <FunnelStep
                    label="Upgrade Clicked"
                    count={metrics.upgradeClicked || 0}
                    total={metrics.users}
                    icon={MousePointerClick}
                    color="bg-pink-500"
                />
                <FunnelStep
                    label="Converted"
                    count={metrics.converted}
                    total={metrics.users}
                    icon={Zap}
                    color="bg-emerald-500"
                    isLast
                />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mt-8">
                <h2 className="text-xl font-bold text-white mb-6">Drop-off Analysis</h2>
                <div className="space-y-4">
                    <p className="text-slate-400 text-sm">
                        <strong className="text-white">Activation Gap:</strong> {((1 - (metrics.activated / metrics.users || 0)) * 100).toFixed(1)}% of users never complete the first quiz.
                    </p>
                    <p className="text-slate-400 text-sm">
                        <strong className="text-white">Pricing Intent:</strong> {((metrics.pricingViewed / metrics.activated || 0) * 100).toFixed(1)}% of activated users viewed pricing.
                    </p>
                    <p className="text-slate-400 text-sm">
                        <strong className="text-white">Conversion Rate:</strong> {((metrics.converted / metrics.pricingViewed || 0) * 100).toFixed(1)}% of those who viewed pricing converted.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FunnelPage;
