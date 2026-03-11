import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { safeGetDocs } from '../utils/firestoreSafe';
import { useApp } from '../context/AppContext';
import { AlertTriangle, CheckCircle, Database, XCircle, Loader2, ChevronDown, ExternalLink } from 'lucide-react';
import { normalizeAppValue } from '../constants';

interface ProblemItem {
    id: string;
    label: string;
    sublabel?: string;
}

interface CheckResult {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string;
    link?: string;
    items?: ProblemItem[];
}

const FIREBASE_CONSOLE_BASE = 'https://console.firebase.google.com/project/exam-coach-ai-platform/firestore/databases/-default-/data';

const DataIntegrityPanel: React.FC = () => {
    const { appId } = useApp();
    const navigate = useNavigate();
    const [results, setResults] = useState<CheckResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    const checkIntegrity = useCallback(async () => {
        setLoading(true);
        setExpandedIdx(null);
        const checks: CheckResult[] = [];
        const isAllApps = appId === 'all';
        const norm = isAllApps ? null : normalizeAppValue(appId);

        // 1. Users — comprehensive schema check (global — users aren't app-scoped)
        const usersSnap = await safeGetDocs(
            query(collection(db, 'users'), limit(500)),
            { fallback: [], context: 'Integrity', description: 'Check Users' }
        );

        if (usersSnap.empty) {
            checks.push({ name: 'Users Collection', status: 'fail', message: 'No users found', details: 'Collection is empty or inaccessible.' });
        } else {
            const total = usersSnap.docs.length;
            const missingEmailDocs: ProblemItem[] = [];
            usersSnap.docs.forEach((d) => {
                const data = d.data();
                if (!data.email) {
                    missingEmailDocs.push({
                        id: d.id,
                        label: d.id,
                        sublabel: data.displayName as string || data.role as string || 'no email/name',
                    });
                }
            });
            const schemaLabel = norm ? 'User Schema (global)' : 'User Schema';
            if (missingEmailDocs.length === 0) {
                checks.push({ name: schemaLabel, status: 'pass', message: `${total} users — all have email` });
            } else {
                checks.push({
                    name: schemaLabel,
                    status: missingEmailDocs.length > 5 ? 'warn' : 'pass',
                    message: `${missingEmailDocs.length} of ${total} users missing email`,
                    details: missingEmailDocs.length <= 5 ? 'Click to see which users.' : undefined,
                    items: missingEmailDocs,
                });
            }

            // 2. Paid users without verifiedPaidAt
            const paidNoVerifyDocs: ProblemItem[] = [];
            usersSnap.docs.forEach((d) => {
                const data = d.data();
                if (data.billingStatus === 'paid' && !data.verifiedPaidAt) {
                    paidNoVerifyDocs.push({
                        id: d.id,
                        label: (data.email as string) || d.id,
                        sublabel: `billingStatus: paid, no verifiedPaidAt`,
                    });
                }
            });
            const billingLabel = norm ? 'Billing Integrity (global)' : 'Billing Integrity';
            if (paidNoVerifyDocs.length > 0) {
                checks.push({
                    name: billingLabel,
                    status: 'warn',
                    message: `${paidNoVerifyDocs.length} paid user${paidNoVerifyDocs.length > 1 ? 's' : ''} missing verifiedPaidAt`,
                    details: 'May indicate Stripe webhook issue.',
                    items: paidNoVerifyDocs,
                    link: '/billing-alerts',
                });
            } else {
                checks.push({ name: billingLabel, status: 'pass', message: 'All paid users have verification timestamps' });
            }

            // 3. Usage scores
            const noScoreDocs: ProblemItem[] = [];
            let totalMissing = 0;
            usersSnap.docs.forEach((d) => {
                const data = d.data();
                if (data.usageScore == null) {
                    totalMissing++;
                    if (!data.archived && !data.disabled) {
                        noScoreDocs.push({
                            id: d.id,
                            label: (data.email as string) || d.id,
                            sublabel: data.archived ? 'archived' : data.disabled ? 'disabled' : 'active — needs backfill',
                        });
                    }
                }
            });
            const usageLabel = norm ? 'Usage Scores (global)' : 'Usage Scores';
            if (noScoreDocs.length > 0) {
                checks.push({
                    name: usageLabel,
                    status: noScoreDocs.length > 10 ? 'warn' : 'pass',
                    message: `${noScoreDocs.length} active user${noScoreDocs.length > 1 ? 's' : ''} missing usage score`,
                    details: totalMissing > noScoreDocs.length ? `${totalMissing} total (incl. archived)` : undefined,
                    items: noScoreDocs,
                    link: '/usage-config',
                });
            } else {
                checks.push({ name: usageLabel, status: 'pass', message: 'All active users have scores' });
            }
        }

        // 4. App Config exists for current app
        if (norm) {
            const appConfigSnap = await safeGetDocs(
                query(collection(db, 'apps', norm, 'config'), limit(1)),
                { fallback: [], context: 'Integrity', description: 'Check App Config' }
            );
            if (appConfigSnap.empty) {
                checks.push({
                    name: `App Config (${norm})`,
                    status: 'pass',
                    message: 'No saved config — using defaults',
                    details: 'Save on Plans page to persist.',
                    link: '/plans',
                });
            } else {
                checks.push({ name: `App Config (${norm})`, status: 'pass', message: `${appConfigSnap.docs.length} config doc${appConfigSnap.docs.length > 1 ? 's' : ''} found` });
            }
        }

        // 5. Unresolved billing events (global)
        const unresolvedBillingLabel = norm ? 'Unresolved Billing (global)' : 'Unresolved Billing';
        const unresolvedSnap = await safeGetDocs(
            query(collection(db, 'billing_events_unresolved'), limit(50)),
            { fallback: [], context: 'Integrity', description: 'Check Unresolved Billing' }
        );
        if (!unresolvedSnap.empty) {
            const items: ProblemItem[] = unresolvedSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    label: (data.email as string) || d.id,
                    sublabel: (data.type as string) || 'unknown event type',
                };
            });
            checks.push({
                name: unresolvedBillingLabel,
                status: items.length >= 5 ? 'fail' : 'warn',
                message: `${items.length} unresolved event${items.length > 1 ? 's' : ''} need attention`,
                items,
                link: '/unresolved-billing',
            });
        } else {
            checks.push({ name: unresolvedBillingLabel, status: 'pass', message: 'No unresolved billing events' });
        }

        // 6 & 7: Fetch all issues for the current app (client-side filter by app + exclude deleted)
        const allIssuesSnap = await safeGetDocs(
            query(collection(db, 'issues'), limit(500)),
            { fallback: [], context: 'Integrity', description: 'Check Issues' }
        );
        type IssueDoc = Record<string, unknown> & { id: string };
        const appIssues: IssueDoc[] = allIssuesSnap.docs
            .map(d => ({ ...d.data(), id: d.id } as IssueDoc))
            .filter(i => !i.deleted && (isAllApps || normalizeAppValue(i.app as string) === norm));

        // 6. Orphan PFV references
        const versionsSnap = await safeGetDocs(
            query(collection(db, 'release_versions')),
            { fallback: [], context: 'Integrity', description: 'Check Release Versions' }
        );
        const validVersions = new Set(
            versionsSnap.docs
                .filter(d => isAllApps || normalizeAppValue(d.data().appId as string) === norm)
                .map(d => d.data().version as string)
        );
        const orphanItems: ProblemItem[] = [];
        appIssues.forEach((i) => {
            if (i.plannedForVersion && !validVersions.has(i.plannedForVersion as string)) {
                orphanItems.push({
                    id: i.id,
                    label: (i.displayId as string) || i.id,
                    sublabel: `PFV: ${i.plannedForVersion} (not found)`,
                });
            }
        });
        if (orphanItems.length > 0) {
            checks.push({
                name: 'Issue PFV References',
                status: 'warn',
                message: `${orphanItems.length} issue${orphanItems.length > 1 ? 's' : ''} reference non-existent versions`,
                items: orphanItems,
                link: '/issues?status=new,reviewed,working,blocked,backlogged,fixed,released,closed',
            });
        } else {
            const pfvCount = appIssues.filter(i => i.plannedForVersion).length;
            checks.push({
                name: 'Issue PFV References',
                status: 'pass',
                message: pfvCount > 0 ? `${pfvCount} PFV assignments valid` : 'No PFV assignments yet',
            });
        }

        // 7. Open issues count — app-scoped
        const newIssues = appIssues.filter(i => i.status === 'new');
        if (newIssues.length >= 20) {
            const items: ProblemItem[] = newIssues.slice(0, 10).map(i => ({
                id: i.id,
                label: (i.displayId as string) || i.id,
                sublabel: ((i.message as string) || (i.description as string) || 'No title').slice(0, 60),
            }));
            if (newIssues.length > 10) {
                items.push({ id: '_more', label: `...and ${newIssues.length - 10} more`, sublabel: '' });
            }
            checks.push({
                name: 'Issue Backlog',
                status: 'warn',
                message: `${newIssues.length} untriaged issues${norm ? ` for ${norm}` : ' across all apps'} (status: new)`,
                details: 'Review and triage these.',
                items,
                link: '/issues?status=new',
            });
        } else {
            checks.push({
                name: 'Issue Backlog',
                status: 'pass',
                message: `${newIssues.length} new issue${newIssues.length !== 1 ? 's' : ''}${norm ? ` for ${norm}` : ' across all apps'} — backlog healthy`,
            });
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern
        setResults(checks);
        setLoading(false);
    }, [appId]);

    useEffect(() => {
        checkIntegrity();
    }, [checkIntegrity]);

    const passCount = results.filter(r => r.status === 'pass').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    const failCount = results.filter(r => r.status === 'fail').length;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">Data Integrity</h2>
                    {!loading && (
                        <span className="text-[10px] text-slate-500 ml-1">
                            {passCount} pass{warnCount > 0 ? ` · ${warnCount} warn` : ''}{failCount > 0 ? ` · ${failCount} fail` : ''}
                        </span>
                    )}
                </div>
                <button
                    onClick={checkIntegrity}
                    disabled={loading}
                    className="text-xs text-indigo-500 hover:text-indigo-400 disabled:opacity-50"
                >
                    {loading ? 'Checking...' : 'Re-run'}
                </button>
            </div>
            {loading ? (
                <div className="px-6 py-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running integrity checks...
                </div>
            ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {results.map((check, idx) => {
                        const isExpanded = expandedIdx === idx;
                        const hasItems = check.items && check.items.length > 0;
                        const isClickable = hasItems || (check.link && check.status !== 'pass');

                        return (
                            <div key={idx}>
                                <div
                                    className={`px-6 py-3 flex items-start justify-between gap-4 ${isClickable ? 'cursor-pointer hover:bg-slate-800/30' : ''}`}
                                    onClick={() => {
                                        if (hasItems) {
                                            setExpandedIdx(isExpanded ? null : idx);
                                        } else if (check.link && check.status !== 'pass') {
                                            navigate(check.link);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {check.status === 'pass' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                                        {check.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                                        {check.status === 'fail' && <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{check.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{check.message}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {check.details && (
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full whitespace-nowrap">
                                                {check.details}
                                            </span>
                                        )}
                                        {hasItems && (
                                            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        )}
                                        {!hasItems && check.link && check.status !== 'pass' && (
                                            <span className="text-[10px] text-indigo-400 font-medium whitespace-nowrap">
                                                Fix &rarr;
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded item list */}
                                {isExpanded && hasItems && (
                                    <div className="bg-slate-950/50 border-t border-slate-800">
                                        <div className="px-6 py-2 space-y-1">
                                            {check.items!.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between gap-3 py-1.5">
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-mono text-slate-300">{item.label}</span>
                                                        {item.sublabel && (
                                                            <span className="text-[10px] text-slate-500 ml-2">{item.sublabel}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {item.id !== '_more' && item.label !== item.id && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/users?search=${encodeURIComponent(item.label)}`); }}
                                                                className="text-[10px] text-indigo-400 hover:text-indigo-300"
                                                                title="Search in Users"
                                                            >
                                                                Users
                                                            </button>
                                                        )}
                                                        {item.id !== '_more' && (
                                                            <a
                                                                href={`${FIREBASE_CONSOLE_BASE}/~2Fusers~2F${item.id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5"
                                                                title="Open in Firebase Console"
                                                            >
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                                Firestore
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {check.link && (
                                            <div className="px-6 py-2 border-t border-slate-800">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(check.link!); }}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                                >
                                                    Open full page &rarr;
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DataIntegrityPanel;
