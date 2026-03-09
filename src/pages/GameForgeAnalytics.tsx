import React, { useState, useEffect, useMemo } from 'react';
import { getAnalytics, getGameAnalytics, getGames } from '../services/gameForgeService';
import type { GameForgeAnalytics as AnalyticsType } from '../types/gameForge';
import {
    Loader2,
    Activity,
    Users,
    DollarSign,
    Clock,
    TrendingUp,
} from 'lucide-react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

// ---- helpers ----

const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(amount);

const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
};

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
            <p className="text-2xl font-bold text-white leading-none">{value}</p>
            {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
    </div>
);

// ---- dark tooltip ----

interface TooltipPayloadEntry {
    name?: string;
    value?: string | number;
    color?: string;
    stroke?: string;
}

interface DarkTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
}

const DarkTooltip: React.FC<DarkTooltipProps> = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm shadow-xl">
            <p className="text-slate-300 font-medium mb-1">{label}</p>
            {payload.map((p: TooltipPayloadEntry, i: number) => (
                <p key={i} style={{ color: p.color || p.stroke || '#3b82f6' }}>
                    {p.name}: <span className="font-semibold">{typeof p.value === 'number' && p.name === 'Revenue' ? formatCurrency(p.value) : p.value}</span>
                </p>
            ))}
        </div>
    );
};

// ---- page ----

interface GameOption {
    id: string;
    title: string;
}

const GameForgeAnalytics: React.FC = () => {
    const [snapshots, setSnapshots] = useState<AnalyticsType[]>([]);
    const [games, setGames] = useState<GameOption[]>([]);
    const [selectedGame, setSelectedGame] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load games list + analytics
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
        setLoading(true);
        setError(null);
        Promise.all([
            getGames().catch(() => []),
            getAnalytics().catch(() => []),
        ])
            .then(([fetchedGames, fetchedAnalytics]) => {
                setGames(fetchedGames.map((g) => ({ id: g.id, title: g.title })));
                setSnapshots(fetchedAnalytics as unknown as AnalyticsType[]);
            })
            .catch((err) => setError(err?.message || 'Failed to load analytics.'))
            .finally(() => setLoading(false));
    }, []);

    // When a specific game is selected, fetch its analytics
    useEffect(() => {
        if (selectedGame === 'all') return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
        setLoading(true);
        getGameAnalytics(selectedGame)
            .then((data) => {
                if (data) {
                    setSnapshots([data as unknown as AnalyticsType]);
                } else {
                    setSnapshots([]);
                }
            })
            .catch(() => setSnapshots([]))
            .finally(() => setLoading(false));
    }, [selectedGame]);

    // Reload all when switching back to 'all'
    useEffect(() => {
        if (selectedGame !== 'all') return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
        setLoading(true);
        getAnalytics()
            .then((data) => setSnapshots(data as unknown as AnalyticsType[]))
            .catch(() => setSnapshots([]))
            .finally(() => setLoading(false));
    }, [selectedGame]);

    // Latest snapshot KPIs (use most recent entry)
    const latest = useMemo(() => {
        if (snapshots.length === 0) return null;
        return snapshots[0]; // already sorted desc by createdAt
    }, [snapshots]);

    // Chart data: sorted chronologically
    const chartData = useMemo(
        () =>
            [...snapshots]
                .reverse()
                .map((s) => ({
                    period: s.period,
                    DAU: s.dau,
                    MAU: s.mau,
                    Revenue: s.revenue,
                    Retention: s.retention,
                })),
        [snapshots],
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                <span>Loading analytics...</span>
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
            {/* Header + game selector */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics</h1>
                    <p className="text-slate-400 text-sm mt-1">Platform performance metrics and trends</p>
                </div>
                <select
                    value={selectedGame}
                    onChange={(e) => setSelectedGame(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                    <option value="all">All Games</option>
                    {games.map((g) => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                </select>
            </div>

            {/* KPI row */}
            {latest ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                    <StatCard
                        icon={<Activity className="h-5 w-5" />}
                        label="DAU"
                        value={latest.dau.toLocaleString()}
                        sub="Daily Active Users"
                        accent="text-blue-400"
                    />
                    <StatCard
                        icon={<Users className="h-5 w-5" />}
                        label="MAU"
                        value={latest.mau.toLocaleString()}
                        sub="Monthly Active Users"
                        accent="text-violet-400"
                    />
                    <StatCard
                        icon={<DollarSign className="h-5 w-5" />}
                        label="Revenue"
                        value={formatCurrency(latest.revenue)}
                        accent="text-emerald-400"
                    />
                    <StatCard
                        icon={<TrendingUp className="h-5 w-5" />}
                        label="Retention"
                        value={`${latest.retention.toFixed(1)}%`}
                        accent="text-amber-400"
                    />
                    <StatCard
                        icon={<Clock className="h-5 w-5" />}
                        label="Avg Session"
                        value={formatDuration(latest.avgSessionDuration)}
                        accent="text-rose-400"
                    />
                </div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
                    No analytics data available yet.
                </div>
            )}

            {/* Charts */}
            {chartData.length > 1 && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* DAU / MAU line chart */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h2 className="text-white font-semibold mb-4 text-sm">DAU / MAU Over Time</h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                    dataKey="period"
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
                                <Line type="monotone" dataKey="DAU" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="MAU" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Revenue area chart */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h2 className="text-white font-semibold mb-4 text-sm">Revenue Over Time</h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                    dataKey="period"
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    axisLine={{ stroke: '#334155' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    axisLine={{ stroke: '#334155' }}
                                    tickLine={false}
                                />
                                <Tooltip content={<DarkTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="Revenue"
                                    name="Revenue"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="url(#revenueGradient)"
                                    dot={{ fill: '#10b981', r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Retention curve */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 xl:col-span-2">
                        <h2 className="text-white font-semibold mb-4 text-sm">Retention Curve</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                    dataKey="period"
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    axisLine={{ stroke: '#334155' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    axisLine={{ stroke: '#334155' }}
                                    tickLine={false}
                                    domain={[0, 100]}
                                    unit="%"
                                />
                                <Tooltip content={<DarkTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="Retention"
                                    name="Retention %"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    fill="url(#retentionGradient)"
                                    dot={{ fill: '#f59e0b', r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameForgeAnalytics;
