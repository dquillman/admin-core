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
    type QueryDocumentSnapshot,
    type QueryConstraint,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../firebase';
import { safeGetDocs, safeGetDoc, safeGetCount } from '../utils/firestoreSafe';
import type { User, TesterStats, ReportedIssue, IssueNote, IssueCategory, ReleaseVersion, ReleaseVersionStatus, BillingStatus } from '../types';
import { getAppPrefix, APP_KEYS, normalizeAppValue } from '../constants';
import type { AppKey } from '../constants';

const TESTER_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// ISSUE IDENTITY FIELDS - Write-once, immutable after creation
// These fields can NEVER be modified after initial issue creation
const IMMUTABLE_ISSUE_FIELDS = ['displayId', 'issueId', 'issue_id'] as const;

// Helper to strip immutable fields from any update payload
const stripImmutableFields = <T extends Record<string, unknown>>(updates: T): Omit<T, typeof IMMUTABLE_ISSUE_FIELDS[number]> => {
    const safeUpdates = { ...updates };
    for (const field of IMMUTABLE_ISSUE_FIELDS) {
        if (field in safeUpdates) {
            console.warn(`[IMMUTABILITY] Blocked attempt to modify identity field: ${field}`);
            delete (safeUpdates as Record<string, unknown>)[field];
        }
    }
    return safeUpdates;
};

// GLOBAL KILL SWITCH - STRICT NO AGGREGATION
export const CLIENT_STATS_ENABLED = true; // Enabled but only for safe value reading

export interface AdminStats {
    grantedTesters: number;
    revokedTesters: number;
    disabledUsers: number;
    totalSessions?: number;
    lastUpdated?: any;
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

// --- Stats Service ---
export const getDashboardStats = async (): Promise<AdminStats> => {
    try {
        // Try to read precomputed stats first
        const statsRef = doc(db, 'stats', 'admin_core');
        const snap = await safeGetDoc(statsRef, { fallback: null, context: 'Stats', description: 'Get Dashboard Stats' });

        if (snap.exists()) {
            return snap.data() as AdminStats;
        }

        // FALLBACK: Calculate live counts if precomputed stats are missing
        // This ensures the dashboard isn't empty on fresh deployments
        const usersCol = collection(db, 'users');

        const [grantedSnap, disabledSnap] = await Promise.all([
            safeGetCount(query(usersCol, where('testerOverride', '==', true)), { fallback: 0, context: 'Stats', description: 'Count Granted' }),
            safeGetCount(query(usersCol, where('disabled', '==', true)), { fallback: 0, context: 'Stats', description: 'Count Disabled' })
        ]);

        return {
            grantedTesters: grantedSnap.data().count,
            revokedTesters: 0, // Cannot easily count revoked without expensive audit query
            disabledUsers: disabledSnap.data().count,
            lastUpdated: new Date()
        };
    } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        return {
            grantedTesters: 0,
            revokedTesters: 0,
            disabledUsers: 0
        };
    }
};

// --- Users Service ---

/** DEV-ONLY: Asserts that the uid on a mapped User always equals the Firestore doc ID. */
const assertUidInvariant = (user: User, docId: string) => {
    if (import.meta.env.DEV && user.uid !== docId) {
        console.error(
            `[UID INVARIANT VIOLATION] user.uid "${user.uid}" !== doc.id "${docId}". ` +
            `This means Firestore doc data contains a stale/mismatched uid field. ` +
            `The doc.id should always win.`
        );
    }
};

export const getAppSubscriptionUids = async (appId: string): Promise<Set<string>> => {
    const subsCol = collection(db, 'apps', appId, 'subscriptions');
    const snap = await safeGetDocs(query(subsCol), { fallback: [], context: 'Apps', description: `Get ${appId} subscriptions` });
    return new Set(snap.docs.map(d => d.id));
};

export const searchUsers = async (searchTerm: string): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    let q;

    if (!searchTerm) {
        q = query(usersCol, limit(20), orderBy('createdAt', 'desc'));
    } else {
        // Simple prefix search
        q = query(usersCol, where('email', '>=', searchTerm), where('email', '<=', searchTerm + '\uf8ff'), limit(20));
    }

    const snap = await safeGetDocs(q, { fallback: [], context: 'Users', description: 'Search Users' });
    return snap.docs.map(doc => {
        const user = { ...doc.data(), uid: doc.id } as User;
        assertUidInvariant(user, doc.id);
        return user;
    });
};

export const getTesterUsers = async (activeOnly: boolean = false): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    let q = query(usersCol, where('testerOverride', '==', true));

    if (activeOnly) {
        // Firestore limitation: filtering by multiple fields requires composite index
        // We'll filter visually in UI or fetch all override=true and filter in memory if list is small
        // For now, let's just return all having the flag
    }

    const snap = await safeGetDocs(q, { fallback: [], context: 'Users', description: 'Get Testers' });
    return snap.docs.map(doc => {
        const user = { ...doc.data(), uid: doc.id } as User;
        assertUidInvariant(user, doc.id);
        return user;
    });
};

export const getTesterSummaryStats = async (): Promise<TesterStats> => {
    return getDashboardStats();
};

// --- Audit Log Service (App Scoped) ---
export const getRecentAuditLogs = async (appId: string, limitCount: number = 10) => {
    const auditCol = collection(db, 'apps', appId, 'audit');
    const q = query(auditCol, orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Audit', description: 'Recent Logs' });
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Logs an admin action to the specific app's audit trail
 */
export const logAdminAction = async (appId: string, action: string, targetUid: string, metadata: any = {}) => {
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
export const logGlobalAdminAction = async (action: string, targetUid: string, metadata: any = {}) => {
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

/**
 * Tester Access Management (Direct Writes)
 */
const _applyTesterAccess = async (targetUid: string, auditAction: string) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: `${auditAction} Access Check` });
    if (!userSnap.exists()) throw new Error("User not found");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TESTER_EXPIRY_MS);

    const userData = userSnap.data();
    const isStripePaid = userData?.billingSource === 'stripe';

    const updates = {
        testerOverride: true,
        testerExpiresAt: Timestamp.fromDate(expiresAt),
        testerGrantedAt: serverTimestamp(),
        testerGrantedBy: adminUser.email || adminUser.uid,
        trialActive: false,
        trialEndsAt: null,
        ...(isStripePaid ? {} : {
            billingStatus: 'tester' as const,
            billingSource: 'manual' as const,
        }),
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction(auditAction, targetUid, {
        prev: pickAccessFields(userSnap.data()),
        new: updates
    });
};

export const grantTesterAccess = async (targetUid: string) => {
    await _applyTesterAccess(targetUid, 'GRANT_TESTER_PRO');
};

export const revokeTesterAccess = async (targetUid: string) => {
    await requireAdmin();
    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Revoke Access Check' });

    if (!userSnap.exists()) throw new Error("User not found");

    const userData = userSnap.data();
    const updates: Record<string, any> = {
        testerOverride: false,
        testerExpiresAt: null,
        testerGrantedAt: null,
        testerGrantedBy: null,
    };

    // Preserve billing status if Stripe-verified paid
    if (userData?.billingSource !== 'stripe') {
        updates.billingStatus = 'unknown';
        updates.billingSource = null;
    }

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('REVOKE_TESTER_PRO', targetUid, {
        prev: pickAccessFields(userSnap.data()),
        new: updates
    });
};

export const fixTesterAccess = async (targetUid: string) => {
    await _applyTesterAccess(targetUid, 'FIX_TESTER');
};

// Helper for audit logs
const pickAccessFields = (data: any) => ({
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

/**
 * Trial Access Management (Direct Writes)
 */
export const startTrial = async (targetUid: string) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Start Trial Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const userData = userSnap.data();
    // Guard: Do not start trial for paid or comped users
    if (userData?.billingStatus === 'paid' || userData?.billingStatus === 'comped') {
        throw new Error("Cannot start trial for a user with paid or comped status.");
    }
    // Guard: Do not start trial for paid Pro users
    if (userData?.plan === 'pro') {
        throw new Error("Cannot start trial for a paid Pro user");
    }
    // Guard: Do not start trial for users with active tester access
    if (userData?.testerOverride === true) {
        throw new Error('Cannot start trial: user has active tester access. Revoke tester first.');
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + TESTER_EXPIRY_MS);

    const updates = {
        trialActive: true,
        trialEndsAt: Timestamp.fromDate(endsAt),
        billingStatus: 'trial' as const,
        billingSource: 'manual' as const,
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('START_TRIAL', targetUid, {
        prev: pickAccessFields(userData),
        new: updates
    });
};

export const extendTrial = async (targetUid: string) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Extend Trial Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const userData = userSnap.data();
    if (!userData?.trialActive) {
        throw new Error("Cannot extend trial: user does not have an active trial.");
    }
    // Extend from current end date if still active, otherwise from now
    const currentEnd = userData?.trialEndsAt?.toDate?.() || new Date();
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const endsAt = new Date(baseDate.getTime() + TESTER_EXPIRY_MS);

    const updates = {
        trialActive: true,
        trialEndsAt: Timestamp.fromDate(endsAt),
        billingStatus: 'trial' as const,
        billingSource: 'manual' as const,
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('EXTEND_TRIAL', targetUid, {
        prev: pickAccessFields(userData),
        new: updates
    });
};

export const cancelTrial = async (targetUid: string) => {
    await requireAdmin();

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Cancel Trial Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const updates = {
        trialActive: false,
        trialEndsAt: null,
        billingStatus: 'unknown' as const,
        billingSource: null,
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('CANCEL_TRIAL', targetUid, {
        prev: pickAccessFields(userSnap.data()),
        new: updates
    });
};

/**
 * Grant Fresh Trial (Admin Override � Direct Write)
 * Unconditionally resets trial to a new window. No paid-user guard.
 * App-scoped via appId for audit trail; writes to flat user fields so all apps see it.
 */
export const grantFreshTrial = async (targetUid: string, appId: string, days: number = 14) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Grant Fresh Trial Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const now = new Date();
    const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const updates = {
        trialActive: true,
        trialEndsAt: Timestamp.fromDate(endsAt),
        billingStatus: 'trial' as const,
        billingSource: 'manual' as const,
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('GRANT_FRESH_TRIAL', targetUid, {
        appId,
        days,
        grantedBy: adminUser.email || adminUser.uid,
        prev: pickAccessFields(userSnap.data()),
        new: updates
    });
};

/**
 * Archive Management (Soft Delete � Direct Writes)
 * Archive does NOT revoke access or disable auth. It only hides from default list.
 */
export const archiveUser = async (targetUid: string) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Archive User Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const updates = {
        archived: true,
        archivedAt: serverTimestamp(),
        archivedBy: adminUser.email || adminUser.uid,
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('ARCHIVE_USER', targetUid, {
        prev: pickAccessFields(userSnap.data()),
        new: updates
    });
};

export const restoreUser = async (targetUid: string) => {
    await requireAdmin();

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Restore User Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const updates = {
        archived: false,
        archivedAt: null,
        archivedBy: null,
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('RESTORE_USER', targetUid, {
        prev: pickAccessFields(userSnap.data()),
        new: updates
    });
};

/**
 * Set Billing Status (Direct Write � Pattern A)
 * Admin can explicitly set comped, tester, or unknown.
 * 'paid' is excluded � only Stripe can set that.
 */
export const setBillingStatus = async (targetUid: string, status: Exclude<BillingStatus, 'paid'>) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Set Billing Status Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const currentData = userSnap.data();
    if (currentData?.billingStatus === 'paid' && currentData?.billingSource === 'stripe') {
        console.warn(`[BILLING] Blocked attempt to override Stripe-verified paid status for user ${targetUid}`);
        throw new Error("Cannot override Stripe-verified paid status via admin UI");
    }

    const updates: Record<string, any> = {
        billingStatus: status,
        billingSource: status === 'unknown' ? null : 'manual',
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('SET_BILLING_STATUS', targetUid, {
        prev: pickAccessFields(userSnap.data()),
        new: updates,
    });
};

export const setUserTag = async (targetUid: string, tag: string | null) => {
    await requireAdmin();
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { userTag: tag });
    await logGlobalAdminAction('SET_USER_TAG', targetUid, { tag });
};

/**
 * Update User Profile (Direct Write � Pattern A)
 * Updates firstName, lastName, displayName. Skips write if nothing changed.
 */
export const updateUserProfile = async (
    targetUid: string,
    updates: { firstName?: string; lastName?: string; displayName?: string }
) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Update Profile Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const userData = userSnap.data();

    // Diff: only write fields that actually changed
    const changedFields: Record<string, string> = {};
    const prev: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== (userData?.[key] ?? '')) {
            changedFields[key] = value;
            prev[key] = userData?.[key] ?? '';
        }
    }

    if (Object.keys(changedFields).length === 0) return;

    await updateDoc(userRef, {
        ...changedFields,
        updatedAt: serverTimestamp(),
    });

    await logGlobalAdminAction('UPDATE_USER_PROFILE', targetUid, {
        fieldsChanged: Object.keys(changedFields),
        prev,
        new: changedFields,
    });
};

/**
 * Admin Update Email (Cloud Function � Pattern B)
 * Updates email in both Firebase Auth and Firestore via Cloud Function.
 */
export const adminUpdateEmail = async (targetUid: string, newEmail: string) => {
    const functions = getFunctions();
    const callable = httpsCallable(functions, 'adminUpdateUserEmail');
    await callable({ targetUid, newEmail });
};

// --- App Config Service (App Scoped) ---
export const getAppConfig = async (appId: string, docId: string) => {
    const configDoc = await safeGetDoc(doc(db, 'apps', appId, 'config', docId), { fallback: null, context: 'Config', description: 'Get App Config' });
    return configDoc.exists() ? configDoc.data() : null;
};

export const updateAppConfig = async (appId: string, docId: string, data: any) => {
    await requireAdmin();
    await updateDoc(doc(db, 'apps', appId, 'config', docId), data);
    await logAdminAction(appId, `update_config_${docId}`, 'system', { newData: data });
};

// --- Legacy Admin Config Service (for migration) ---
export const getLegacyAdminConfig = async (docId: string) => {
    const configDoc = await safeGetDoc(doc(db, 'admin_config', docId), { fallback: null, context: 'Config', description: 'Get Legacy Config' });
    return configDoc.exists() ? configDoc.data() : null;
};

// --- Sources Service (App Scoped) ---
export const getSources = async (appId: string) => {
    const sourcesCol = collection(db, 'apps', appId, 'sources');
    const snap = await safeGetDocs(sourcesCol, { fallback: [], context: 'Sources', description: 'Get Sources' });
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addSource = async (appId: string, source: any) => {
    await requireAdmin();
    const sourcesCol = collection(db, 'apps', appId, 'sources');
    const docRef = await addDoc(sourcesCol, {
        ...source,
        createdAt: serverTimestamp(),
        status: 'ok'
    });
    await logAdminAction(appId, 'add_source', docRef.id, { url: source.url });
};

export const deleteSource = async (appId: string, sourceId: string) => {
    await requireAdmin();
    await deleteDoc(doc(db, 'apps', appId, 'sources', sourceId));
    await logAdminAction(appId, 'delete_source', sourceId);
};

export const updateSource = async (appId: string, sourceId: string, data: any) => {
    await requireAdmin();
    await updateDoc(doc(db, 'apps', appId, 'sources', sourceId), data);
    await logAdminAction(appId, 'update_source', sourceId, data);
};

/**
 * Tester Activity (User Sessions)
 */
export const getUserSessions = async (filters: SessionFilters = {}) => {
    void filters; // filters accepted for future use but not yet applied server-side
    const snap = await safeGetDocs(
        query(
            collection(db, 'user_sessions'),
            orderBy('loginAt', 'desc'),
            limit(50)
        ),
        {
            fallback: [],
            context: 'Sessions',
            description: 'Get User Sessions'
        }
    );

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _raw: doc
    }));
};


export const getActiveSessionsCount = async (appId?: string) => {
    const baseRef = collection(db, 'user_sessions');
    const constraints: QueryConstraint[] = [];

    if (appId) {
        constraints.push(where('app', '==', appId));
    }

    constraints.push(where('logoutAt', '==', null));

    const q = query(baseRef, ...constraints);

    const snap = await safeGetCount(q, {
        fallback: 0,
        context: 'Sessions',
        description: 'Active Sessions Count'
    });

    return snap.data().count ?? 0;
};

export interface SessionFilters {
    appId?: string;
    testerEmail?: string;
    dateRange?: '24h' | '7d' | '30d';
    activeOnly?: boolean;
    email?: string;
    lastDoc?: QueryDocumentSnapshot;
}

export type SessionRecord = { id: string; _raw: QueryDocumentSnapshot } & Record<string, unknown>;

export interface SessionResult {
    sessions: SessionRecord[];
    lastDoc: QueryDocumentSnapshot | undefined;
}




// --- Marketing Assets Service ---
export const getMarketingAssets = async () => {
    const docRef = doc(db, 'marketing_assets', 'examcoach_pro');
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
};

export const updateMarketingAssets = async (data: { pro_value_primary: string; pro_value_secondary: string }) => {
    await requireAdmin();
    const user = auth.currentUser;
    const docRef = doc(db, 'marketing_assets', 'examcoach_pro');

    // Check if distinct to avoid unnecessary writes/logs?
    // For now, simple set/merge
    await setDoc(docRef, {
        ...data,
        updated_at: serverTimestamp(),
        updated_by: user?.email || user?.uid
    }, { merge: true });

    await logGlobalAdminAction('UPDATE_MARKETING_ASSETS', 'examcoach_pro', { data });
};

/** @deprecated Aggregation disabled � returns 0. */
export const getActionLatencyCount = async () => {
    return 0;
};

// --- User Lookup (lightweight, for dropdowns) ---
export const fetchAllUsersLookup = async (): Promise<{ uid: string; email: string }[]> => {
    const usersCol = collection(db, 'users');
    const snap = await safeGetDocs(usersCol, { fallback: [], context: 'Users', description: 'Fetch All Users Lookup' });
    return snap.docs.map(d => ({ uid: d.id, email: d.data().email || '' }));
};

// --- Issues Management Service (Read-Only + Notes) ---
export const getReportedIssues = async (limitCount: number = 100): Promise<ReportedIssue[]> => {
    try {
        const issuesCol = collection(db, 'issues');
        // Client uses 'timestamp', Admin uses 'createdAt'. Order by timestamp for client issues.
        const q = query(issuesCol, orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await safeGetDocs(q, { fallback: [], context: 'Issues', description: 'Get Issues' });
        return snap.docs.map(doc => {
            const data = doc.data();
            // Robust ID resolution: Try displayId (canonical), then issue_id/issueId (legacy), then doc.id
            let finalDisplayId = data.displayId || data.issueId || data.issue_id;

            if (!finalDisplayId && doc.id.startsWith('EC-')) {
                finalDisplayId = doc.id;
            }

            return {
                id: doc.id,
                ...data,
                displayId: finalDisplayId // Pass raw value (undefined if missing)
            } as ReportedIssue;
        });
    } catch (error) {
        console.error("Failed to fetch reported issues:", error);
        return [];
    }
};

export const addIssueNote = async (issueId: string, text: string) => {
    await requireAdmin();
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    const trimmed = text.trim();
    if (!trimmed) throw new Error("Note text cannot be empty");
    if (trimmed.length > 10000) throw new Error("Note text exceeds maximum length of 10,000 characters");

    const note: IssueNote = {
        text: trimmed,
        adminUid: user.uid,
        createdAt: Timestamp.now()
    };

    const issueRef = doc(db, 'issues', issueId);
    await updateDoc(issueRef, {
        notes: arrayUnion(note)
    });
};

export const updateIssueStatus = async (issueId: string, status: string) => {
    await requireAdmin();
    await updateDoc(doc(db, 'issues', issueId), { status });
};

export const updateIssueDetails = async (issueId: string, updates: { severity?: string; type?: string; classification?: string; userId?: string | null; plannedForVersion?: string | null }) => {
    await requireAdmin();
    // Guard: Strip any identity fields that might be accidentally included
    const safeUpdates = stripImmutableFields(updates);
    await updateDoc(doc(db, 'issues', issueId), safeUpdates);
};

export const deleteIssue = async (issueId: string) => {
    await requireAdmin();
    // Soft delete to allow recovery if needed, and to maintain history
    await updateDoc(doc(db, 'issues', issueId), { deleted: true });
};

// Parse a numeric issue number from a displayId like "EC-42" given a prefix like "EC".
// Returns the number (e.g. 42) or null if the string doesn't match.
const parseIssueNumber = (displayId: string, prefix: string): number | null => {
    const match = displayId.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) return null;
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
};

// Create a new issue with auto-generated ID based on app prefix
export const createIssue = async (data: {
    app: AppKey;
    title: string;
    description?: string;
    telemetry?: { os?: string; browser?: string; environment?: string; submittedFrom?: string; userAgent?: string; examId?: string };
}): Promise<string> => {
    await requireAdmin();

    // Validate app key
    if (!APP_KEYS.includes(data.app)) {
        throw new Error(`Invalid app key: ${data.app}. Must be one of: ${APP_KEYS.join(', ')}`);
    }

    // Get prefix from registry
    const prefix = getAppPrefix(data.app);

    // Find max ID for this prefix (delegates to getMaxIssueNumber instead of inline full scan)
    const issuesCol = collection(db, 'issues');
    const maxId = await getMaxIssueNumber(prefix);

    const displayId = `${prefix}-${maxId + 1}`;

    const issueDoc = await addDoc(issuesCol, {
        app: data.app, // Canonical key stored
        message: data.title,
        description: data.description || '',
        displayId,
        issueId: displayId,
        status: 'new',
        severity: 'S2',
        type: 'Uncategorized',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notes: [],
        // Telemetry (auto-captured)
        ...(data.telemetry?.os && { os: data.telemetry.os }),
        ...(data.telemetry?.browser && { browser: data.telemetry.browser }),
        ...(data.telemetry?.environment && { environment: data.telemetry.environment }),
        ...(data.telemetry?.submittedFrom && { submittedFrom: data.telemetry.submittedFrom }),
        ...(data.telemetry?.userAgent && { userAgent: data.telemetry.userAgent }),
        ...(data.telemetry?.examId && { examId: data.telemetry.examId }),
    });

    return issueDoc.id;
};

export const subscribeToReportedIssues = (limitCount: number = 100, onData: (issues: ReportedIssue[]) => void): (() => void) => {
    const issuesCol = collection(db, 'issues');
    const q = query(issuesCol, orderBy('timestamp', 'desc'), limit(limitCount));

    return onSnapshot(q, (snapshot) => {
        const issues = snapshot.docs.map(doc => {
            const data = doc.data();
            let finalDisplayId = data.displayId || data.issueId || data.issue_id;

            if (!finalDisplayId && doc.id.startsWith('EC-')) {
                finalDisplayId = doc.id;
            }

            return {
                id: doc.id,
                ...data,
                displayId: finalDisplayId
            } as ReportedIssue;
        });
        onData(issues);
    }, (error) => {
        console.error("Issues subscription error:", error);
    });
};

// Scan ALL issues to find the true maximum number for a given prefix.
// Uses no orderBy (avoids excluding docs without the ordered field)
// and no limit (avoids missing older high-numbered issues).
const getMaxIssueNumber = async (prefix: string = 'EC'): Promise<number> => {
    const issuesCol = collection(db, 'issues');
    const snap = await safeGetDocs(issuesCol, { fallback: [], context: 'Issues', description: 'Get Max Issue Number' });

    let maxId = 0;
    snap.docs.forEach(d => {
        const data = d.data();
        const idStr = data.displayId || data.issueId || data.issue_id;
        if (idStr && typeof idStr === 'string') {
            const num = parseIssueNumber(idStr, prefix);
            if (num !== null && num > maxId) maxId = num;
        }
    });
    return maxId;
};

export const assignMissingIssueIds = async (): Promise<number> => {
    await requireAdmin();

    const issuesCol = collection(db, 'issues');
    const snap = await safeGetDocs(issuesCol, { fallback: [], context: 'Issues', description: 'Assign IDs Check' });

    // Group docs missing displayIds by their app prefix
    const missingByPrefix = new Map<string, any[]>();
    snap.docs.forEach(d => {
        const data = d.data();
        const idStr = data.displayId || data.issueId || data.issue_id;
        if (!idStr) {
            const appKey = data.app as AppKey | undefined;
            const prefix = appKey && APP_KEYS.includes(appKey) ? getAppPrefix(appKey) : 'EC';
            if (!missingByPrefix.has(prefix)) missingByPrefix.set(prefix, []);
            missingByPrefix.get(prefix)!.push(d);
        }
    });

    let totalAssigned = 0;
    for (const [prefix, docs] of missingByPrefix) {
        if (docs.length === 0) continue;

        const maxId = await getMaxIssueNumber(prefix);
        let nextId = maxId + 1;

        const batch = (await import('firebase/firestore')).writeBatch(db);
        for (const docSnap of docs) {
            const newDisplayId = `${prefix}-${nextId}`;
            batch.update(docSnap.ref, {
                displayId: newDisplayId,
                issueId: newDisplayId,
                timestamp: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            nextId++;
        }
        await batch.commit();
        totalAssigned += docs.length;
    }

    return totalAssigned;
};

// One-time repair: detect duplicate displayIds and reassign new unique numbers to extras.
export const repairDuplicateIssueIds = async (): Promise<{ fixed: number; log: string[] }> => {
    await requireAdmin();

    const issuesCol = collection(db, 'issues');
    const snap = await safeGetDocs(issuesCol, { fallback: [], context: 'Issues', description: 'Repair Duplicate IDs' });

    // Group docs by prefix, then find duplicates within each prefix
    // key = "PREFIX-NUM", value = list of {ref, ts, prefix, num}
    const byPrefix = new Map<string, Map<number, { ref: any; ts: number }[]>>();

    snap.docs.forEach(d => {
        const data = d.data();
        const idStr = data.displayId || data.issueId || data.issue_id;
        if (idStr && typeof idStr === 'string') {
            const match = idStr.match(/^([A-Z]+)-(\d+)$/);
            if (match) {
                const prefix = match[1];
                const num = parseInt(match[2], 10);
                if (!isNaN(num)) {
                    if (!byPrefix.has(prefix)) byPrefix.set(prefix, new Map());
                    const idMap = byPrefix.get(prefix)!;
                    const ts = data.timestamp?.toMillis?.() || data.createdAt?.toMillis?.() || 0;
                    const list = idMap.get(num) || [];
                    list.push({ ref: d.ref, ts });
                    idMap.set(num, list);
                }
            }
        }
    });

    const logEntries: string[] = [];
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    let writeCount = 0;

    for (const [prefix, idMap] of byPrefix) {
        // Find duplicates within this prefix
        const duplicates: { num: number; docs: { ref: any; ts: number }[] }[] = [];
        idMap.forEach((docs, num) => {
            if (docs.length > 1) duplicates.push({ num, docs });
        });

        if (duplicates.length === 0) continue;

        // Max for this prefix
        let maxId = 0;
        idMap.forEach((_, num) => { if (num > maxId) maxId = num; });
        let nextId = maxId + 1;

        duplicates.forEach(({ num, docs }) => {
            // Oldest keeps the original ID
            docs.sort((a, b) => a.ts - b.ts);
            for (let i = 1; i < docs.length; i++) {
                const newId = `${prefix}-${nextId}`;
                batch.update(docs[i].ref, {
                    displayId: newId,
                    issueId: newId,
                    updatedAt: serverTimestamp()
                });
                logEntries.push(`${prefix}-${num} (duplicate #${i}) → ${newId}`);
                nextId++;
                writeCount++;
            }
        });
    }

    if (writeCount === 0) {
        return { fixed: 0, log: ['No duplicate issue IDs found.'] };
    }

    if (writeCount > 500) {
        return { fixed: 0, log: ['Too many duplicates for single batch (>500). Manual intervention needed.'] };
    }

    await batch.commit();
    return { fixed: writeCount, log: logEntries };
};

// One-time repair: fix issues where displayId prefix doesn't match the app field.
// e.g. a migraine-tracker issue with EC-131 should be MT-N.
export const repairMismatchedPrefixes = async (): Promise<{ fixed: number; log: string[] }> => {
    await requireAdmin();

    const issuesCol = collection(db, 'issues');
    const snap = await safeGetDocs(issuesCol, { fallback: [], context: 'Issues', description: 'Repair Mismatched Prefixes' });

    // Find docs where the displayId prefix doesn't match the app's expected prefix
    const mismatched: { ref: any; app: string; currentId: string; expectedPrefix: string }[] = [];

    snap.docs.forEach(d => {
        const data = d.data();
        if (data.deleted) return;
        const appKey = data.app as AppKey | undefined;
        if (!appKey || !APP_KEYS.includes(appKey)) return;

        const expectedPrefix = getAppPrefix(appKey);
        const idStr = data.displayId || data.issueId || data.issue_id;
        if (!idStr || typeof idStr !== 'string') return;

        const match = idStr.match(/^([A-Z]+)-(\d+)$/);
        if (match && match[1] !== expectedPrefix) {
            mismatched.push({ ref: d.ref, app: appKey, currentId: idStr, expectedPrefix });
        }
    });

    if (mismatched.length === 0) {
        return { fixed: 0, log: ['No mismatched prefixes found.'] };
    }

    // For each prefix that needs fixing, get the current max and assign new sequential IDs
    const maxByPrefix = new Map<string, number>();
    for (const item of mismatched) {
        if (!maxByPrefix.has(item.expectedPrefix)) {
            maxByPrefix.set(item.expectedPrefix, await getMaxIssueNumber(item.expectedPrefix));
        }
    }

    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    const logEntries: string[] = [];

    for (const item of mismatched) {
        const max = maxByPrefix.get(item.expectedPrefix)!;
        const nextId = max + 1;
        maxByPrefix.set(item.expectedPrefix, nextId);
        const newId = `${item.expectedPrefix}-${nextId}`;
        batch.update(item.ref, { displayId: newId, issueId: newId, updatedAt: serverTimestamp() });
        logEntries.push(`${item.currentId} (${item.app}) → ${newId}`);
    }

    await batch.commit();
    return { fixed: mismatched.length, log: logEntries };
};


// --- Issue Category Registry ---
export const getIssueCategories = async (): Promise<IssueCategory[]> => {
    const catsCol = collection(db, 'issue_categories');
    const snap = await safeGetDocs(query(catsCol, orderBy('label', 'asc')), { fallback: [], context: 'Categories', description: 'Get Categories' });
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as IssueCategory));
};

export const subscribeToIssueCategories = (onData: (categories: IssueCategory[]) => void): (() => void) => {
    const catsCol = collection(db, 'issue_categories');
    return onSnapshot(query(catsCol, orderBy('label', 'asc')), (snapshot) => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IssueCategory));
        onData(categories);
    });
};

export const addIssueCategory = async (cat: Omit<IssueCategory, 'createdAt' | 'createdBy'>) => {
    await requireAdmin();
    const user = auth.currentUser;
    // Slugify the ID if not provided, or ensure the provided ID is safe
    const safeId = cat.id.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');

    // Check if exists
    const docRef = doc(db, 'issue_categories', safeId);
    const exists = (await getDoc(docRef)).exists();
    if (exists) throw new Error("Category ID already exists");

    await setDoc(docRef, {
        ...cat,
        id: safeId,
        createdAt: serverTimestamp(),
        createdBy: user?.uid === 'system' ? 'system' : 'admin'
    });
};

export const updateIssueCategory = async (id: string, updates: Partial<IssueCategory>) => {
    await requireAdmin();
    // Prevent ID updates
    const { id: _, ...safeUpdates } = updates;
    await updateDoc(doc(db, 'issue_categories', id), safeUpdates);
};

// --- Bulk Issue Import ---

export interface ImportIssueRow {
    title: string;
    severity: string;
    status?: string;
    category?: string;
    source?: string;
    summary?: string;
    notes?: string;
    app?: string;
    createdBy?: string;
}

let importInProgress = false;

export const batchImportIssues = async (rows: ImportIssueRow[]): Promise<number> => {
    await requireAdmin();

    if (importInProgress) {
        throw new Error('An import is already in progress. Please wait for it to complete.');
    }

    if (rows.length === 0) return 0;
    if (rows.length > 500) throw new Error('Batch limit exceeded: maximum 500 rows per import.');

    importInProgress = true;
    try {
        const VALID_STATUSES: Set<string> = new Set([
            'new', 'reviewed', 'backlogged', 'in_progress', 'resolved', 'released', 'closed',
        ]);
        const validateStatus = (status?: string): string => {
            const normalized = normalizeIssueStatus(status);
            return VALID_STATUSES.has(normalized) ? normalized : 'new';
        };

        // Get the true max per prefix before writing, so imported issues get unique sequential IDs
        const maxByPrefix = new Map<string, number>();
        for (const row of rows) {
            const p = getAppPrefix((row.app || '') as AppKey);
            if (!maxByPrefix.has(p)) {
                maxByPrefix.set(p, await getMaxIssueNumber(p));
            }
        }

        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);
        const user = auth.currentUser;

        rows.forEach(row => {
            const ref = doc(collection(db, 'issues'));
            const rowPrefix = getAppPrefix((row.app || '') as AppKey);
            const nextId = (maxByPrefix.get(rowPrefix) || 0) + 1;
            maxByPrefix.set(rowPrefix, nextId);
            const displayId = `${rowPrefix}-${nextId}`;

            const issueDoc: Record<string, any> = {
                description: row.title,
                severity: row.severity,
                status: validateStatus(row.status),
                type: row.category || '',
                app: row.app || '',
                userId: row.createdBy || user?.email || null,
                message: row.summary || '',
                displayId,
                issueId: displayId,
                url: null,
                deleted: false,
                timestamp: serverTimestamp(),
                createdAt: serverTimestamp(),
            };

            if (row.source) {
                issueDoc.source = row.source;
            }

            if (row.notes) {
                issueDoc.notes = [{
                    text: row.notes,
                    adminUid: user?.uid || 'import',
                    createdAt: Timestamp.now(),
                }];
            }

            batch.set(ref, issueDoc);
        });

        await batch.commit();
        return rows.length;
    } finally {
        importInProgress = false;
    }
};

export const seedDefaultCategories = async () => {
    await requireAdmin();
    const defaults = [
        { id: 'auth_account_access', label: 'Authentication & Account Access', description: 'Issues related to login, signup, passwords, and sessions.' },
        { id: 'user_interface_ux', label: 'User Interface / UX', description: 'Visual bugs, layout issues, typos, and confusing interactions.' },
        { id: 'quiz_assessment_logic', label: 'Quiz & Assessment Logic', description: 'Problems with question/answer logic, scoring, or exam flows.' },
        { id: 'tutor_ai_output', label: 'Tutor / AI Output', description: 'Incorrect, hallucinated, or unhelpful AI responses.' },
        { id: 'performance_stability', label: 'Performance & Stability', description: 'Crashes, slow loading, timeouts, or network errors.' },
        { id: 'billing_subscription', label: 'Billing & Subscription', description: 'Payments, plan upgrades/downgrades, and receipt issues.' }
    ];

    const batch = (await import('firebase/firestore')).writeBatch(db);
    let count = 0;

    for (const def of defaults) {
        const docRef = doc(db, 'issue_categories', def.id);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            batch.set(docRef, {
                ...def,
                status: 'active',
                createdAt: serverTimestamp(),
                createdBy: 'system'
            });
            count++;
        }
    }

    if (count > 0) {
        await batch.commit();
    }
    return count;
};

// --- Release Version Registry ---

const VERSION_REGEX = /^\d+\.\d{1,2}\.\d+$/;

// Legacy versions without appId are treated as 'exam-coach'; normalize legacy values (e.g. "migraine tracker" → "migraine-tracker")
const resolveVersionAppId = (v: ReleaseVersion): string => normalizeAppValue(v.appId || 'exam-coach');

export const getReleaseVersions = async (appId?: string): Promise<ReleaseVersion[]> => {
    const col = collection(db, 'release_versions');
    const constraints: QueryConstraint[] = [orderBy('version', 'desc')];
    // Server-side filter when appId is provided. Legacy docs (no appId) default to 'exam-coach',
    // so we can only use a Firestore where() for non-exam-coach apps. For exam-coach (or no appId),
    // we fall back to client-side filtering to capture legacy docs that lack the appId field.
    const norm = appId ? normalizeAppValue(appId) : undefined;
    const useServerFilter = norm && norm !== 'exam-coach';
    if (useServerFilter) { constraints.push(where('appId', '==', norm)); }
    const q = query(col, ...constraints);
    const snap = await safeGetDocs(q, { fallback: [], context: 'Versions', description: 'Get Release Versions' });
    let versions = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseVersion));
    // Client-side filter for exam-coach (catches legacy docs without appId field)
    if (norm && !useServerFilter) { versions = versions.filter(v => resolveVersionAppId(v) === norm); }
    return versions;
};

export const subscribeToReleaseVersions = (onData: (versions: ReleaseVersion[]) => void, appId?: string): (() => void) => {
    const col = collection(db, 'release_versions');
    const constraints: QueryConstraint[] = [orderBy('version', 'desc')];
    const norm = appId ? normalizeAppValue(appId) : undefined;
    const useServerFilter = norm && norm !== 'exam-coach';
    if (useServerFilter) { constraints.push(where('appId', '==', norm)); }
    return onSnapshot(query(col, ...constraints), (snapshot) => {
        let versions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseVersion));
        if (norm && !useServerFilter) { versions = versions.filter(v => resolveVersionAppId(v) === norm); }
        onData(versions);
    }, (error) => {
        console.error("Release versions subscription error:", error);
    });
};

export const addReleaseVersion = async (version: string, rawAppId: string) => {
    await requireAdmin();
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    const appId = normalizeAppValue(rawAppId);

    if (!VERSION_REGEX.test(version)) {
        throw new Error("Invalid version format. Use x.x.x or x.xx.x format (e.g. 1.5.1 or 1.15.1)");
    }

    // Use appId-prefixed doc ID to allow same version across apps
    const docId = `${appId}__${version}`;
    const docRef = doc(db, 'release_versions', docId);
    const exists = (await getDoc(docRef)).exists();
    if (exists) throw new Error(`Version ${version} already exists for this app`);

    await setDoc(docRef, {
        version,
        appId,
        status: 'planned',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
    });

    await logGlobalAdminAction('ADD_RELEASE_VERSION', docId, { version, appId });
};

export const updateReleaseVersionStatus = async (versionId: string, status: ReleaseVersionStatus) => {
    await requireAdmin();
    await updateDoc(doc(db, 'release_versions', versionId), { status });
    await logGlobalAdminAction('UPDATE_VERSION_STATUS', versionId, { status });
};

export const deleteReleaseVersion = async (versionId: string) => {
    await requireAdmin();
    await deleteDoc(doc(db, 'release_versions', versionId));
    await logGlobalAdminAction('DELETE_RELEASE_VERSION', versionId, {});
};

// --- PFV (Planned for Version) on Issues ---

export const updateIssuePFV = async (issueId: string, prevPFV: string | null, newPFV: string | null) => {
    await requireAdmin();

    // Validate newPFV exists in release_versions (or is null to clear)
    if (newPFV) {
        const col = collection(db, 'release_versions');
        const q = query(col, where('version', '==', newPFV));
        const snap = await safeGetDocs(q, { fallback: [], context: 'PFV/RIV Validation', description: `Validate version ${newPFV}` });
        if (snap.empty) {
            throw new Error(`Version ${newPFV} does not exist in release_versions`);
        }
    }

    await updateDoc(doc(db, 'issues', issueId), {
        plannedForVersion: newPFV,
        updatedAt: serverTimestamp(),
    });

    await logGlobalAdminAction('UPDATE_PFV', issueId, { prevPFV, newPFV });
};

// --- RIV (Released In Version) on Issues ---

export const updateIssueRIV = async (issueId: string, oldValue: string | null, newValue: string | null) => {
    await requireAdmin();

    // Validate newValue exists in release_versions (or null to clear)
    if (newValue) {
        const col = collection(db, 'release_versions');
        const q = query(col, where('version', '==', newValue));
        const snap = await safeGetDocs(q, { fallback: [], context: 'RIV Validation', description: `Validate version ${newValue}` });
        if (snap.empty) {
            throw new Error(`Version ${newValue} does not exist in release_versions`);
        }
    }

    await updateDoc(doc(db, 'issues', issueId), {
        releasedInVersion: newValue,
        updatedAt: serverTimestamp(),
    });

    const editedBy = auth.currentUser?.uid || 'unknown';
    await logGlobalAdminAction('RIV_EDIT', issueId, { oldValue, newValue, editedBy });
};

// --- Billing Authority Boundary (AC-5) ---
// BILLING_FIELDS: The canonical set of billing-related fields on user documents.
// Manual updates: ONLY via setBillingStatus() above.
// Automated updates: ONLY via Stripe webhook (functions/index.ts → stripeWebhook).
// No other code path should write to these fields.
export const BILLING_FIELDS = ['billingStatus', 'billingSource', 'billingRef', 'verifiedPaidAt'] as const;

// --- Audit Timeline & Billing History Services ---

export interface AuditTimelineEntry {
    id: string;
    action: string;
    adminUid: string;
    adminEmail?: string;
    targetUserId?: string;
    createdAt: Timestamp;
    metadata?: any;
}

export const getAuditTimeline = async (filters?: {
    actionFilter?: string;
    adminFilter?: string;
    limitCount?: number;
    startAfter?: QueryDocumentSnapshot;
}): Promise<{ entries: AuditTimelineEntry[]; lastDoc: QueryDocumentSnapshot | null }> => {
    await requireAdmin();
    const auditCol = collection(db, 'admin_audit');
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

    if (filters?.actionFilter) {
        constraints.unshift(where('action', '==', filters.actionFilter));
    }
    if (filters?.adminFilter) {
        constraints.unshift(where('adminUid', '==', filters.adminFilter));
    }
    constraints.push(limit(filters?.limitCount || 50));

    const q = query(auditCol, ...constraints);
    const snap = await safeGetDocs(q, { fallback: [], context: 'Audit', description: 'Get Audit Timeline' });
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditTimelineEntry));
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return { entries, lastDoc };
};

const BILLING_AUDIT_ACTIONS = ['SET_BILLING_STATUS', 'GRANT_TESTER_PRO', 'REVOKE_TESTER_PRO', 'FIX_TESTER'];

export const getBillingAuditLogs = async (filters?: {
    actionFilter?: string;
    limitCount?: number;
}): Promise<AuditTimelineEntry[]> => {
    await requireAdmin();
    const auditCol = collection(db, 'admin_audit');
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

    if (filters?.actionFilter) {
        constraints.unshift(where('action', '==', filters.actionFilter));
    } else {
        constraints.unshift(where('action', 'in', BILLING_AUDIT_ACTIONS));
    }
    constraints.push(limit(filters?.limitCount || 100));

    const q = query(auditCol, ...constraints);
    const snap = await safeGetDocs(q, { fallback: [], context: 'Audit', description: 'Get Billing Audit Logs' });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditTimelineEntry));
};

// --- Billing Aggregation by Month ---
export const getBillingAuditByMonth = async (): Promise<AuditTimelineEntry[]> => {
    await requireAdmin();
    const auditCol = collection(db, 'admin_audit');
    const q = query(auditCol, where('action', 'in', BILLING_AUDIT_ACTIONS), orderBy('createdAt', 'desc'), limit(500));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Audit', description: 'Billing Audit by Month' });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditTimelineEntry));
};

// --- Usage Scoring Config ---
export const getUsageScoringConfig = async (): Promise<Record<string, any> | null> => {
    const configDoc = await safeGetDoc(doc(db, 'config', 'usage_scoring'), { fallback: null, context: 'Config', description: 'Get Usage Scoring Config' });
    return configDoc.exists() ? configDoc.data() as Record<string, any> : null;
};

export const updateUsageScoringConfig = async (config: Record<string, any>) => {
    await requireAdmin();
    await setDoc(doc(db, 'config', 'usage_scoring'), {
        ...config,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || 'unknown',
    }, { merge: true });
    await logGlobalAdminAction('UPDATE_USAGE_SCORING_CONFIG', 'system', { config });
};

// --- Unresolved Billing Events ---
export const getUnresolvedBillingEvents = async (): Promise<any[]> => {
    await requireAdmin();
    const col = collection(db, 'billing_events_unresolved');
    const q = query(col, orderBy('createdAt', 'desc'), limit(200));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Billing', description: 'Get Unresolved Events' });
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const resolveUnresolvedEvent = async (eventId: string, resolution: { notes: string; resolvedBy: string }) => {
    await requireAdmin();
    const eventRef = doc(db, 'billing_events_unresolved', eventId);
    await updateDoc(eventRef, {
        resolved: true,
        resolvedAt: serverTimestamp(),
        resolvedBy: resolution.resolvedBy,
        resolutionNotes: resolution.notes,
    });
    await logGlobalAdminAction('RESOLVE_BILLING_EVENT', eventId, resolution);
};

// --- Issues by PFV ---
export const getIssuesByPFV = async (version: string): Promise<ReportedIssue[]> => {
    const issuesCol = collection(db, 'issues');
    const q = query(issuesCol, where('plannedForVersion', '==', version));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Issues', description: `Issues for PFV ${version}` });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReportedIssue));
};

// --- Tester Conversion Data ---
export const getTesterConversionData = async (): Promise<AuditTimelineEntry[]> => {
    await requireAdmin();
    const auditCol = collection(db, 'admin_audit');
    const q = query(auditCol, where('action', 'in', ['GRANT_TESTER_PRO', 'SET_BILLING_STATUS']), orderBy('createdAt', 'desc'), limit(500));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Audit', description: 'Tester Conversion Data' });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditTimelineEntry));
};

