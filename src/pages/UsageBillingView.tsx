import { useState, useEffect, useMemo } from 'react';
import { getAllUsers } from '../services/firestoreService';
import { useAppSubscribers } from '../hooks/useAppSubscribers';
import type { User } from '../types';
import { Scale, Loader2, AlertTriangle } from 'lucide-react';
import { getBandFromScore, BAND_COLORS } from '../utils/usageScore';

type MismatchType = 'high-usage-no-billing' | 'low-usage-paid' | 'tester-power-user';

interface MismatchRow {
    user: User;
    usageScore: number;
    mismatchType: MismatchType;
}

const MISMATCH_LABELS: Record<MismatchType, string> = {
    'high-usage-no-billing': 'High Usage / No Billing',
    'low-usage-paid': 'Low Usage / Paid',
    'tester-power-user': 'Tester Power User',
};

const MISMATCH_COLORS: Record<MismatchType, string> = {
    'high-usage-no-billing': 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    'low-usage-paid': 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    'tester-power-user': 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
};

const BILLING_STATUS_COLORS: Record<string, string> = {
    paid: 'bg-emerald-500/15 text-emerald-400',
    tester: 'bg-purple-500/15 text-purple-400',
    comped: 'bg-sky-500/15 text-sky-400',
    trial: 'bg-blue-500/15 text-blue-400',
    unknown: 'bg-slate-500/15 text-slate-400',
};

function getMismatches(users: User[]): MismatchRow[] {
    const rows: MismatchRow[] = [];

    for (const user of users) {
        const score = user.usageScore ?? 0;
        const billing = user.billingStatus;

        if (score >= 60 && (billing === 'unknown' || billing === undefined)) {
            rows.push({ user, usageScore: score, mismatchType: 'high-usage-no-billing' });
        } else if (score < 10 && billing === 'paid') {
            rows.push({ user, usageScore: score, mismatchType: 'low-usage-paid' });
        } else if (user.testerOverride === true && score >= 85) {
            rows.push({ user, usageScore: score, mismatchType: 'tester-power-user' });
        }
    }

    return rows;
}

const ALL_FILTER = 'all';
type FilterValue = MismatchType | typeof ALL_FILTER;

export default function UsageBillingView() {
    const { filterByApp } = useAppSubscribers();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterValue>(ALL_FILTER);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
        setLoading(true);
        getAllUsers()
            .then((data) => {
                if (!cancelled) {
                    setUsers(filterByApp(data));
                }
            })
            .catch((err) => {
                console.error('[UsageBillingView] Failed to load users:', err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [filterByApp]);

    const allMismatches = useMemo(() => getMismatches(users), [users]);

    const counts: Record<MismatchType, number> = useMemo(() => ({
        'high-usage-no-billing': allMismatches.filter((r) => r.mismatchType === 'high-usage-no-billing').length,
        'low-usage-paid': allMismatches.filter((r) => r.mismatchType === 'low-usage-paid').length,
        'tester-power-user': allMismatches.filter((r) => r.mismatchType === 'tester-power-user').length,
    }), [allMismatches]);

    const filteredRows = useMemo(() => {
        if (filter === ALL_FILTER) return allMismatches;
        return allMismatches.filter((r) => r.mismatchType === filter);
    }, [allMismatches, filter]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl">
                    <Scale className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-white">Usage vs Billing</h1>
                    <p className="text-sm text-slate-400">Identify billing-usage mismatches</p>
                </div>
            </div>

            {/* Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* High Usage / No Billing */}
                <button
                    onClick={() => setFilter(filter === 'high-usage-no-billing' ? ALL_FILTER : 'high-usage-no-billing')}
                    className={`text-left bg-slate-900 border rounded-2xl p-5 transition-colors hover:border-amber-500/50 focus:outline-none ${filter === 'high-usage-no-billing' ? 'border-amber-500/60' : 'border-slate-800'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">High Usage / No Billing</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-3xl font-bold text-white">{counts['high-usage-no-billing']}</p>
                    <p className="text-xs text-slate-500 mt-1">Score ≥ 60, billing unknown</p>
                </button>

                {/* Low Usage / Paid */}
                <button
                    onClick={() => setFilter(filter === 'low-usage-paid' ? ALL_FILTER : 'low-usage-paid')}
                    className={`text-left bg-slate-900 border rounded-2xl p-5 transition-colors hover:border-rose-500/50 focus:outline-none ${filter === 'low-usage-paid' ? 'border-rose-500/60' : 'border-slate-800'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-rose-400 uppercase tracking-wide">Low Usage / Paid</span>
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-3xl font-bold text-white">{counts['low-usage-paid']}</p>
                    <p className="text-xs text-slate-500 mt-1">Score &lt; 10, billing paid</p>
                </button>

                {/* Tester Power Users */}
                <button
                    onClick={() => setFilter(filter === 'tester-power-user' ? ALL_FILTER : 'tester-power-user')}
                    className={`text-left bg-slate-900 border rounded-2xl p-5 transition-colors hover:border-purple-500/50 focus:outline-none ${filter === 'tester-power-user' ? 'border-purple-500/60' : 'border-slate-800'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">Tester Power Users</span>
                        <AlertTriangle className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-white">{counts['tester-power-user']}</p>
                    <p className="text-xs text-slate-500 mt-1">Tester override, score ≥ 85</p>
                </button>
            </div>

            {/* Mismatch Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Table Toolbar */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Mismatches</span>
                        {!loading && (
                            <span className="text-xs text-slate-500">
                                {filteredRows.length} {filteredRows.length === 1 ? 'user' : 'users'}
                            </span>
                        )}
                    </div>

                    {/* Filter Dropdown */}
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as FilterValue)}
                        className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500"
                    >
                        <option value={ALL_FILTER}>All mismatches</option>
                        <option value="high-usage-no-billing">High Usage / No Billing</option>
                        <option value="low-usage-paid">Low Usage / Paid</option>
                        <option value="tester-power-user">Tester Power Users</option>
                    </select>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading users...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredRows.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                        <Scale className="w-8 h-8 text-slate-700" />
                        <p className="text-sm font-medium text-slate-400">No mismatches found</p>
                        <p className="text-xs text-slate-600">
                            {filter === ALL_FILTER
                                ? 'All users appear to be correctly matched.'
                                : `No users match the "${MISMATCH_LABELS[filter as MismatchType]}" filter.`}
                        </p>
                    </div>
                )}

                {/* Table */}
                {!loading && filteredRows.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">
                                        User
                                    </th>
                                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3">
                                        Usage Score
                                    </th>
                                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3">
                                        Usage Band
                                    </th>
                                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3">
                                        Billing Status
                                    </th>
                                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3">
                                        Mismatch Type
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredRows.map(({ user, usageScore, mismatchType }) => {
                                    const band = getBandFromScore(usageScore);
                                    const bandColors = BAND_COLORS[band];
                                    const billing = user.billingStatus ?? 'unknown';
                                    const billingColorClass = BILLING_STATUS_COLORS[billing] ?? BILLING_STATUS_COLORS['unknown'];

                                    return (
                                        <tr
                                            key={user.uid}
                                            className="hover:bg-slate-800/40 transition-colors"
                                        >
                                            {/* User */}
                                            <td className="px-5 py-3">
                                                <p className="text-white font-medium truncate max-w-xs">
                                                    {user.email}
                                                </p>
                                                {(user.firstName || user.lastName) && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Usage Score */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-semibold tabular-nums ${bandColors.text}`}>
                                                        {usageScore}
                                                    </span>
                                                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${bandColors.bar}`}
                                                            style={{ width: `${usageScore}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Usage Band */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${bandColors.bg} ${bandColors.text} ${bandColors.border} border`}>
                                                    {band}
                                                </span>
                                            </td>

                                            {/* Billing Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${billingColorClass}`}>
                                                    {billing}
                                                </span>
                                            </td>

                                            {/* Mismatch Type */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${MISMATCH_COLORS[mismatchType]}`}>
                                                    {MISMATCH_LABELS[mismatchType]}
                                                </span>
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
}
