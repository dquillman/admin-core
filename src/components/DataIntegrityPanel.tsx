import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { safeGetDocs } from '../utils/firestoreSafe';
import { useApp } from '../context/AppContext';
import { AlertTriangle, CheckCircle, Database, XCircle, Loader2 } from 'lucide-react';
import { normalizeAppValue } from '../constants';

interface CheckResult {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string;
    link?: string;
}

const DataIntegrityPanel: React.FC = () => {
    const { appId } = useApp();
    const navigate = useNavigate();
    const [results, setResults] = useState<CheckResult[]>([]);
    const [loading, setLoading] = useState(true);

    const checkIntegrity = useCallback(async () => {
        setLoading(true);
        const checks: CheckResult[] = [];
        const norm = normalizeAppValue(appId);

        // 1. Users — comprehensive schema check
        const usersSnap = await safeGetDocs(
            query(collection(db, 'users'), limit(500)),
            { fallback: [], context: 'Integrity', description: 'Check Users' }
        );

        if (usersSnap.empty) {
            checks.push({ name: 'Users Collection', status: 'fail', message: 'No users found', details: 'Collection is empty or inaccessible.' });
        } else {
            const total = usersSnap.docs.length;
            let missingEmail = 0;
            let noDocId = 0;
            usersSnap.docs.forEach((d) => {
                if (!d.data().email) missingEmail++;
                if (!d.id) noDocId++; // uid = doc ID, always present
            });
            if (missingEmail === 0) {
                checks.push({ name: 'User Schema', status: 'pass', message: `${total} users — all have email` });
            } else {
                checks.push({
                    name: 'User Schema',
                    status: missingEmail > 5 ? 'warn' : 'pass',
                    message: `${missingEmail} of ${total} users missing email`,
                    details: missingEmail <= 5 ? 'Likely guest/anon accounts.' : undefined,
                    link: missingEmail > 5 ? '/users' : undefined,
                });
            }
            if (noDocId > 0) {
                checks.push({ name: 'User IDs', status: 'fail', message: `${noDocId} users with empty doc ID`, link: '/users' });
            }

            // 2. Paid users without verifiedPaidAt
            let paidNoVerify = 0;
            usersSnap.docs.forEach((doc) => {
                const data = doc.data();
                if (data.billingStatus === 'paid' && !data.verifiedPaidAt) paidNoVerify++;
            });
            if (paidNoVerify > 0) {
                checks.push({
                    name: 'Billing Integrity',
                    status: 'warn',
                    message: `${paidNoVerify} paid user${paidNoVerify > 1 ? 's' : ''} missing verifiedPaidAt`,
                    details: 'May indicate Stripe webhook issue.',
                    link: '/billing-alerts',
                });
            } else {
                checks.push({ name: 'Billing Integrity', status: 'pass', message: 'All paid users have verification timestamps' });
            }

            // 3. Usage scores
            let missingScore = 0;
            let activeNoScore = 0;
            usersSnap.docs.forEach((doc) => {
                const data = doc.data();
                if (data.usageScore == null) {
                    missingScore++;
                    if (!data.archived && !data.disabled) activeNoScore++;
                }
            });
            if (activeNoScore > 0) {
                checks.push({
                    name: 'Usage Scores',
                    status: activeNoScore > 10 ? 'warn' : 'pass',
                    message: `${activeNoScore} active user${activeNoScore > 1 ? 's' : ''} missing usage score`,
                    details: missingScore > activeNoScore ? `${missingScore} total (incl. archived)` : undefined,
                    link: '/usage-config',
                });
            } else {
                checks.push({ name: 'Usage Scores', status: 'pass', message: `All active users have scores` });
            }
        }

        // 4. App Config exists for current app
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

        // 5. Unresolved billing events
        const unresolvedSnap = await safeGetDocs(
            query(collection(db, 'billing_events_unresolved'), limit(50)),
            { fallback: [], context: 'Integrity', description: 'Check Unresolved Billing' }
        );
        if (!unresolvedSnap.empty) {
            const count = unresolvedSnap.docs.length;
            checks.push({
                name: 'Unresolved Billing',
                status: count >= 5 ? 'fail' : 'warn',
                message: `${count} unresolved event${count > 1 ? 's' : ''} need attention`,
                link: '/unresolved-billing',
            });
        } else {
            checks.push({ name: 'Unresolved Billing', status: 'pass', message: 'No unresolved billing events' });
        }

        // 6 & 7: Fetch all issues for the current app (client-side filter by app + exclude deleted)
        const allIssuesSnap = await safeGetDocs(
            query(collection(db, 'issues'), limit(500)),
            { fallback: [], context: 'Integrity', description: 'Check Issues' }
        );
        type IssueDoc = Record<string, unknown> & { id: string };
        const appIssues: IssueDoc[] = allIssuesSnap.docs
            .map(d => ({ ...d.data(), id: d.id } as IssueDoc))
            .filter(i => !i.deleted && normalizeAppValue(i.app as string) === norm);

        // 6. Orphan PFV references — issues pointing to non-existent release versions
        const versionsSnap = await safeGetDocs(
            query(collection(db, 'release_versions')),
            { fallback: [], context: 'Integrity', description: 'Check Release Versions' }
        );
        const validVersions = new Set(
            versionsSnap.docs
                .filter(d => normalizeAppValue(d.data().appId as string) === norm)
                .map(d => d.data().version as string)
        );

        const issuesWithPfv = appIssues.filter(i => i.plannedForVersion);
        let orphanPfv = 0;
        issuesWithPfv.forEach((i) => {
            if (!validVersions.has(i.plannedForVersion as string)) orphanPfv++;
        });
        if (orphanPfv > 0) {
            checks.push({
                name: 'Issue PFV References',
                status: 'warn',
                message: `${orphanPfv} issue${orphanPfv > 1 ? 's' : ''} reference non-existent versions`,
                link: '/issues?status=new,reviewed,working,blocked,backlogged,fixed,released,closed',
            });
        } else {
            checks.push({
                name: 'Issue PFV References',
                status: 'pass',
                message: issuesWithPfv.length > 0 ? `${issuesWithPfv.length} PFV assignments valid` : 'No PFV assignments yet',
            });
        }

        // 7. Open issues count — app-scoped, excluding deleted
        const openCount = appIssues.filter(i => i.status === 'new').length;
        if (openCount >= 20) {
            checks.push({
                name: 'Issue Backlog',
                status: 'warn',
                message: `${openCount} untriaged issues for ${norm} (status: new)`,
                details: 'Review and triage these.',
                link: '/issues?status=new',
            });
        } else {
            checks.push({
                name: 'Issue Backlog',
                status: 'pass',
                message: `${openCount} new issue${openCount !== 1 ? 's' : ''} for ${norm} — backlog healthy`,
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
                    {results.map((check, idx) => (
                        <div key={idx} className="px-6 py-3 flex items-start justify-between gap-4">
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
                                {check.link && check.status !== 'pass' && (
                                    <button
                                        onClick={() => navigate(check.link!)}
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap"
                                    >
                                        Fix &rarr;
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DataIntegrityPanel;
