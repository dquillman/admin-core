import React, { useState, useEffect, useMemo } from 'react';
import { getTesterUsers } from '../services/firestoreService';
import { useAppSubscribers } from '../hooks/useAppSubscribers';
import { getBandFromScore, BAND_COLORS, ALL_BANDS, getScoreConfidence, CONFIDENCE_COLORS } from '../utils/usageScore';
import type { User, UsageBand } from '../types';
import { APP_OPTIONS } from '../constants';
import { Filter, Users, BarChart2, Zap, CheckCircle2 } from 'lucide-react';

type SortKey = 'score' | 'band' | 'activeDays' | 'coreActions' | 'completions';
type SortDir = 'asc' | 'desc';

const BAND_RANK: Record<UsageBand, number> = {
    'Power User': 5,
    'Active': 4,
    'Engaged': 3,
    'Curious': 2,
    'Dormant': 1,
};

const TesterUsageDashboard: React.FC = () => {
    const { filterByApp } = useAppSubscribers();
    const [testers, setTesters] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTester, setFilterTester] = useState<string>('all');
    const [filterApp, setFilterApp] = useState<string>('all');
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
        setLoading(true);
        getTesterUsers()
            .then(data => setTesters(filterByApp(data)))
            .catch((err) => console.error('Failed to fetch testers:', err))
            .finally(() => setLoading(false));
    }, [filterByApp]);

    const testerLabel = (u: User): string => {
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.displayName || '';
        return name ? `${name} (${u.email})` : (u.email || u.uid);
    };

    const toggleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const filteredTesters = useMemo(() => {
        return testers.filter(u => {
            if (filterTester !== 'all' && u.email !== filterTester) return false;
            if (filterApp !== 'all' && u.app !== filterApp) return false;
            return true;
        });
    }, [testers, filterTester, filterApp]);

    const sortedUsers = useMemo(() => {
        const arr = [...filteredTesters];
        const dir = sortDir === 'desc' ? -1 : 1;
        arr.sort((a, b) => {
            let av: number;
            let bv: number;
            switch (sortKey) {
                case 'score':
                    av = a.usageScore ?? 0;
                    bv = b.usageScore ?? 0;
                    break;
                case 'band':
                    av = BAND_RANK[a.usageBand || getBandFromScore(a.usageScore ?? 0)];
                    bv = BAND_RANK[b.usageBand || getBandFromScore(b.usageScore ?? 0)];
                    break;
                case 'activeDays':
                    av = a.usageBreakdown?.activeDays ?? 0;
                    bv = b.usageBreakdown?.activeDays ?? 0;
                    break;
                case 'coreActions':
                    av = a.usageBreakdown?.coreActions ?? 0;
                    bv = b.usageBreakdown?.coreActions ?? 0;
                    break;
                case 'completions':
                    av = a.usageBreakdown?.completions ?? 0;
                    bv = b.usageBreakdown?.completions ?? 0;
                    break;
            }
            if (av !== bv) return (av - bv) * dir;
            // Stable tie-break: uid
            return a.uid.localeCompare(b.uid);
        });
        return arr;
    }, [filteredTesters, sortKey, sortDir]);

    // Summary aggregates
    const totalCount = filteredTesters.length;
    const activeCount = filteredTesters.filter(u => (u.usageScore ?? 0) > 0).length;
    const avgScore = totalCount > 0
        ? Math.round(filteredTesters.reduce((sum, u) => sum + (u.usageScore ?? 0), 0) / totalCount)
        : 0;
    const bandCounts = useMemo(() => {
        const counts: Record<UsageBand, number> = {
            'Power User': 0, 'Active': 0, 'Engaged': 0, 'Curious': 0, 'Dormant': 0
        };
        filteredTesters.forEach(u => {
            const band = u.usageBand || getBandFromScore(u.usageScore ?? 0);
            counts[band]++;
        });
        return counts;
    }, [filteredTesters]);

    const sortIndicator = (col: SortKey) => {
        if (col !== sortKey) return null;
        return <span className="ml-1 text-brand-400">{sortDir === 'desc' ? '↓' : '↑'}</span>;
    };

    const thClass = (col: SortKey, align?: 'right') =>
        `px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer select-none hover:text-slate-300 transition-colors${align === 'right' ? ' text-right' : ''}${col === sortKey ? ' text-slate-300' : ''}`;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Tester Usage Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">30-day rolling usage across all active testers</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                    <Users className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                        <div className="text-2xl font-bold text-white">{totalCount}</div>
                        <div className="text-xs text-slate-500">Total Testers</div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                        <div className="text-2xl font-bold text-white">{activeCount}</div>
                        <div className="text-xs text-slate-500">With Activity</div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                    <BarChart2 className="w-5 h-5 text-brand-400 shrink-0" />
                    <div>
                        <div className="text-2xl font-bold text-white">{avgScore}</div>
                        <div className="text-xs text-slate-500">Avg Score</div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                        <div className="text-2xl font-bold text-white">{bandCounts['Power User']}</div>
                        <div className="text-xs text-slate-500">Power Users</div>
                    </div>
                </div>
            </div>

            {/* Band Distribution Bar */}
            {totalCount > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Band Distribution</div>
                    <div className="flex gap-2 flex-wrap">
                        {ALL_BANDS.map(band => {
                            const count = bandCounts[band];
                            const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                            const colors = BAND_COLORS[band];
                            return (
                                <div key={band} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${colors.bg} ${colors.border} ${colors.text}`}>
                                    {band}: {count} ({pct}%)
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                    <Filter className="w-4 h-4" />
                    <span>Filter:</span>
                </div>
                <select
                    value={filterTester}
                    onChange={(e) => setFilterTester(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2.5"
                >
                    <option value="all">All Testers</option>
                    {testers.map(u => (
                        <option key={u.uid} value={u.email || u.uid}>
                            {testerLabel(u)}
                        </option>
                    ))}
                </select>
                <select
                    value={filterApp}
                    onChange={(e) => setFilterApp(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2.5"
                >
                    <option value="all">All Apps</option>
                    {APP_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-sm">Loading testers...</div>
                ) : filteredTesters.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">No users found for selected filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tester</th>
                                    <th className={thClass('score')} onClick={() => toggleSort('score')}>
                                        Score{sortIndicator("score")}
                                    </th>
                                    <th className={thClass('band')} onClick={() => toggleSort('band')}>
                                        Band{sortIndicator("band")}
                                    </th>
                                    <th className={thClass('activeDays', 'right')} onClick={() => toggleSort('activeDays')}>
                                        Active Days{sortIndicator("activeDays")}
                                    </th>
                                    <th className={thClass('coreActions', 'right')} onClick={() => toggleSort('coreActions')}>
                                        Core Actions{sortIndicator("coreActions")}
                                    </th>
                                    <th className={thClass('completions', 'right')} onClick={() => toggleSort('completions')}>
                                        Completions{sortIndicator("completions")}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {sortedUsers.map(u => {
                                    const score = u.usageScore ?? 0;
                                    const band = u.usageBand || getBandFromScore(score);
                                    const colors = BAND_COLORS[band];
                                    const bd = u.usageBreakdown;
                                    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.displayName || '';
                                    return (
                                        <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white text-sm">{name || u.email}</div>
                                                {name && <div className="text-xs text-slate-500">{u.email}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 min-w-[100px]">
                                                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${colors.bar}`}
                                                            style={{ width: `${score}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[11px] font-bold tabular-nums w-6 text-right ${colors.text}`}>{score}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors.bg} ${colors.border} ${colors.text}`}>
                                                    {band}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm text-slate-300">
                                                {bd?.activeDays ?? 0}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm text-slate-300">
                                                {bd?.coreActions ?? 0}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm text-slate-300">
                                                {bd?.completions ?? 0}
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const confidence = getScoreConfidence(bd);
                                                    const cc = CONFIDENCE_COLORS[confidence];
                                                    return (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cc.bg} ${cc.border} ${cc.text}`}>
                                                            {confidence}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TesterUsageDashboard;
