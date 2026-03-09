import React, { useState, useEffect, useMemo } from 'react';
import { getAllUsers } from '../services/firestoreService';
import { useAppSubscribers } from '../hooks/useAppSubscribers';
import type { User } from '../types';
import { UserX, Loader2 } from 'lucide-react';
import { getBandFromScore, BAND_COLORS } from '../utils/usageScore';

const DORMANT_THRESHOLD = 10;
const LOW_ACTIVITY_THRESHOLD = 30;

const formatDate = (ts: any): string => {
    if (!ts) return '—';
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return '—';
    }
};

const InactivePaidUsers: React.FC = () => {
    const { filterByApp } = useAppSubscribers();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getAllUsers()
            .then(data => setAllUsers(filterByApp(data)))
            .catch((err) => console.error('Failed to fetch users:', err))
            .finally(() => setLoading(false));
    }, [filterByApp]);

    const paidUsers = useMemo(() => {
        return allUsers
            .filter(u => u.billingStatus === 'paid')
            .sort((a, b) => (a.usageScore ?? 0) - (b.usageScore ?? 0));
    }, [allUsers]);

    const totalPaid = paidUsers.length;
    const dormantCount = paidUsers.filter(u => (u.usageScore ?? 0) < DORMANT_THRESHOLD).length;
    const lowActivityCount = paidUsers.filter(u => (u.usageScore ?? 0) < LOW_ACTIVITY_THRESHOLD).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Inactive Paid Users</h1>
                <p className="text-sm text-slate-500 mt-1">Paid users sorted by lowest activity</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                    <UserX className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                        <div className="text-2xl font-bold text-white">{totalPaid}</div>
                        <div className="text-xs text-slate-500">Total Paid Users</div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-red-900/40 rounded-2xl p-4 flex items-center gap-3">
                    <UserX className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                        <div className="text-2xl font-bold text-red-400">{dormantCount}</div>
                        <div className="text-xs text-slate-500">Dormant (score &lt; {DORMANT_THRESHOLD})</div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4 flex items-center gap-3">
                    <UserX className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                        <div className="text-2xl font-bold text-amber-400">{lowActivityCount}</div>
                        <div className="text-xs text-slate-500">Low Activity (score &lt; {LOW_ACTIVITY_THRESHOLD})</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3 text-slate-500 text-sm">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Loading paid users...</span>
                    </div>
                ) : paidUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <UserX className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No paid users found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Usage Score</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Band</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Billing Source</th>
                                    {/* No lastActiveAt field on User type; showing verifiedPaidAt instead */}
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Verified Paid</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {paidUsers.map(u => {
                                    const score = u.usageScore ?? 0;
                                    const band = u.usageBand || getBandFromScore(score);
                                    const colors = BAND_COLORS[band];
                                    const isDormant = score < DORMANT_THRESHOLD;
                                    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.displayName || '';
                                    return (
                                        <tr
                                            key={u.uid}
                                            className={`transition-colors hover:bg-slate-800/30 ${isDormant ? 'bg-red-500/5' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white text-sm">{name || u.email}</div>
                                                {name && <div className="text-xs text-slate-500">{u.email}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 min-w-[110px]">
                                                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${colors.bar}`}
                                                            style={{ width: `${score}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[11px] font-bold tabular-nums w-6 text-right ${colors.text}`}>
                                                        {score}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors.bg} ${colors.border} ${colors.text}`}>
                                                    {band}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.billingSource ? (
                                                    <span className="text-xs text-slate-300 capitalize">{u.billingSource}</span>
                                                ) : (
                                                    <span className="text-xs text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {formatDate(u.verifiedPaidAt)}
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

export default InactivePaidUsers;
