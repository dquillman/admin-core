import {
    collection,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    doc,
    getDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    serverTimestamp,
    setDoc,
    arrayUnion
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { safeGetDocs, safeGetDoc, safeGetCount } from '../utils/firestoreSafe';
import type { User, TesterStats, ReportedIssue, IssueNote } from '../types';

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
    if (!userDoc.exists() || userDoc.data()?.role !== 'admin') {
        throw new Error("Access Denied: Admin Privileges Required");
    }
};

// --- Stats Service ---
// --- Stats Service ---
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
        // Silent failure as per requirements, but attempt live read first
        return {
            grantedTesters: 0,
            revokedTesters: 0,
            disabledUsers: 0
        };
    }
};

// --- Users Service ---
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
    return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
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
    return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
};

export const getTesterSummaryStats = async (): Promise<TesterStats> => {
    // Reuse the same stats doc
    return getDashboardStats() as any;
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
export const grantTesterAccess = async (targetUid: string) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Grant Access Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const updates = {
        testerOverride: true,
        testerExpiresAt: Timestamp.fromDate(expiresAt),
        testerGrantedAt: serverTimestamp(),
        testerGrantedBy: adminUser.email || adminUser.uid,
        trialActive: false,
        trialEndsAt: null
        // Legacy 'trial' field is not cleared but ignored by precedence logic
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('GRANT_TESTER_PRO', targetUid, {
        prev: pickAccessFields(userSnap.data()),
        new: updates
    });
};

export const revokeTesterAccess = async (targetUid: string) => {
    await requireAdmin();
    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Revoke Access Check' });

    if (!userSnap.exists()) throw new Error("User not found");

    const updates = {
        testerOverride: false,
        testerExpiresAt: null,
        testerGrantedAt: null,
        testerGrantedBy: null
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('REVOKE_TESTER_PRO', targetUid, {
        prev: pickAccessFields(userSnap.data()),
        new: updates
    });
};

export const fixTesterAccess = async (targetUid: string) => {
    // Same as grant, but distinct intent in audit logs
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);
    const userSnap = await safeGetDoc(userRef, { fallback: null, context: 'Admin', description: 'Fix Access Check' });
    if (!userSnap.exists()) throw new Error("User not found");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const updates = {
        testerOverride: true,
        testerExpiresAt: Timestamp.fromDate(expiresAt),
        testerGrantedAt: serverTimestamp(),
        testerGrantedBy: adminUser.email || adminUser.uid,
        trialActive: false,
        trialEndsAt: null
    };

    await updateDoc(userRef, updates);
    await logGlobalAdminAction('FIX_TESTER', targetUid, {
        prev: pickAccessFields(userSnap.data()),
        new: updates
    });
};

// Helper for audit logs
const pickAccessFields = (data: any) => ({
    testerOverride: data?.testerOverride ?? null,
    testerExpiresAt: data?.testerExpiresAt ?? null,
    plan: data?.plan ?? null,
    trialActive: data?.trialActive ?? null
});

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

export interface SessionFilters {
    appId?: string;
    email?: string;
    activeOnly?: boolean;
    dateRange?: '24h' | '7d' | '30d';
    lastDoc?: any;
    limitCount?: number;
}

export const getUserSessions = async (_filters: SessionFilters = {}) => {
    return [] as any[]; // List query disabled to prevent index requirements
};

export const getActiveSessionsCount = async (_appId?: string) => {
    return 0; // Aggregation disabled
};

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

// --- Operational Stats Service ---
export const getActionLatencyCount = async () => {
    return 0; // Aggregation disabled
};

// --- Issues Management Service (Read-Only + Notes) ---
export const getReportedIssues = async (limitCount: number = 100): Promise<ReportedIssue[]> => {
    try {
        const issuesCol = collection(db, 'issues');
        // Client uses 'timestamp', Admin uses 'createdAt'. Order by timestamp for client issues.
        const q = query(issuesCol, orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await safeGetDocs(q, { fallback: [], context: 'Issues', description: 'Get Issues' });
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportedIssue));
    } catch (error) {
        console.error("Failed to fetch reported issues:", error);
        return [];
    }
};

export const addIssueNote = async (issueId: string, text: string) => {
    await requireAdmin();
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    const note: IssueNote = {
        text,
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

export const updateIssueDetails = async (issueId: string, updates: { severity?: string; type?: string; classification?: string }) => {
    await requireAdmin();
    await updateDoc(doc(db, 'issues', issueId), updates);
};

export const deleteIssue = async (issueId: string) => {
    await requireAdmin();
    // Soft delete to allow recovery if needed, and to maintain history
    await updateDoc(doc(db, 'issues', issueId), { deleted: true });
};
