// Shared utilities and re-exported firebase imports for domain service modules
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    getDoc,
    setDoc,
    arrayUnion,
    writeBatch,
    runTransaction,
    type QueryDocumentSnapshot,
    type QueryConstraint,
    type DocumentReference,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../firebase';
import { safeGetDocs, safeGetDoc, safeGetCount } from '../utils/firestoreSafe';
import type { User, TesterStats, ReportedIssue, IssueNote, IssueCategory, ReleaseVersion, ReleaseVersionStatus, BillingStatus } from '../types';
import { getAppPrefix, APP_KEYS, normalizeAppValue } from '../constants';
import type { AppKey } from '../constants';

// Re-export all firebase imports so domain modules can import from here
export {
    collection,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    getDoc,
    setDoc,
    arrayUnion,
    writeBatch,
    runTransaction,
    type QueryDocumentSnapshot,
    type QueryConstraint,
    type DocumentReference,
};
export { getFunctions, httpsCallable };
export { db, auth };
export { safeGetDocs, safeGetDoc, safeGetCount };
export type { User, TesterStats, ReportedIssue, IssueNote, IssueCategory, ReleaseVersion, ReleaseVersionStatus, BillingStatus };
export { getAppPrefix, APP_KEYS, normalizeAppValue };
export type { AppKey };

export const TESTER_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// ISSUE IDENTITY FIELDS - Write-once, immutable after creation
// These fields can NEVER be modified after initial issue creation
export const IMMUTABLE_ISSUE_FIELDS = ['displayId', 'issueId', 'issue_id'] as const;

// Helper to strip immutable fields from any update payload
export const stripImmutableFields = <T extends Record<string, unknown>>(updates: T): Omit<T, typeof IMMUTABLE_ISSUE_FIELDS[number]> => {
    const safeUpdates = { ...updates };
    for (const field of IMMUTABLE_ISSUE_FIELDS) {
        if (field in safeUpdates) {
            console.warn(`[IMMUTABILITY] Blocked attempt to modify identity field: ${field}`);
            delete (safeUpdates as Record<string, unknown>)[field];
        }
    }
    return safeUpdates;
};

/**
 * Resolve the canonical displayId from Firestore issue doc data.
 * Checks displayId (canonical), then issueId/issue_id (legacy), then falls back to doc.id if it looks like an EC- prefix.
 */
export const resolveDisplayId = (data: Record<string, unknown>, docId: string): string | undefined => {
    const id = (data.displayId || data.issueId || data.issue_id) as string | undefined;
    if (id) return id;
    if (docId.startsWith('EC-')) return docId;
    return undefined;
};

// GLOBAL KILL SWITCH - STRICT NO AGGREGATION
export const CLIENT_STATS_ENABLED = true; // Enabled but only for safe value reading

export interface AdminStats {
    grantedTesters: number;
    revokedTesters: number;
    disabledUsers: number;
    totalSessions?: number;
    lastUpdated?: Timestamp;
}

/**
 * Security Layer: Enforce admin-only access at the service layer
 */
export const requireAdmin = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Access Denied: Not Authenticated");

    const userDoc = await safeGetDoc(doc(db, 'users', user.uid), { fallback: null, context: 'Auth', description: 'Check Admin Role' });
    const role = userDoc.data()?.role;
    if (!userDoc.exists() || (role !== 'admin' && role !== 'super-admin')) {
        throw new Error("Access Denied: Admin Privileges Required");
    }
};

/**
 * Normalize legacy / variant issue status strings to canonical form.
 * Combines mappings previously split across Issues.tsx and batchImportIssues.
 */
export const normalizeIssueStatus = (s?: string): string => {
    if (!s) return 'new';
    const v = s.trim().toLowerCase();
    if (v === 'open') return 'new';
    if (v === 'working' || v === 'in progress') return 'in_progress';
    if (v === 'fixed') return 'resolved';
    return v || 'new';
};

/**
 * Logs an admin action to the specific app's audit trail
 */
export const logAdminAction = async (appId: string, action: string, targetUid: string, metadata: Record<string, unknown> = {}) => {
    const user = auth.currentUser;
    if (!user) return;

    const auditCol = collection(db, 'apps', appId, 'audit');
    await addDoc(auditCol, {
        adminUid: user.uid,
        adminEmail: user.email,
        targetUid,
        action,
        timestamp: serverTimestamp(),
        metadata
    });
};

/**
 * Global Admin Audit (Top-Level)
 */
export const logGlobalAdminAction = async (action: string, targetUid: string, metadata: Record<string, unknown> = {}) => {
    const user = auth.currentUser;
    if (!user) return;

    const auditCol = collection(db, 'admin_audit');
    await addDoc(auditCol, {
        adminUid: user.uid,
        adminEmail: user.email,
        targetUserId: targetUid,
        action,
        createdAt: serverTimestamp(),
        metadata,
    });
};

// Helper for audit logs
export const pickAccessFields = (data: Record<string, unknown> | null | undefined) => ({
    testerOverride: data?.testerOverride ?? null,
    testerExpiresAt: data?.testerExpiresAt ?? null,
    plan: data?.plan ?? null,
    trialActive: data?.trialActive ?? null,
    trialEndsAt: data?.trialEndsAt ?? null,
    archived: data?.archived ?? null,
    billingStatus: data?.billingStatus ?? null,
    billingSource: data?.billingSource ?? null,
    billingRef: data?.billingRef ?? null,
    verifiedPaidAt: data?.verifiedPaidAt ?? null,
});

/** DEV-ONLY: Asserts that the uid on a mapped User always equals the Firestore doc ID. */
export const assertUidInvariant = (user: User, docId: string) => {
    if (import.meta.env.DEV && user.uid !== docId) {
        console.error(
            `[UID INVARIANT VIOLATION] user.uid "${user.uid}" !== doc.id "${docId}". ` +
            `This means Firestore doc data contains a stale/mismatched uid field. ` +
            `The doc.id should always win.`
        );
    }
};
