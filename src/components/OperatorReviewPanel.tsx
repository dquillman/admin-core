import React, { useMemo } from 'react';
import type { ReportedIssue } from '../types';
import { X, AlertTriangle, Lightbulb, ClipboardList, Trash2, ArrowRight } from 'lucide-react';

import { ISSUE_STATUS } from '../constants';

interface OperatorReviewPanelProps {
    isOpen: boolean;
    onClose: () => void;
    issues: ReportedIssue[];
    onSelectIssue: (issue: ReportedIssue) => void;
}

interface AnalysisResult {
    bucket: 'blocker' | 'signal' | 'admin' | 'noise';
    issue: ReportedIssue;
    reason: string;
    suggestion: {
        status?: string;
        severity?: string;
        classification?: string;
    };
}

export const OperatorReviewPanel: React.FC<OperatorReviewPanelProps> = ({ isOpen, onClose, issues, onSelectIssue }) => {

    const analysis = useMemo(() => {
        const results: AnalysisResult[] = [];
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        issues.forEach(issue => {
            // Safe accessors
            const sev = issue.severity || 'S3';
            const status = issue.status || ISSUE_STATUS.NEW;
            const type = issue.type || 'bug';
            const desc = (issue.description || issue.message || '').toLowerCase();
            const title = (issue.displayId || issue.id).toLowerCase();
            const createdAt = issue.timestamp?.toMillis() || issue.createdAt?.toMillis() || now;
            const age = now - createdAt;
            const isUserOriginated = !!issue.userId;

            // 0. STRICT FILTER: Only Active Issues
            // Exclude deleted, closed, resolved, archived
            if (issue.deleted) return;
            const statusLower = status.toLowerCase();
            if ([ISSUE_STATUS.CLOSED, 'resolved', 'archived', 'done', 'completed'].includes(statusLower)) return;

            // 0B. EXPLICIT CLASSIFICATION OVERRIDE
            if (issue.classification === 'blocking') {
                results.push({ bucket: 'blocker', issue, reason: 'Explicitly classified as Blocking', suggestion: { severity: 'S1' } });
                return;
            }
            if (issue.classification === 'misleading' || issue.classification === 'trust') {
                results.push({ bucket: 'signal', issue, reason: 'Explicitly classified for Product/Trust', suggestion: { classification: issue.classification } });
                return;
            }
            if (issue.classification === 'cosmetic') {
                results.push({ bucket: 'noise', issue, reason: 'Explicitly classified as Cosmetic', suggestion: { severity: 'S4' } });
                return;
            }

            // 1. Noise / Close Candidates
            // Rule: Test/Pipeline class (simulated by content), Low signal, Admin created noise
            const isTest = desc.includes('test') || title.includes('test');
            const isLowSignal = desc.length < 5;
            // "Admin created" heuristic: no userId or explicitly marked
            const isAdminNoise = !isUserOriginated && isTest;

            if (isTest || isLowSignal || isAdminNoise) {
                results.push({
                    bucket: 'noise',
                    issue,
                    reason: isTest ? 'Contains "test" keyword' : isLowSignal ? 'Low signal/Empty description' : 'Potential admin noise',
                    suggestion: { status: ISSUE_STATUS.CLOSED, classification: 'cosmetic' }
                });
                return;
            }

            // 2. Execution Blockers
            // Rule: Critical/High, Open/Working, Age > 24h
            const isHighSev = sev === 'S1' || sev === 'S2';
            const isActive = status === ISSUE_STATUS.NEW || status === ISSUE_STATUS.WORKING || status === 'open' || status === 'in_progress';

            if (isHighSev && isActive && age > oneDay) {
                results.push({
                    bucket: 'blocker',
                    issue,
                    reason: 'Stagnant High Priority Issue (>24h)',
                    suggestion: { status: ISSUE_STATUS.WORKING, severity: sev } // Suggest active working
                });
                return;
            }

            // 3. Product Signals
            // Rule: Medium, UX/Feature/Tutor, User-originated
            const isMediumSev = sev === 'S3';
            const isProductType = ['ux', 'feedback', 'tutor-gap', 'confusion', 'feature'].includes(type);

            if (isMediumSev && isProductType && isUserOriginated) {
                results.push({
                    bucket: 'signal',
                    issue,
                    reason: 'User-reported product insight',
                    suggestion: { classification: 'misleading' /* if confusion */ }
                });
                return;
            }

            // 4. Admin / Process (Default)
            // Rule: Ops/Admin/Tech Debt, Sev <= Medium
            results.push({
                bucket: 'admin',
                issue,
                reason: 'Routine maintenance / Standard issue',
                suggestion: { status: ISSUE_STATUS.WORKING }
            });
        });

        return results;
    }, [issues]);

    const buckets = useMemo(() => {
        return {
            blocker: analysis.filter(a => a.bucket === 'blocker'),
            signal: analysis.filter(a => a.bucket === 'signal'),
            admin: analysis.filter(a => a.bucket === 'admin'),
            noise: analysis.filter(a => a.bucket === 'noise'),
        };
    }, [analysis]);

    const startHere = useMemo(() => {
        // Top 3 Blockers: Severity (S1>S2) -> Age (Oldest) -> ID
        return [...buckets.blocker].sort((a, b) => {
            const sevWeight = { 'S1': 4, 'S2': 3, 'S3': 2, 'S4': 1 };
            const sA = sevWeight[a.issue.severity || 'S3'] || 0;
            const sB = sevWeight[b.issue.severity || 'S3'] || 0;
            if (sA !== sB) return sB - sA; // High sev first

            const timeA = a.issue.timestamp?.toMillis() || 0;
            const timeB = b.issue.timestamp?.toMillis() || 0;
            if (timeA !== timeB) return timeA - timeB; // Oldest first

            return a.issue.id.localeCompare(b.issue.id);
        }).slice(0, 3);
    }, [buckets.blocker]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl z-[60] flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        🧠 Operator Review <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full border border-brand-500/30">v1</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Analyzed {analysis.length} issues. Ready for triage.
                    </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">

                {/* START HERE */}
                {startHere.length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-900/20 to-brand-900/10 rounded-2xl p-5 border border-indigo-500/30 ring-1 ring-indigo-500/20">
                        <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <ArrowRight className="w-4 h-4" /> Start Here (Top 3)
                        </h3>
                        <div className="space-y-3">
                            {startHere.map((item, idx) => (
                                <div
                                    key={item.issue.id}
                                    onClick={() => onSelectIssue(item.issue)}
                                    className="bg-slate-900/80 rounded-xl p-3 border border-indigo-500/20 flex gap-3 items-start cursor-pointer hover:bg-slate-800 hover:border-indigo-500/50 transition-all hover:scale-[1.02] shadow-sm hover:shadow-indigo-500/10"
                                >
                                    <div className="text-lg font-bold text-slate-500 opacity-50 font-mono">{idx + 1}</div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono font-bold text-indigo-400">{item.issue.displayId || 'EC-???'}</span>
                                            <span className="text-xs bg-red-500/20 text-red-400 px-1.5 rounded border border-red-500/20 font-bold">{item.issue.severity || 'S3'}</span>
                                        </div>
                                        <div className="text-sm text-slate-200 font-medium line-clamp-1">{item.issue.description || item.issue.message}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* BUCKETS */}
                <div className="space-y-6">
                    <BucketSection
                        title="Execution Blockers"
                        icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                        items={buckets.blocker}
                        color="red"
                        desc="High severity, stagnant issues blocking progress."
                        onSelectIssue={onSelectIssue}
                    />
                    <BucketSection
                        title="Product Signals"
                        icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
                        items={buckets.signal}
                        color="amber"
                        desc="User feedback and signals for product improvement."
                        onSelectIssue={onSelectIssue}
                    />
                    <BucketSection
                        title="Admin / Process"
                        icon={<ClipboardList className="w-4 h-4 text-blue-500" />}
                        items={buckets.admin}
                        color="blue"
                        desc="Routine tasks and administrative items."
                        onSelectIssue={onSelectIssue}
                    />
                    <BucketSection
                        title="Noise / Close Candidates"
                        icon={<Trash2 className="w-4 h-4 text-slate-500" />}
                        items={buckets.noise}
                        color="slate"
                        desc="Low signal, test data, or candidates for closure."
                        onSelectIssue={onSelectIssue}
                    />
                </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 text-center">
                <p className="text-xs text-slate-600 italic">
                    Read-Only Mode. Click to view/edit details.
                </p>
            </div>
        </div>
    );
};

const BucketSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    items: AnalysisResult[];
    color: 'red' | 'amber' | 'blue' | 'slate';
    desc: string;
    onSelectIssue: (issue: ReportedIssue) => void;
}> = ({ title, icon, items, color, desc, onSelectIssue }) => {

    if (items.length === 0) return null;

    const borderColor = {
        red: 'border-red-900/30',
        amber: 'border-amber-900/30',
        blue: 'border-blue-900/30',
        slate: 'border-slate-800'
    }[color];

    const headerColor = {
        red: 'text-red-400',
        amber: 'text-amber-400',
        blue: 'text-blue-400',
        slate: 'text-slate-400'
    }[color];

    return (
        <section>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h3 className={`text-sm font-bold uppercase tracking-wider ${headerColor}`}>{title}</h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">{desc}</p>
            <div className="space-y-3">
                {items.map(item => (
                    <div
                        key={item.issue.id}
                        onClick={() => onSelectIssue(item.issue)}
                        className={`bg-slate-950/50 rounded-xl p-4 border ${borderColor} hover:border-slate-700 transition-all cursor-pointer hover:bg-slate-900/80 hover:shadow-lg`}
                    >
                        <div className="flex justify-between items-start gap-4 mb-2">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono font-bold text-slate-500">{item.issue.displayId || 'EC-???'}</span>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 rounded border ${item.issue.status === ISSUE_STATUS.NEW ? 'border-brand-500/20 text-brand-400' : 'border-slate-700 text-slate-500'}`}>
                                        {item.issue.status || ISSUE_STATUS.NEW}
                                    </span>
                                </div>
                                <h4 className="text-sm text-slate-300 font-medium line-clamp-2">{item.issue.description || item.issue.message}</h4>
                            </div>
                        </div>

                        {/* Analysis Footer */}
                        <div className="mt-3 pt-3 border-t border-slate-800/50 grid grid-cols-1 gap-2">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500 font-medium">Why:</span>
                                <span className="text-slate-400">{item.reason}</span>
                            </div>
                            {(item.suggestion.status || item.suggestion.severity || item.suggestion.classification) && (
                                <div className="flex items-center gap-2 text-xs bg-slate-900 rounded p-1.5 border border-slate-800 border-dashed">
                                    <span className="text-brand-400 font-bold shrink-0">Suggestion:</span>
                                    <div className="flex gap-2 text-brand-200/80">
                                        {item.suggestion.status && <span>Status: {item.suggestion.status}</span>}
                                        {item.suggestion.severity && <span>Sev: {item.suggestion.severity}</span>}
                                        {item.suggestion.classification && <span>Class: {item.suggestion.classification}</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
