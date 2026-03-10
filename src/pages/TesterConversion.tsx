import React, { useState, useEffect, useMemo } from 'react';
import { getTesterConversionData, getAllUsers } from '../services/firestoreService';
import { useAppSubscribers } from '../hooks/useAppSubscribers';
import type { AuditTimelineEntry } from '../services/firestoreService';
import type { User } from '../types';
import { TrendingUp, Loader2, Users, Clock, DollarSign, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ─── Helpers ───────────────────────────────────────────────────────────────

const toDate = (ts: unknown): Date | null => {
    if (!ts) return null;
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') return (ts as { toDate: () => Date }).toDate();
    if (ts instanceof Date) return ts;
    return null;
};

const formatDate = (ts: unknown): string => {
    const d = toDate(ts);
    if (!d) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const daysBetween = (from: unknown, to: unknown): number | null => {
    const a = toDate(from);
    const b = toDate(to);
    if (!a || !b) return null;
    const diff = b.getTime() - a.getTime();
    if (diff < 0) return null;
    return Math.round(diff / (1000 * 60 * 60 * 24));
};

const monthKey = (ts: unknown): string => {
    const d = toDate(ts);
    if (!d) return 'Unknown';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key: string): string => {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const toInputDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const daysAgo = (n: number): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
};

const today = (): Date => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
};

type RangePreset = '30d' | '90d' | '6mo' | '1yr' | 'all';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConvertedUser {
    uid: string;
    email: string;
    testerGrantedAt: unknown;
    verifiedPaidAt: unknown;
    daysToConvert: number | null;
    usageScore?: number;
}

interface MonthDataPoint {
    month: string;
    label: string;
    conversions: number;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, accent = 'text-white' }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-bold leading-tight ${accent}`}>{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl text-sm">
            <p className="text-slate-400 font-medium mb-1">{label}</p>
            <p className="text-emerald-400 font-bold">{payload[0].value} conversion{payload[0].value !== 1 ? 's' : ''}</p>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TesterConversion: React.FC = () => {
    const { filterByApp } = useAppSubscribers();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [auditEntries, setAuditEntries] = useState<AuditTimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Date range filter state
    const [dateFrom, setDateFrom] = useState<string>(toInputDate(daysAgo(90)));
    const [dateTo, setDateTo] = useState<string>(toInputDate(today()));
    const [activePreset, setActivePreset] = useState<RangePreset | undefined>('90d');

    const applyPreset = (preset: RangePreset) => {
        setActivePreset(preset);
        const end = today();
        setDateTo(toInputDate(end));
        switch (preset) {
            case '30d':  setDateFrom(toInputDate(daysAgo(30))); break;
            case '90d':  setDateFrom(toInputDate(daysAgo(90))); break;
            case '6mo':  setDateFrom(toInputDate(daysAgo(182))); break;
            case '1yr':  setDateFrom(toInputDate(daysAgo(365))); break;
            case 'all':  setDateFrom(''); break;
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [users, audit] = await Promise.all([
                    getAllUsers(),
                    getTesterConversionData(),
                ]);
                setAllUsers(filterByApp(users));
                setAuditEntries(audit);
            } catch (err: unknown) {
                console.error('[TesterConversion] load error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load conversion data.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [filterByApp]);

    // ── Derived: all users who ever had tester access ──────────────────────
    const testerEverUsers = useMemo(
        () => allUsers.filter(u => !!u.testerGrantedAt),
        [allUsers]
    );

    // ── Derived: users who converted (testerGrantedAt + billingStatus paid) ─
    const convertedUsers = useMemo<ConvertedUser[]>(() => {
        return testerEverUsers
            .filter(u => u.billingStatus === 'paid' && u.verifiedPaidAt)
            .map(u => ({
                uid: u.uid,
                email: u.email,
                testerGrantedAt: u.testerGrantedAt,
                verifiedPaidAt: u.verifiedPaidAt,
                daysToConvert: daysBetween(u.testerGrantedAt, u.verifiedPaidAt),
                usageScore: u.usageScore,
            }))
            .sort((a, b) => {
                const da = toDate(b.verifiedPaidAt)?.getTime() ?? 0;
                const db = toDate(a.verifiedPaidAt)?.getTime() ?? 0;
                return da - db;
            });
    }, [testerEverUsers]);

    // ── Derived: date-filtered converted users ────────────────────────────
    const filteredConverted = useMemo<ConvertedUser[]>(() => {
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
        return convertedUsers.filter(u => {
            const d = toDate(u.verifiedPaidAt);
            if (!d) return false;
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        });
    }, [convertedUsers, dateFrom, dateTo]);

    // ── Derived: stat values ───────────────────────────────────────────────
    const totalTesters = testerEverUsers.length;
    const totalConverted = filteredConverted.length;
    const conversionRate = totalTesters > 0
        ? ((totalConverted / totalTesters) * 100).toFixed(1)
        : '0.0';

    const avgDaysToConvert = useMemo(() => {
        const valid = filteredConverted.filter(u => u.daysToConvert !== null) as (ConvertedUser & { daysToConvert: number })[];
        if (!valid.length) return null;
        const avg = valid.reduce((sum, u) => sum + u.daysToConvert, 0) / valid.length;
        return Math.round(avg);
    }, [filteredConverted]);

    // ── Derived: chart data ────────────────────────────────────────────────
    // Build a uid→user lookup for testerGrantedAt check
    const uidToUser = useMemo(() => {
        const map = new Map<string, User>();
        allUsers.forEach(u => map.set(u.uid, u));
        return map;
    }, [allUsers]);

    const chartData = useMemo<MonthDataPoint[]>(() => {
        // Only audit entries that are SET_BILLING_STATUS to 'paid' for a user who has testerGrantedAt
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

        const conversionEvents = auditEntries.filter(e => {
            if (e.action !== 'SET_BILLING_STATUS') return false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newStatus = (e.metadata as Record<string, any> | undefined)?.newStatus ?? (e.metadata?.new as Record<string, any> | undefined)?.billingStatus;
            if (newStatus !== 'paid') return false;
            const uid = e.targetUserId;
            if (!uid) return false;
            const user = uidToUser.get(uid);
            if (!user?.testerGrantedAt) return false;
            // Apply date range filter
            const d = toDate(e.createdAt);
            if (!d) return false;
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        });

        if (!conversionEvents.length) return [];

        // Group by month
        const counts: Record<string, number> = {};
        conversionEvents.forEach(e => {
            const key = monthKey(e.createdAt);
            counts[key] = (counts[key] ?? 0) + 1;
        });

        // Sort chronologically and build array
        return Object.keys(counts)
            .sort()
            .map(key => ({
                month: key,
                label: monthLabel(key),
                conversions: counts[key],
            }));
    }, [auditEntries, uidToUser, dateFrom, dateTo]);

    // ── Render ─────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                <span className="text-sm font-medium">Loading conversion data…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-rose-400 text-sm">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Tester Conversion</h1>
                <p className="text-slate-400">Tester-to-paid conversion tracking</p>
            </div>

            {/* Date Range Filter */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Range</span>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setActivePreset(undefined); }}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 [color-scheme:dark]"
                    />
                    <span className="text-slate-600 text-xs">to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setActivePreset(undefined); }}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 [color-scheme:dark]"
                    />
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                    {([
                        ['30d', '30d'],
                        ['90d', '90d'],
                        ['6mo', '6mo'],
                        ['1yr', '1yr'],
                        ['all', 'All Time'],
                    ] as [RangePreset, string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => applyPreset(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                activePreset === key
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Conversion Rate"
                    value={`${conversionRate}%`}
                    sub={`${totalConverted} of ${totalTesters} testers`}
                    accent="text-emerald-400"
                />
                <StatCard
                    icon={<Users className="w-5 h-5" />}
                    label="Total Testers (ever)"
                    value={totalTesters}
                    sub="Users with testerGrantedAt"
                />
                <StatCard
                    icon={<DollarSign className="w-5 h-5" />}
                    label="Converted"
                    value={totalConverted}
                    sub="Tester → Paid"
                    accent="text-sky-400"
                />
                <StatCard
                    icon={<Clock className="w-5 h-5" />}
                    label="Avg Time to Convert"
                    value={avgDaysToConvert !== null ? `${avgDaysToConvert}d` : '—'}
                    sub={avgDaysToConvert !== null ? 'Tester grant → verified paid' : 'No data yet'}
                    accent="text-amber-400"
                />
            </div>

            {/* Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">
                    Conversions per Month
                </h2>

                {chartData.length < 2 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-600 gap-2">
                        <TrendingUp className="w-8 h-8" />
                        <p className="text-sm">Not enough data to render chart yet.</p>
                        {chartData.length === 1 && (
                            <p className="text-xs text-slate-700">{chartData[0].conversions} conversion in {chartData[0].label}</p>
                        )}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                dataKey="label"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="conversions"
                                stroke="#34d399"
                                strokeWidth={2}
                                dot={{ fill: '#34d399', r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Converted User Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
                        Converted Users
                    </h2>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                        {filteredConverted.length}
                    </span>
                </div>

                {filteredConverted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-2">
                        <DollarSign className="w-8 h-8" />
                        <p className="text-sm">No tester-to-paid conversions recorded yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Email
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Tester Since
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Paid Since
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Days to Convert
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Score
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredConverted.map(u => (
                                    <tr
                                        key={u.uid}
                                        className="hover:bg-slate-800/40 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-mono text-slate-200 text-xs truncate max-w-[220px]">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                                            {formatDate(u.testerGrantedAt)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                                            {formatDate(u.verifiedPaidAt)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {u.daysToConvert !== null ? (
                                                <span className="text-emerald-400 font-semibold text-xs">
                                                    {u.daysToConvert}d
                                                </span>
                                            ) : (
                                                <span className="text-slate-600 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {u.usageScore !== undefined ? (
                                                <span className="text-sky-400 font-semibold text-xs">
                                                    {u.usageScore}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};

export default TesterConversion;
