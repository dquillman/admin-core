import React, { useState, useEffect, useMemo } from 'react';
import { getSubscriptions } from '../services/gameForgeService';
import type { GameForgeSubscription, SubscriptionTier, SubscriptionStatus } from '../types/gameForge';
import SubscriptionBadge from '../components/gameforge/SubscriptionBadge';
import { Loader2, Users, Crown, Star } from 'lucide-react';

const formatDate = (ts: { seconds: number } | null | undefined): string => {
    if (!ts || typeof ts.seconds !== 'number') return '--';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const statusColor: Record<SubscriptionStatus, string> = {
    active: 'text-emerald-400',
    past_due: 'text-amber-400',
    cancelled: 'text-red-400',
    expired: 'text-slate-500',
};

const GameForgeSubscriptions: React.FC = () => {
    const [subscriptions, setSubscriptions] = useState<GameForgeSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
        setLoading(true);
        setError(null);
        getSubscriptions()
            .then((data) => setSubscriptions(data as unknown as GameForgeSubscription[]))
            .catch((err) => setError(err?.message || 'Failed to load subscriptions.'))
            .finally(() => setLoading(false));
    }, []);

    // Tier breakdown
    const tierCounts = useMemo(() => {
        const counts: Record<SubscriptionTier, number> = { free: 0, pro: 0, elite: 0 };
        for (const sub of subscriptions) {
            if (counts[sub.tier] !== undefined) counts[sub.tier]++;
        }
        return counts;
    }, [subscriptions]);

    const total = subscriptions.length;

    const pct = (count: number) => (total > 0 ? ((count / total) * 100).toFixed(1) : '0.0');

    // Filtered list
    const filtered = useMemo(
        () =>
            subscriptions.filter((s) => {
                if (tierFilter !== 'all' && s.tier !== tierFilter) return false;
                if (statusFilter !== 'all' && s.status !== statusFilter) return false;
                return true;
            }),
        [subscriptions, tierFilter, statusFilter],
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                <span>Loading subscriptions...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">{error}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
                <p className="text-slate-400 text-sm mt-1">Manage player subscription tiers and status</p>
            </div>

            {/* Tier breakdown cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
                    <div className="mt-0.5 shrink-0 text-zinc-400"><Users className="h-5 w-5" /></div>
                    <div>
                        <p className="text-slate-400 text-sm mb-1">Free</p>
                        <p className="text-2xl font-bold text-white leading-none">{tierCounts.free}</p>
                        <p className="text-slate-500 text-xs mt-1">{pct(tierCounts.free)}% of total</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
                    <div className="mt-0.5 shrink-0 text-blue-400"><Star className="h-5 w-5" /></div>
                    <div>
                        <p className="text-slate-400 text-sm mb-1">Pro</p>
                        <p className="text-2xl font-bold text-white leading-none">{tierCounts.pro}</p>
                        <p className="text-slate-500 text-xs mt-1">{pct(tierCounts.pro)}% of total</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
                    <div className="mt-0.5 shrink-0 text-amber-400"><Crown className="h-5 w-5" /></div>
                    <div>
                        <p className="text-slate-400 text-sm mb-1">Elite</p>
                        <p className="text-2xl font-bold text-white leading-none">{tierCounts.elite}</p>
                        <p className="text-slate-500 text-xs mt-1">{pct(tierCounts.elite)}% of total</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value as SubscriptionTier | 'all')}
                    className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                    <option value="all">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="elite">Elite</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | 'all')}
                    className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                </select>
            </div>

            {/* Subscription table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="px-5 py-3">Player ID</th>
                                <th className="px-5 py-3">Tier</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Start Date</th>
                                <th className="px-5 py-3">End Date</th>
                                <th className="px-5 py-3">Stripe Sub ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                                        No subscriptions found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((sub) => (
                                    <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-3 text-white font-medium truncate max-w-[180px]">{sub.playerId}</td>
                                        <td className="px-5 py-3"><SubscriptionBadge tier={sub.tier} /></td>
                                        <td className={`px-5 py-3 font-medium capitalize ${statusColor[sub.status] ?? 'text-slate-400'}`}>
                                            {sub.status.replace('_', ' ')}
                                        </td>
                                        <td className="px-5 py-3 text-slate-300">{formatDate(sub.currentPeriodStart as unknown as { seconds: number })}</td>
                                        <td className="px-5 py-3 text-slate-300">{formatDate(sub.currentPeriodEnd as unknown as { seconds: number })}</td>
                                        <td className="px-5 py-3 text-slate-500 font-mono text-xs truncate max-w-[200px]">{sub.stripeSubId}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GameForgeSubscriptions;
