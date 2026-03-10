import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToReleaseVersions, getIssuesByPFV } from '../services/firestoreService';
import { useApp } from '../context/AppContext';
import type { ReportedIssue, ReleaseVersion } from '../types';
import { ClipboardList, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ISSUE_STATUS, getStatusColor } from '../constants';

// Statuses that count as "resolved" for readiness calculation
const RESOLVED_STATUSES = new Set<string>([
    ISSUE_STATUS.FIXED,
    ISSUE_STATUS.RELEASED,
    ISSUE_STATUS.CLOSED,
]);

const SEVERITY_ORDER: Record<string, number> = { S1: 0, S2: 1, S3: 2, S4: 3 };

function getSeverityColor(severity: string | undefined): string {
    switch (severity) {
        case 'S1': return 'bg-red-500/10 text-red-400 border-red-500/20';
        case 'S2': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        case 'S3': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        case 'S4': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        default:   return 'bg-slate-700/50 text-slate-500 border-slate-600/30';
    }
}

function friendlyStatus(status: string | undefined): string {
    switch (status) {
        case ISSUE_STATUS.NEW:      return 'New';
        case ISSUE_STATUS.REVIEWED: return 'Reviewed';
        case ISSUE_STATUS.BACKLOGGED: return 'Backlogged';
        case ISSUE_STATUS.WORKING:  return 'In Progress';
        case ISSUE_STATUS.FIXED:    return 'Resolved';
        case ISSUE_STATUS.RELEASED: return 'Released';
        case ISSUE_STATUS.CLOSED:   return 'Closed';
        default: return status ?? 'Unknown';
    }
}

// Ordered groups for display: unresolved first, resolved last
const STATUS_GROUP_ORDER = [
    ISSUE_STATUS.NEW,
    ISSUE_STATUS.REVIEWED,
    ISSUE_STATUS.BACKLOGGED,
    ISSUE_STATUS.WORKING,
    ISSUE_STATUS.FIXED,
    ISSUE_STATUS.RELEASED,
    ISSUE_STATUS.CLOSED,
];

const ReleaseReadiness: React.FC = () => {
    const { appId } = useApp();
    const [versions, setVersions] = useState<ReleaseVersion[]>([]);
    const [versionsLoading, setVersionsLoading] = useState(true);

    const [selectedVersion, setSelectedVersion] = useState<string>('');
    const [issues, setIssues] = useState<ReportedIssue[]>([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [issuesError, setIssuesError] = useState<string | null>(null);

    // Subscribe to release versions for active app
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
        setVersionsLoading(true);
        const unsubscribe = subscribeToReleaseVersions((data) => {
            setVersions(data);
            setVersionsLoading(false);
        }, appId);
        return () => unsubscribe();
    }, [appId]);

    // Fetch issues whenever selected version changes
    useEffect(() => {
        if (!selectedVersion) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
            setIssues([]);
            setIssuesError(null);
            return;
        }
        const abortController = new AbortController();
        setIssuesLoading(true);
        setIssuesError(null);
        getIssuesByPFV(selectedVersion)
            .then((data) => {
                if (!abortController.signal.aborted) {
                    setIssues(data);
                    setIssuesLoading(false);
                }
            })
            .catch((err) => {
                if (!abortController.signal.aborted) {
                    setIssuesError(err?.message ?? 'Failed to load issues.');
                    setIssuesLoading(false);
                }
            });
        return () => { abortController.abort(); };
    }, [selectedVersion]);

    // Readiness metrics
    const { resolvedCount, total, readinessPct } = useMemo(() => {
        const total = issues.length;
        const resolvedCount = issues.filter(i => RESOLVED_STATUSES.has(i.status ?? '')).length;
        const readinessPct = total === 0 ? 0 : Math.round((resolvedCount / total) * 100);
        return { resolvedCount, total, readinessPct };
    }, [issues]);

    // Group issues by status, sorted per STATUS_GROUP_ORDER
    const groupedIssues = useMemo(() => {
        const groups: Record<string, ReportedIssue[]> = {};
        for (const issue of issues) {
            const key = issue.status ?? 'unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push(issue);
        }
        // Sort issues within each group by severity then displayId
        for (const key of Object.keys(groups)) {
            groups[key].sort((a, b) => {
                const sa = SEVERITY_ORDER[a.severity ?? ''] ?? 99;
                const sb = SEVERITY_ORDER[b.severity ?? ''] ?? 99;
                if (sa !== sb) return sa - sb;
                return (a.displayId ?? '').localeCompare(b.displayId ?? '');
            });
        }
        // Build ordered array of [statusKey, issues[]]
        const ordered: [string, ReportedIssue[]][] = [];
        for (const status of STATUS_GROUP_ORDER) {
            if (groups[status]) ordered.push([status, groups[status]]);
        }
        // Append any statuses not in the known order (e.g. 'unknown')
        for (const key of Object.keys(groups)) {
            if (!(STATUS_GROUP_ORDER as readonly string[]).includes(key)) {
                ordered.push([key, groups[key]]);
            }
        }
        return ordered;
    }, [issues]);

    const selectedVersionObj = versions.find(v => v.version === selectedVersion);

    const readinessColor =
        readinessPct >= 80 ? 'text-emerald-400' :
        readinessPct >= 50 ? 'text-yellow-400' :
        'text-red-400';

    const progressColor =
        readinessPct >= 80 ? 'bg-emerald-500' :
        readinessPct >= 50 ? 'bg-yellow-500' :
        'bg-red-500';

    return (
        <div className="p-6 space-y-6">
            {/* Page Header */}
            <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl">
                    <ClipboardList className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-slate-100">Release Readiness</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Per-version issue readiness checklist</p>
                </div>
            </div>

            {/* Version Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Select Version
                </label>
                {versionsLoading ? (
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading versions...</span>
                    </div>
                ) : versions.length === 0 ? (
                    <p className="text-sm text-slate-500">No release versions found.</p>
                ) : (
                    <select
                        value={selectedVersion}
                        onChange={(e) => setSelectedVersion(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                    >
                        <option value="">— Choose a version —</option>
                        {versions.map((v) => (
                            <option key={v.id} value={v.version}>
                                {v.version}
                                {v.status ? ` (${v.status})` : ''}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* No version selected */}
            {!selectedVersion && !versionsLoading && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
                    <ClipboardList className="w-10 h-10 text-slate-700" />
                    <p className="text-slate-400 text-sm font-medium">Select a version above to view readiness</p>
                    <p className="text-slate-600 text-xs">Issues planned for that version will appear here.</p>
                </div>
            )}

            {/* Loading issues */}
            {selectedVersion && issuesLoading && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Loading issues for {selectedVersion}...</p>
                </div>
            )}

            {/* Error state */}
            {selectedVersion && !issuesLoading && issuesError && (
                <div className="bg-slate-900 border border-red-800/40 rounded-2xl p-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-400">{issuesError}</p>
                </div>
            )}

            {/* Content: readiness + issue table */}
            {selectedVersion && !issuesLoading && !issuesError && (
                <>
                    {/* Readiness Summary Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                    Readiness — v{selectedVersion}
                                    {selectedVersionObj && (
                                        <span className="ml-2 normal-case tracking-normal font-normal text-slate-500">
                                            ({selectedVersionObj.status})
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-slate-400">
                                    {resolvedCount} of {total} issue{total !== 1 ? 's' : ''} resolved, released, or closed
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {readinessPct === 100 ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : readinessPct >= 80 ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500/60" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-yellow-500/70" />
                                )}
                                <span className={`text-3xl font-bold tabular-nums ${readinessColor}`}>
                                    {readinessPct}%
                                </span>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                            <div
                                className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`}
                                style={{ width: `${readinessPct}%` }}
                            />
                        </div>

                        {total === 0 && (
                            <p className="text-xs text-slate-600 italic">
                                No issues are planned for this version yet.
                            </p>
                        )}
                    </div>

                    {/* Issue Table */}
                    {total > 0 && (
                        <div className="space-y-4">
                            {groupedIssues.map(([status, statusIssues]) => {
                                const isResolved = RESOLVED_STATUSES.has(status);
                                return (
                                    <div
                                        key={status}
                                        className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
                                    >
                                        {/* Group header */}
                                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${getStatusColor(status)}`}>
                                                    {friendlyStatus(status)}
                                                </span>
                                                {isResolved && (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500/60" />
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-500 tabular-nums">
                                                {statusIssues.length} issue{statusIssues.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {/* Rows */}
                                        <div className="divide-y divide-slate-800/60">
                                            {statusIssues.map((issue) => (
                                                <div
                                                    key={issue.id}
                                                    className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-800/40 ${isResolved ? 'opacity-60' : ''}`}
                                                >
                                                    {/* Display ID */}
                                                    <span className="text-xs font-mono text-slate-500 w-20 shrink-0">
                                                        {issue.displayId ?? '—'}
                                                    </span>

                                                    {/* Message / title */}
                                                    <span className="flex-1 text-sm text-slate-200 truncate" title={issue.message}>
                                                        {issue.message || issue.description || <span className="text-slate-600 italic">No title</span>}
                                                    </span>

                                                    {/* Severity badge */}
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium shrink-0 ${getSeverityColor(issue.severity)}`}>
                                                        {issue.severity ?? '—'}
                                                    </span>

                                                    {/* Status badge */}
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium shrink-0 ${getStatusColor(issue.status ?? '')}`}>
                                                        {friendlyStatus(issue.status)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty state: version selected but no issues */}
                    {total === 0 && !issuesLoading && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
                            <ClipboardList className="w-8 h-8 text-slate-700" />
                            <p className="text-slate-400 text-sm">No issues planned for v{selectedVersion}</p>
                            <p className="text-slate-600 text-xs">
                                Assign issues to this version via the Issues page using the PFV field.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ReleaseReadiness;
