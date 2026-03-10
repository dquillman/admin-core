import React, { useState, useEffect } from 'react';
import { getUnresolvedBillingEvents, resolveUnresolvedEvent } from '../services/firestoreService';
import { useAuth } from '../hooks/useAuth';
import { AlertOctagon, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';

interface BillingEvent {
    id: string;
    type?: string;
    email?: string;
    stripeEventId?: string;
    createdAt?: unknown;
    resolved?: boolean;
    resolvedAt?: unknown;
    resolvedBy?: string;
    resolutionNotes?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface ResolveState {
    [eventId: string]: {
        open: boolean;
        notes: string;
        submitting: boolean;
        error: string | null;
    };
}

const formatDate = (ts: unknown): string => {
    if (!ts) return '—';
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') return (ts as { toDate: () => Date }).toDate().toLocaleString();
    if (ts instanceof Date) return ts.toLocaleString();
    return String(ts);
};

const UnresolvedBillingEventsPage: React.FC = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [events, setEvents] = useState<BillingEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [resolveState, setResolveState] = useState<ResolveState>({});
    const [resolvedExpanded, setResolvedExpanded] = useState(false);

    useEffect(() => {
        if (authLoading || !isAdmin) return;

        setLoading(true);
        setFetchError(null);

        getUnresolvedBillingEvents()
            .then((data) => {
                setEvents(data as BillingEvent[]);
            })
            .catch((err) => {
                setFetchError(err.message || 'Failed to load billing events.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [authLoading, isAdmin]);

    const unresolvedEvents = events.filter((e) => e.resolved !== true);
    const resolvedEvents = events.filter((e) => e.resolved === true);

    const openResolveForm = (id: string) => {
        setResolveState((prev) => ({
            ...prev,
            [id]: { open: true, notes: '', submitting: false, error: null },
        }));
    };

    const closeResolveForm = (id: string) => {
        setResolveState((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const setNotes = (id: string, notes: string) => {
        setResolveState((prev) => ({
            ...prev,
            [id]: { ...prev[id], notes },
        }));
    };

    const handleResolve = async (id: string) => {
        const state = resolveState[id];
        if (!state || !user) return;

        setResolveState((prev) => ({
            ...prev,
            [id]: { ...prev[id], submitting: true, error: null },
        }));

        try {
            await resolveUnresolvedEvent(id, { notes: state.notes, resolvedBy: user.uid });
            setEvents((prev) =>
                prev.map((e) =>
                    e.id === id
                        ? {
                              ...e,
                              resolved: true,
                              resolvedBy: user.uid,
                              resolutionNotes: state.notes,
                          }
                        : e
                )
            );
            closeResolveForm(id);
        } catch (err: unknown) {
            setResolveState((prev) => ({
                ...prev,
                [id]: { ...prev[id], submitting: false, error: err instanceof Error ? err.message : 'Failed to resolve.' },
            }));
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
                <p className="text-red-400 font-bold">Access Restricted</p>
                <p className="text-slate-400 text-sm mt-2">Admin privileges required.</p>
            </div>
        );
    }

    const renderTableRows = (rows: BillingEvent[], isResolved: boolean) => {
        if (rows.length === 0) {
            return (
                <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic text-sm">
                        {isResolved ? 'No resolved events.' : 'No unresolved events — all clear.'}
                    </td>
                </tr>
            );
        }

        return rows.map((event) => {
            const rs = resolveState[event.id];
            return (
                <React.Fragment key={event.id}>
                    <tr className="hover:bg-slate-800/30 transition-colors border-b border-slate-800 last:border-0">
                        {/* Date */}
                        <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                            {formatDate(event.createdAt)}
                        </td>

                        {/* Event Type */}
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
                                {event.type || '—'}
                            </span>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 text-sm text-slate-300">
                            {event.email || <span className="text-slate-600 italic">unknown</span>}
                        </td>

                        {/* Stripe Event ID */}
                        <td className="px-6 py-4 text-xs font-mono text-slate-500 max-w-[200px] truncate">
                            {event.stripeEventId || '—'}
                        </td>

                        {/* Actions / Resolution info */}
                        <td className="px-6 py-4">
                            {isResolved ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span className="text-xs text-emerald-400 font-semibold">Resolved</span>
                                    </div>
                                    {event.resolutionNotes && (
                                        <p className="text-xs text-slate-400 italic max-w-[240px] leading-snug">
                                            {event.resolutionNotes}
                                        </p>
                                    )}
                                    {event.resolvedBy && (
                                        <p className="text-[10px] text-slate-600 font-mono">
                                            by {event.resolvedBy}
                                        </p>
                                    )}
                                    {event.resolvedAt ? (
                                        <p className="text-[10px] text-slate-600">
                                            {formatDate(event.resolvedAt)}
                                        </p>
                                    ) : null}
                                </div>
                            ) : rs?.open ? null : (
                                <button
                                    onClick={() => openResolveForm(event.id)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
                                >
                                    Resolve
                                </button>
                            )}
                        </td>
                    </tr>

                    {/* Inline resolve form row */}
                    {!isResolved && rs?.open && (
                        <tr className="bg-slate-800/50 border-b border-slate-800">
                            <td colSpan={5} className="px-6 py-4">
                                <div className="space-y-3 max-w-2xl">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Resolution Notes
                                    </label>
                                    <textarea
                                        value={rs.notes}
                                        onChange={(e) => setNotes(event.id, e.target.value)}
                                        placeholder="Describe how this was resolved..."
                                        rows={3}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all resize-none"
                                    />
                                    {rs.error && (
                                        <p className="text-xs text-red-400">{rs.error}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleResolve(event.id)}
                                            disabled={rs.submitting}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {rs.submitting ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            )}
                                            Mark Resolved
                                        </button>
                                        <button
                                            onClick={() => closeResolveForm(event.id)}
                                            disabled={rs.submitting}
                                            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    )}
                </React.Fragment>
            );
        });
    };

    const tableHead = (
        <thead>
            <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Event Type</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Stripe Event ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
        </thead>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                    Unresolved Billing Events
                </h1>
                <p className="text-slate-400">
                    Stripe webhook events that need manual resolution.
                </p>
            </div>

            {/* Error banner */}
            {fetchError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                    <AlertOctagon className="w-5 h-5 shrink-0" />
                    {fetchError}
                </div>
            )}

            {/* Loading state */}
            {loading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Unresolved section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-800/40">
                            <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0" />
                            <div>
                                <h2 className="text-sm font-bold text-white">Unresolved</h2>
                                <p className="text-xs text-slate-500">
                                    {unresolvedEvents.length} event{unresolvedEvents.length !== 1 ? 's' : ''} pending
                                </p>
                            </div>
                            {unresolvedEvents.length > 0 && (
                                <span className="ml-auto px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                                    {unresolvedEvents.length}
                                </span>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                {tableHead}
                                <tbody className="divide-y divide-slate-800">
                                    {renderTableRows(unresolvedEvents, false)}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Resolved section (collapsible) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setResolvedExpanded((v) => !v)}
                            className="w-full flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-left"
                        >
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <div className="flex-1">
                                <h2 className="text-sm font-bold text-white">Resolved</h2>
                                <p className="text-xs text-slate-500">
                                    {resolvedEvents.length} event{resolvedEvents.length !== 1 ? 's' : ''} resolved
                                </p>
                            </div>
                            {resolvedEvents.length > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                    {resolvedEvents.length}
                                </span>
                            )}
                            <ChevronDown
                                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${resolvedExpanded ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {resolvedExpanded && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    {tableHead}
                                    <tbody className="divide-y divide-slate-800">
                                        {renderTableRows(resolvedEvents, true)}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default UnresolvedBillingEventsPage;
