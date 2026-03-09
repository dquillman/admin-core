import { useState, useEffect, useMemo } from 'react';
import { getTesterUsers, searchUsers } from '../services/firestoreService';
import { useAppSubscribers } from '../hooks/useAppSubscribers';
import type { User } from '../types';
import { TrendingDown, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FunnelStage {
    name: string;
    count: number;
    color: string;
}

const STAGE_COLORS: Record<string, string> = {
    Invited: '#8b5cf6',
    Activated: '#3b82f6',
    Engaged: '#10b981',
    Converted: '#f59e0b',
};

interface StageRow {
    name: string;
    count: number;
    pctOfPrev: string;
    pctOfTotal: string;
    color: string;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const { name, count } = payload[0].payload;
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <p className="text-slate-300 font-medium">{name}</p>
                <p className="text-white font-bold">{count} users</p>
            </div>
        );
    }
    return null;
};

export default function TesterFunnel() {
    const { filterByApp } = useAppSubscribers();
    const [testerUsers, setTesterUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [testers, users] = await Promise.all([
                    getTesterUsers(),
                    searchUsers(''),
                ]);
                setTesterUsers(filterByApp(testers));
                setAllUsers(filterByApp(users));
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filterByApp]);

    const stages = useMemo<FunnelStage[]>(() => {
        const invited = testerUsers.length;
        const activated = testerUsers.filter(u => (u.usageScore ?? 0) > 0).length;
        const engaged = testerUsers.filter(u => (u.usageScore ?? 0) >= 30).length;
        const converted = allUsers.filter(
            u => u.billingStatus === 'paid' && u.testerGrantedAt != null
        ).length;

        return [
            { name: 'Invited', count: invited, color: STAGE_COLORS.Invited },
            { name: 'Activated', count: activated, color: STAGE_COLORS.Activated },
            { name: 'Engaged', count: engaged, color: STAGE_COLORS.Engaged },
            { name: 'Converted', count: converted, color: STAGE_COLORS.Converted },
        ];
    }, [testerUsers, allUsers]);

    const stageRows = useMemo<StageRow[]>(() => {
        const total = stages[0]?.count ?? 0;
        return stages.map((stage, idx) => {
            const prev = idx === 0 ? stage.count : stages[idx - 1].count;
            const pctOfPrev =
                prev === 0 ? '—' : `${Math.round((stage.count / prev) * 100)}%`;
            const pctOfTotal =
                total === 0 ? '—' : `${Math.round((stage.count / total) * 100)}%`;
            return {
                name: stage.name,
                count: stage.count,
                pctOfPrev,
                pctOfTotal,
                color: stage.color,
            };
        });
    }, [stages]);

    const isEmpty = !loading && testerUsers.length === 0;

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <TrendingDown className="text-purple-400" size={24} />
                    <h1 className="text-2xl font-bold text-white">Tester Funnel</h1>
                </div>
                <p className="text-slate-400 text-sm ml-9">Tester lifecycle stages</p>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-purple-400" size={32} />
                    <span className="ml-3 text-slate-400 text-sm">Loading tester data…</span>
                </div>
            )}

            {/* Error state */}
            {!loading && error && (
                <div className="bg-red-950 border border-red-800 rounded-2xl p-6 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* Empty state */}
            {isEmpty && !error && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                    <TrendingDown className="mx-auto text-slate-600 mb-3" size={40} />
                    <p className="text-slate-400 text-sm">No tester users found.</p>
                </div>
            )}

            {/* Main content */}
            {!loading && !error && !isEmpty && (
                <div className="space-y-6">
                    {/* Stage summary tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {stages.map(stage => (
                            <div
                                key={stage.name}
                                className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                            >
                                <p className="text-xs text-slate-400 mb-1">{stage.name}</p>
                                <p
                                    className="text-3xl font-bold"
                                    style={{ color: stage.color }}
                                >
                                    {stage.count}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Bar chart */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-slate-300 mb-4">
                            Funnel Overview
                        </h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart
                                layout="vertical"
                                data={stages}
                                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                            >
                                <XAxis
                                    type="number"
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={72}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ fill: 'rgba(148,163,184,0.06)' }}
                                />
                                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={36}>
                                    {stages.map(stage => (
                                        <Cell key={stage.name} fill={stage.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stage breakdown table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-800">
                            <h2 className="text-sm font-semibold text-slate-300">
                                Stage Breakdown
                            </h2>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Stage
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Count
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        % of Prev
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        % of Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {stageRows.map((row, idx) => (
                                    <tr
                                        key={row.name}
                                        className={
                                            idx < stageRows.length - 1
                                                ? 'border-b border-slate-800/60'
                                                : ''
                                        }
                                    >
                                        <td className="px-6 py-3">
                                            <span
                                                className="inline-flex items-center gap-2 font-medium"
                                                style={{ color: row.color }}
                                            >
                                                <span
                                                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: row.color }}
                                                />
                                                {row.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right text-white font-semibold">
                                            {row.count}
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-400">
                                            {row.pctOfPrev}
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-400">
                                            {row.pctOfTotal}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
