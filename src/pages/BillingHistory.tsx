import React, { useState, useEffect, useCallback } from 'react';
import { getBillingAuditLogs } from '../services/firestoreService';
import type { AuditTimelineEntry } from '../services/firestoreService';
import { Receipt, Loader2, Filter } from 'lucide-react';

const ACTION_OPTIONS = [
    { value: '', label: 'All Actions' },
    { value: 'SET_BILLING_STATUS', label: 'SET_BILLING_STATUS' },
    { value: 'GRANT_TESTER_PRO', label: 'GRANT_TESTER_PRO' },
    { value: 'REVOKE_TESTER_PRO', label: 'REVOKE_TESTER_PRO' },
    { value: 'FIX_TESTER', label: 'FIX_TESTER' },
];

const LIMIT_OPTIONS = [25, 50, 100, 200];

const ACTION_COLORS: Record<string, string> = {
    SET_BILLING_STATUS: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    GRANT_TESTER_PRO: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    REVOKE_TESTER_PRO: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    FIX_TESTER: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

const formatTimestamp = (ts: any): string => {
    if (!ts) return '-';
    if (typeof ts.toDate === 'function') {
        return ts.toDate().toLocaleString();
    }
    return String(ts);
};

const truncateJson = (obj: any, maxLen = 120): string => {
    if (!obj) return '-';
    try {
        const str = JSON.stringify(obj);
        return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
    } catch {
        return String(obj);
    }
};

const BillingHistory: React.FC = () => {
    const [entries, setEntries] = useState<AuditTimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [limitCount, setLimitCount] = useState(50);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getBillingAuditLogs({
                actionFilter: actionFilter || undefined,
                limitCount,
            });
            setEntries(data);
        } catch (err: unknown) {
            console.error('[BillingHistory] fetch error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load billing history.');
        } finally {
            setLoading(false);
        }
    }, [actionFilter, limitCount]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Billing History</h1>
                    <p className="text-slate-400">Billing-related admin actions</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-3 flex items-center gap-3">
                        <Receipt className="w-5 h-5 text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Log Entries</span>
                            <span className="text-white font-bold text-lg leading-tight">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : entries.length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                        <Filter className="w-4 h-4" />
                        <span>Filter:</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Action Type
                        </label>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                        >
                            {ACTION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Limit
                        </label>
                        <select
                            value={limitCount}
                            onChange={(e) => setLimitCount(Number(e.target.value))}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                        >
                            {LIMIT_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n} entries
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="ml-auto">
                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-300 hover:text-white hover:border-slate-700 transition-all font-semibold text-sm disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl px-6 py-4 text-rose-400 text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                {loading && (
                    <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Action</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Admin</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Target User</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {!loading && entries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-4 bg-slate-950 rounded-full border border-slate-800">
                                                <Receipt className="w-8 h-8 text-slate-700" />
                                            </div>
                                            <div>
                                                <p className="text-slate-300 font-medium">No billing events found</p>
                                                <p className="text-slate-500 text-sm mt-1">
                                                    {actionFilter
                                                        ? `No entries for action "${actionFilter}". Try selecting a different filter.`
                                                        : 'Billing audit entries will appear here as actions are taken.'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => {
                                    const actionColor = ACTION_COLORS[entry.action] ?? 'text-slate-400 bg-slate-800 border-slate-700';
                                    return (
                                        <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors group">
                                            {/* Date */}
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className="text-sm text-slate-300 font-mono">
                                                    {formatTimestamp(entry.createdAt)}
                                                </span>
                                            </td>

                                            {/* Action */}
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wider ${actionColor}`}>
                                                    {entry.action}
                                                </span>
                                            </td>

                                            {/* Admin */}
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-0.5">
                                                    {entry.adminEmail ? (
                                                        <span className="text-sm text-slate-200 font-medium truncate max-w-[180px]">
                                                            {entry.adminEmail}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-500 italic">unknown</span>
                                                    )}
                                                    <span className="text-[11px] text-slate-600 font-mono truncate max-w-[180px]">
                                                        {entry.adminUid}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Target User */}
                                            <td className="px-6 py-5">
                                                {entry.targetUserId ? (
                                                    <span className="text-sm text-slate-400 font-mono truncate max-w-[160px] block">
                                                        {entry.targetUserId}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 text-sm">-</span>
                                                )}
                                            </td>

                                            {/* Details */}
                                            <td className="px-6 py-5 max-w-xs">
                                                {entry.metadata ? (
                                                    <span
                                                        className="text-xs text-slate-500 font-mono truncate block"
                                                        title={JSON.stringify(entry.metadata, null, 2)}
                                                    >
                                                        {truncateJson(entry.metadata)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 text-sm">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && entries.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-slate-500 text-sm">
                            Showing <span className="text-slate-300 font-semibold">{entries.length}</span> entries
                            {actionFilter && (
                                <span> for <span className="text-sky-400 font-semibold">{actionFilter}</span></span>
                            )}
                        </span>
                        {entries.length >= limitCount && (
                            <span className="text-amber-500/70 text-xs font-medium">
                                Limit reached — increase the limit to see more entries
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BillingHistory;
