import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertTriangle, ShieldAlert, Clock, Archive } from 'lucide-react';
import type { ReportedIssue } from '../types';
import { subscribeToReportedIssues, fetchAllUsersLookup } from '../services/firestoreService';
import { buildOperatorReport, type ReportIssueItem } from '../selectors/operatorReport';
import { IssueDetailModal } from '../components/IssueDetailModal';

const OperatorReport: React.FC = () => {
    const [issues, setIssues] = useState<ReportedIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<{ uid: string; email: string }[]>([]);
    const [selectedIssue, setSelectedIssue] = useState<ReportedIssue | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToReportedIssues(500, (data) => {
            setIssues(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        fetchAllUsersLookup()
            .then(setUsers)
            .catch((err) => console.error('Failed to fetch users lookup:', err));
    }, []);

    const userMap = useMemo(() => new Map(users.map(u => [u.uid, u.email])), [users]);

    const resolveAssignee = (userId: string | null | undefined): string => {
        if (!userId) return 'Unassigned';
        if (userMap.has(userId)) return userMap.get(userId)!;
        if (userId.includes('@')) return userId;
        return `Unknown (${userId.slice(0, 8)}...)`;
    };

    const report = useMemo(
        () => buildOperatorReport(issues, resolveAssignee),
        [issues, userMap]
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    const { summary, fixNow, fixNext, parked } = report;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Operator Report</h1>
                <p className="text-sm text-slate-500 mt-1">Decision-ready triage. What to fix now, next, or park.</p>
            </div>

            {/* Executive Summary */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executive Summary</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SummaryCell label="Open Issues" value={summary.totalOpen} />
                    <SummaryCell label="S1 Critical" value={summary.bySeverity.S1} highlight={summary.bySeverity.S1 > 0 ? 'red' : undefined} />
                    <SummaryCell label="S2 High" value={summary.bySeverity.S2} highlight={summary.bySeverity.S2 > 0 ? 'orange' : undefined} />
                    <SummaryCell label="S3 Medium" value={summary.bySeverity.S3} />
                </div>

                {/* Risk Flags */}
                <div className="flex flex-wrap gap-3 pt-2">
                    <RiskFlag
                        active={summary.criticalRiskPresent}
                        label="Critical Risk Present"
                        activeColor="bg-red-500/10 text-red-400 border-red-500/30"
                    />
                    <RiskFlag
                        active={summary.testerTrustRiskPresent}
                        label="Tester Trust Risk"
                        activeColor="bg-amber-500/10 text-amber-400 border-amber-500/30"
                    />
                </div>
            </section>

            {/* Fix-Now Queue */}
            <ReportSection
                title="Fix Now"
                icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
                description="S1/S2, actionable status, trust-critical category. These block tester confidence."
                items={fixNow}
                emptyMessage="No issues require immediate action."
                borderColor="border-red-900/30"
                onSelect={setSelectedIssue}
            />

            {/* Should-Fix-Next */}
            <ReportSection
                title="Fix Next"
                icon={<Clock className="w-4 h-4 text-amber-400" />}
                description="S2/S3 issues not in Fix-Now. Address once the critical queue is clear."
                items={fixNext}
                emptyMessage="Nothing queued for next."
                borderColor="border-amber-900/30"
                onSelect={setSelectedIssue}
            />

            {/* Parked */}
            <ReportSection
                title="Parked"
                icon={<Archive className="w-4 h-4 text-slate-500" />}
                description="S4 issues. Safe to ignore until capacity allows."
                items={parked}
                emptyMessage="Nothing parked."
                borderColor="border-slate-800"
                onSelect={setSelectedIssue}
            />

            {/* Detail Modal (reuses existing) */}
            <IssueDetailModal
                issue={selectedIssue}
                onClose={() => setSelectedIssue(null)}
                onUpdate={() => {/* realtime listener handles refresh */}}
            />
        </div>
    );
};

// --- Sub-components ---

const SummaryCell: React.FC<{ label: string; value: number; highlight?: 'red' | 'orange' }> = ({ label, value, highlight }) => {
    const color = highlight === 'red'
        ? 'text-red-400'
        : highlight === 'orange'
            ? 'text-orange-400'
            : 'text-white';

    return (
        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
        </div>
    );
};

const RiskFlag: React.FC<{ active: boolean; label: string; activeColor: string }> = ({ active, label, activeColor }) => (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${active ? activeColor : 'bg-slate-800/50 text-slate-600 border-slate-700/50'}`}>
        <ShieldAlert className="w-3.5 h-3.5" />
        {label}: {active ? 'YES' : 'No'}
    </div>
);

const ReportSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    description: string;
    items: ReportIssueItem[];
    emptyMessage: string;
    borderColor: string;
    onSelect: (issue: ReportedIssue) => void;
}> = ({ title, icon, description, items, emptyMessage, borderColor, onSelect }) => (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800/50 bg-slate-950/30">
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">{items.length}</span>
            </div>
            <p className="text-xs text-slate-500">{description}</p>
        </div>

        <div className="divide-y divide-slate-800/50">
            {items.length === 0 ? (
                <div className="p-6 text-sm text-slate-600 italic text-center">{emptyMessage}</div>
            ) : (
                items.map(item => (
                    <div
                        key={item.issue.id}
                        onClick={() => onSelect(item.issue)}
                        className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors border-l-2 ${borderColor}`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono font-bold text-brand-400">
                                        {item.issue.displayId || 'EC-???'}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sevStyle(item.issue.severity)}`}>
                                        {item.issue.severity || 'S3'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded capitalize">
                                        {item.issue.status || 'new'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-300 line-clamp-1">
                                    {item.issue.description || item.issue.message}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Assigned To</div>
                                <div className="text-xs text-slate-400 font-mono truncate max-w-[140px]">{item.assignee}</div>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            {item.reason}
                        </div>
                    </div>
                ))
            )}
        </div>
    </section>
);

function sevStyle(sev?: string): string {
    switch (sev) {
        case 'S1': return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'S2': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        case 'S3': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        case 'S4': return 'bg-slate-800 text-slate-400 border-slate-700';
        default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
}

export default OperatorReport;
