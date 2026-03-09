import React, { useState, useEffect, useMemo } from 'react';
import { getAllUsers, getBillingAuditByMonth } from '../services/firestoreService';
import { useAppSubscribers } from '../hooks/useAppSubscribers';
import type { User } from '../types';
import type { AuditTimelineEntry } from '../services/firestoreService';
import { DollarSign, Loader2, TrendingUp, Users } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ---- pricing ----

const PRICE_PER_USER = 9.99;

// ---- helpers ----

const formatMonth = (ts: { seconds: number } | null | undefined): string => {
    if (!ts || typeof ts.seconds !== 'number') return 'Unknown';
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleString('default', { year: 'numeric', month: 'short' });
};

const formatMRR = (amount: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

// ---- stat card ----

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, accent = 'text-blue-400' }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
        <div className={`mt-0.5 shrink-0 ${accent}`}>{icon}</div>
        <div>
            <p className="text-slate-400 text-sm mb-1">{label}</p>
            <p className={`text-2xl font-bold text-white leading-none`}>{value}</p>
            {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
    </div>
);

// ---- custom tooltip ----

const DarkTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm shadow-xl">
            <p className="text-slate-300 font-medium mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color || p.stroke || '#3b82f6' }}>
                    {p.name}: <span className="font-semibold">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

// ---- page ----

const RevenueDashboard: React.FC = () => {
    const { filterByApp } = useAppSubscribers();
    const [users, setUsers] = useState<User[]>([]);
    const [auditEntries, setAuditEntries] = useState<AuditTimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        Promise.all([
            getAllUsers().catch(() => [] as User[]),
            getBillingAuditByMonth().catch(() => [] as AuditTimelineEntry[]),
        ])
            .then(([fetchedUsers, fetchedAudit]) => {
                setUsers(filterByApp(fetchedUsers));
                setAuditEntries(fetchedAudit);
            })
            .catch((err) => {
                setError(err?.message || 'Failed to load revenue data.');
            })
            .finally(() => setLoading(false));
    }, []);

    // ---- derived stats ----

    const paidUsers = useMemo(
        () => users.filter((u) => u.billingStatus === 'paid'),
        [users]
    );

    const totalPaid = paidUsers.length;
    const estimatedMRR = totalPaid * PRICE_PER_USER;
    const activePaid = paidUsers.filter((u) => (u.usageScore ?? 0) > 0).length;
    const churnRisk = paidUsers.filter((u) => (u.usageScore ?? 0) < 10).length;

    // ---- chart data ----

    // Group SET_BILLING_STATUS entries where new status = 'paid' by month
    const paidOverTimeData = useMemo(() => {
        const monthMap: Record<string, number> = {};

        for (const entry of auditEntries) {
            if (entry.action !== 'SET_BILLING_STATUS') continue;
            const meta = entry.metadata ?? {};
            const isPaid =
                meta.newStatus === 'paid' ||
                meta.status === 'paid' ||
                meta.billingStatus === 'paid';
            if (!isPaid) continue;
            const month = formatMonth(entry.createdAt as any);
            monthMap[month] = (monthMap[month] ?? 0) + 1;
        }

        // Sort chronologically
        const sorted = Object.entries(monthMap).sort(([a], [b]) => {
            const da = new Date(a);
            const db_ = new Date(b);
            return da.getTime() - db_.getTime();
        });

        return sorted.map(([month, count]) => ({ month, paidUsers: count }));
    }, [auditEntries]);

    // New subscriptions (SET_BILLING_STATUS → paid) vs cancellations (SET_BILLING_STATUS away from paid)
    const subVsCancelData = useMemo(() => {
        const monthMap: Record<string, { month: string; newSubs: number; cancellations: number }> = {};

        const ensureMonth = (m: string) => {
            if (!monthMap[m]) monthMap[m] = { month: m, newSubs: 0, cancellations: 0 };
        };

        for (const entry of auditEntries) {
            if (entry.action !== 'SET_BILLING_STATUS') continue;
            const meta = entry.metadata ?? {};
            const month = formatMonth(entry.createdAt as any);
            ensureMonth(month);

            const newStatus: string = meta.newStatus ?? meta.status ?? meta.billingStatus ?? '';
            const prevStatus: string = meta.prevStatus ?? meta.oldStatus ?? meta.previousStatus ?? '';

            if (newStatus === 'paid') {
                monthMap[month].newSubs += 1;
            } else if (prevStatus === 'paid' && newStatus !== 'paid') {
                monthMap[month].cancellations += 1;
            }
        }

        return Object.values(monthMap).sort((a, b) => {
            return new Date(a.month).getTime() - new Date(b.month).getTime();
        });
    }, [auditEntries]);

    const hasAuditData = auditEntries.length > 0;
    const hasPaidOverTime = paidOverTimeData.length > 0;
    const hasSubVsCancel = subVsCancelData.length > 0;

    // ---- render ----

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                <span>Loading revenue data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">Paid user metrics and trends</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    icon={<Users className="h-5 w-5" />}
                    label="Total Paid Users"
                    value={totalPaid}
                    sub="billingStatus = paid"
                    accent="text-blue-400"
                />
                <StatCard
                    icon={<DollarSign className="h-5 w-5" />}
                    label="Estimated MRR"
                    value={formatMRR(estimatedMRR)}
                    sub={`${totalPaid} users × $${PRICE_PER_USER}/mo`}
                    accent="text-emerald-400"
                />
                <StatCard
                    icon={<TrendingUp className="h-5 w-5" />}
                    label="Active Paid"
                    value={activePaid}
                    sub="Paid with usage score > 0"
                    accent="text-violet-400"
                />
                <StatCard
                    icon={<DollarSign className="h-5 w-5" />}
                    label="Churn Risk"
                    value={churnRisk}
                    sub="Paid with usage score < 10"
                    accent="text-rose-400"
                />
            </div>

            {/* Charts */}
            {!hasAuditData ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
                    Not enough data yet — billing audit history will appear here once billing events are recorded.
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* Area chart: Paid users over time */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h2 className="text-white font-semibold mb-4 text-sm">Paid Users Over Time</h2>
                        {!hasPaidOverTime ? (
                            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                                No paid billing events found yet.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={paidOverTimeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        axisLine={{ stroke: '#334155' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        axisLine={{ stroke: '#334155' }}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={<DarkTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="paidUsers"
                                        name="New Paid"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fill="url(#paidGradient)"
                                        dot={{ fill: '#3b82f6', r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Bar chart: New subs vs cancellations */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h2 className="text-white font-semibold mb-4 text-sm">New Subscriptions vs Cancellations</h2>
                        {!hasSubVsCancel ? (
                            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                                No subscription change events found yet.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={subVsCancelData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        axisLine={{ stroke: '#334155' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        axisLine={{ stroke: '#334155' }}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={<DarkTooltip />} />
                                    <Bar
                                        dataKey="newSubs"
                                        name="New Subs"
                                        fill="#3b82f6"
                                        opacity={0.85}
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="cancellations"
                                        name="Cancellations"
                                        fill="#f43f5e"
                                        opacity={0.75}
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                </div>
            )}

        </div>
    );
};

export default RevenueDashboard;
