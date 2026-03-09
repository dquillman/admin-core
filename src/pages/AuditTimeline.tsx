import React, { useState, useEffect, useCallback } from 'react';
import { getAuditTimeline } from '../services/firestoreService';
import type { AuditTimelineEntry } from '../services/firestoreService';
import { History, Loader2, Filter, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 50;

const ACTION_BADGE_CLASSES: Record<string, string> = {
    GRANT_TESTER_PRO: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    REVOKE_TESTER_PRO: 'bg-red-500/10 text-red-400 border-red-500/20',
    SET_BILLING_STATUS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function getActionBadgeClass(action: string): string {
    return ACTION_BADGE_CLASSES[action] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

function formatTimestamp(ts: { toDate?: () => Date; seconds?: number } | null | undefined): string {
    if (!ts) return '—';
    const date = typeof ts.toDate === 'function' ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null;
    if (!date) return '—';
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

interface TimelineEntryRowProps {
    entry: AuditTimelineEntry;
    isLast: boolean;
}

const TimelineEntryRow: React.FC<TimelineEntryRowProps> = ({ entry, isLast }) => {
    const [expanded, setExpanded] = useState(false);
    const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

    return (
        <div className="flex gap-4">
            {/* Left gutter: line + dot */}
            <div className="flex flex-col items-center flex-shrink-0 w-6">
                <div className="w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-500 mt-1 flex-shrink-0" />
                {!isLast && <div className="flex-1 w-px bg-slate-700 mt-1" />}
            </div>

            {/* Entry card */}
            <div className="pb-6 flex-1 min-w-0">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex flex-wrap items-start gap-2 justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeClass(entry.action)}`}
                            >
                                {entry.action}
                            </span>
                            {entry.adminEmail && (
                                <span className="text-sm text-slate-300 font-medium truncate max-w-xs">
                                    {entry.adminEmail}
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                            {formatTimestamp(entry.createdAt)}
                        </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {entry.adminUid && (
                            <span>
                                Admin UID:{' '}
                                <span className="text-slate-400 font-mono">{entry.adminUid}</span>
                            </span>
                        )}
                        {entry.targetUserId && (
                            <span>
                                Target:{' '}
                                <span className="text-slate-400 font-mono">{entry.targetUserId}</span>
                            </span>
                        )}
                    </div>

                    {hasMetadata && (
                        <div className="mt-3">
                            <button
                                onClick={() => setExpanded(v => !v)}
                                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                <ChevronDown
                                    size={13}
                                    className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
                                />
                                {expanded ? 'Hide' : 'Show'} metadata
                            </button>
                            {expanded && (
                                <pre className="mt-2 p-3 rounded-xl bg-slate-950 text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap break-all border border-slate-800">
                                    {JSON.stringify(entry.metadata, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AuditTimeline: React.FC = () => {
    const [entries, setEntries] = useState<AuditTimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [limitCount, setLimitCount] = useState(PAGE_SIZE);

    // Filter state
    const [actionInput, setActionInput] = useState('');
    const [adminInput, setAdminInput] = useState('');
    const [appliedAction, setAppliedAction] = useState('');
    const [appliedAdmin, setAppliedAdmin] = useState('');

    const fetchEntries = useCallback(
        async (limit: number, isLoadMore = false) => {
            if (isLoadMore) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            setError(null);
            try {
                const filters: {
                    actionFilter?: string;
                    adminFilter?: string;
                    limitCount?: number;
                } = { limitCount: limit };
                if (appliedAction) filters.actionFilter = appliedAction;
                if (appliedAdmin) filters.adminFilter = appliedAdmin;

                const { entries: fetched } = await getAuditTimeline(filters);
                setEntries(fetched);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load audit timeline.');
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [appliedAction, appliedAdmin]
    );

    useEffect(() => {
        setLimitCount(PAGE_SIZE);
        fetchEntries(PAGE_SIZE);
    }, [fetchEntries]);

    // Refetch when limitCount increases (load more)
    useEffect(() => {
        if (limitCount > PAGE_SIZE) {
            fetchEntries(limitCount, true);
        }
    }, [limitCount, fetchEntries]);

    const handleApplyFilters = () => {
        setAppliedAction(actionInput.trim());
        setAppliedAdmin(adminInput.trim());
    };

    const handleClearFilters = () => {
        setActionInput('');
        setAdminInput('');
        setAppliedAction('');
        setAppliedAdmin('');
    };

    const handleLoadMore = () => {
        setLimitCount(prev => prev + PAGE_SIZE);
    };

    const filtersActive = appliedAction !== '' || appliedAdmin !== '';

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                        <History size={20} className="text-slate-300" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-white">Audit Timeline</h1>
                        <p className="text-sm text-slate-500">Complete admin action history</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter size={14} className="text-slate-500" />
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Filters</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <input
                            type="text"
                            placeholder="Action type (e.g. GRANT_TESTER_PRO)"
                            value={actionInput}
                            onChange={e => setActionInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
                            className="flex-1 min-w-48 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500 transition"
                        />
                        <input
                            type="text"
                            placeholder="Admin UID"
                            value={adminInput}
                            onChange={e => setAdminInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
                            className="flex-1 min-w-40 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500 transition"
                        />
                        <button
                            onClick={handleApplyFilters}
                            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm text-white font-medium transition-colors"
                        >
                            Apply
                        </button>
                        {filtersActive && (
                            <button
                                onClick={handleClearFilters}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    {filtersActive && (
                        <p className="mt-2 text-xs text-slate-500">
                            Filtering by
                            {appliedAction ? ` action "${appliedAction}"` : ''}
                            {appliedAction && appliedAdmin ? ' and' : ''}
                            {appliedAdmin ? ` admin UID "${appliedAdmin}"` : ''}
                        </p>
                    )}
                </div>

                {/* Timeline */}
                <div>
                    {loading ? (
                        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="text-sm">Loading audit entries...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                            <p className="text-red-400 text-sm">{error}</p>
                            <button
                                onClick={() => fetchEntries(limitCount)}
                                className="mt-3 text-xs text-slate-400 hover:text-white underline transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                            <History size={32} className="mx-auto text-slate-700 mb-3" />
                            <p className="text-slate-500 text-sm">No audit entries found.</p>
                            {filtersActive && (
                                <p className="text-slate-600 text-xs mt-1">Try adjusting or clearing your filters.</p>
                            )}
                        </div>
                    ) : (
                        <div className="pl-1">
                            {entries.map((entry, idx) => (
                                <TimelineEntryRow
                                    key={entry.id}
                                    entry={entry}
                                    isLast={idx === entries.length - 1}
                                />
                            ))}

                            {/* Load More */}
                            <div className="flex justify-center pt-2 pb-4">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore || entries.length < limitCount}
                                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm text-slate-300 hover:text-white transition-colors border border-slate-700"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Loading...
                                        </>
                                    ) : entries.length < limitCount ? (
                                        'All entries loaded'
                                    ) : (
                                        <>
                                            <ChevronDown size={14} />
                                            Load more
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditTimeline;
