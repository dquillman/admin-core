import type { ReportedIssue } from '../types';
import { ISSUE_STATUS } from '../constants';

// --- Category sets for triage rules ---

// Categories where S1/S2 bugs directly impact user trust and correctness
const FIX_NOW_CATEGORIES = new Set([
    'quiz_assessment_logic',  // analysis + scoring
    'tutor_ai_output',        // analysis (AI correctness)
    'user_interface_ux',      // user-facing
    'auth_account_access',    // user-facing (access)
    'billing_subscription',   // user-facing (money)
]);

// Subset: categories where bugs undermine tester trust in the product
const TRUST_RISK_CATEGORIES = new Set([
    'quiz_assessment_logic',
    'tutor_ai_output',
]);

// Statuses that mean "still actionable" — eligible for Fix-Now triage
const ACTIONABLE_STATUSES: Set<string> = new Set([
    ISSUE_STATUS.NEW,
    ISSUE_STATUS.REVIEWED,
]);

const CLOSED_STATUSES: Set<string> = new Set([
    ISSUE_STATUS.CLOSED,
    ISSUE_STATUS.FIXED,
    ISSUE_STATUS.RELEASED,
    'resolved',
    'archived',
    'done',
]);

// --- Types ---

export interface ReportIssueItem {
    issue: ReportedIssue;
    assignee: string;
    reason: string;
}

export interface OperatorReport {
    summary: {
        totalOpen: number;
        bySeverity: { S1: number; S2: number; S3: number; S4: number };
        criticalRiskPresent: boolean;
        testerTrustRiskPresent: boolean;
    };
    fixNow: ReportIssueItem[];
    fixNext: ReportIssueItem[];
    parked: ReportIssueItem[];
}

// --- Selector ---

export function buildOperatorReport(
    issues: ReportedIssue[],
    resolveAssignee: (userId: string | null | undefined) => string
): OperatorReport {
    // 1. Filter to open (non-deleted, non-closed) issues
    const open = issues.filter(i => {
        if (i.deleted) return false;
        const status = (i.status || ISSUE_STATUS.NEW).toLowerCase();
        return !CLOSED_STATUSES.has(status);
    });

    // 2. Executive summary
    const bySeverity = { S1: 0, S2: 0, S3: 0, S4: 0 };
    open.forEach(i => {
        const sev = i.severity || 'S3';
        if (sev in bySeverity) bySeverity[sev as keyof typeof bySeverity]++;
    });

    const criticalRiskPresent = bySeverity.S1 > 0;

    const testerTrustRiskPresent = open.some(i => {
        const sev = i.severity || 'S3';
        return (sev === 'S1' || sev === 'S2') && TRUST_RISK_CATEGORIES.has(i.type);
    });

    // 3. Triage buckets
    const fixNow: ReportIssueItem[] = [];
    const fixNext: ReportIssueItem[] = [];
    const parked: ReportIssueItem[] = [];
    const fixNowIds = new Set<string>();

    // Pass 1: Fix-Now
    open.forEach(i => {
        const sev = i.severity || 'S3';
        const status = (i.status || ISSUE_STATUS.NEW).toLowerCase();

        if (
            (sev === 'S1' || sev === 'S2') &&
            ACTIONABLE_STATUSES.has(status) &&
            FIX_NOW_CATEGORIES.has(i.type)
        ) {
            fixNowIds.add(i.id);
            fixNow.push({
                issue: i,
                assignee: resolveAssignee(i.userId),
                reason: reasonForFixNow(i),
            });
        }
    });

    // Pass 2: Fix-Next and Parked
    open.forEach(i => {
        if (fixNowIds.has(i.id)) return;
        const sev = i.severity || 'S3';

        if (sev === 'S4') {
            parked.push({
                issue: i,
                assignee: resolveAssignee(i.userId),
                reason: 'Low severity — safe to defer',
            });
        } else if (sev === 'S2' || sev === 'S3') {
            fixNext.push({
                issue: i,
                assignee: resolveAssignee(i.userId),
                reason: reasonForFixNext(i),
            });
        }
        // S1 not in Fix-Now (wrong status or category) still lands in Fix-Next
        if (sev === 'S1' && !fixNowIds.has(i.id)) {
            fixNext.push({
                issue: i,
                assignee: resolveAssignee(i.userId),
                reason: `S1 but status is "${i.status || 'new'}" — may already be in progress`,
            });
        }
    });

    // Sort Fix-Now by severity then age (oldest first)
    const sevWeight = (s?: string) => s === 'S1' ? 0 : 1;
    const getTime = (i: ReportedIssue) => i.timestamp?.toMillis?.() || i.createdAt?.toMillis?.() || 0;

    fixNow.sort((a, b) => {
        const sw = sevWeight(a.issue.severity) - sevWeight(b.issue.severity);
        if (sw !== 0) return sw;
        return getTime(a.issue) - getTime(b.issue);
    });

    fixNext.sort((a, b) => {
        const sw = sevWeight(a.issue.severity) - sevWeight(b.issue.severity);
        if (sw !== 0) return sw;
        return getTime(a.issue) - getTime(b.issue);
    });

    return {
        summary: { totalOpen: open.length, bySeverity, criticalRiskPresent, testerTrustRiskPresent },
        fixNow,
        fixNext,
        parked,
    };
}

// --- Reason generators ---

function reasonForFixNow(i: ReportedIssue): string {
    const sev = i.severity || 'S3';
    const cat = i.type || 'unknown';
    if (sev === 'S1') return `Critical in ${formatCat(cat)} — blocks tester trust`;
    return `High severity in ${formatCat(cat)} — visible to users`;
}

function reasonForFixNext(i: ReportedIssue): string {
    const sev = i.severity || 'S3';
    if (sev === 'S2') return 'High severity but outside Fix-Now criteria';
    return 'Medium severity — address when Fix-Now is clear';
}

function formatCat(cat: string): string {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
