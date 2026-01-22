import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    doc,
    getDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    serverTimestamp,
    startAfter,
    setDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { safeGetDocs, safeGetDoc, safeGetCount } from '../utils/firestoreSafe';
import type { User, TesterStats } from '../types';

// GLOBAL KILL SWITCH - STRICT NO AGGREGATION
export const CLIENT_STATS_ENABLED = false;

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
export const getDashboardStats = async () => {
    if (!CLIENT_STATS_ENABLED) {
        return { totalUsers: 0, proUsers: 0, trialUsers: 0, recentSignups: 0 };
    }
    // Note: Dashboard stats are currently global over all users
    try {
        const usersCol = collection(db, 'users');

        // Total Users
        const totalSnap = await safeGetCount(usersCol, { fallback: 0, context: 'Dashboard', description: 'Total Users' });

        // Pro Users
        const proSnap = await safeGetCount(query(usersCol, where('isPro', '==', true)), { fallback: 0, context: 'Dashboard', description: 'Pro Users' });

        // Trial Users
        const trialSnap = await safeGetCount(query(usersCol, where('trial.active', '==', true)), { fallback: 0, context: 'Dashboard', description: 'Trial Users' });

        // Recent Signups (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSnap = await safeGetCount(query(usersCol, where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))), { fallback: 0, context: 'Dashboard', description: 'Recent Signups' });

        return {
            totalUsers: totalSnap.data().count,
            proUsers: proSnap.data().count,
            trialUsers: trialSnap.data().count,
            recentSignups: recentSnap.data().count
        };
    } catch (error) {
        console.error("Error getting dashboard stats:", error);
        return { totalUsers: 0, proUsers: 0, trialUsers: 0, recentSignups: 0 };
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
    if (!CLIENT_STATS_ENABLED) {
        return { activeTesters: 0, expiringSoon: 0, totalGranted30d: 0 };
    }
    try {
        const usersCol = collection(db, 'users');
        // const now = Timestamp.now();
        // const threeDaysFromNow = new Date();
        // threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        // unused vars commented out to fix build

        // Active Testers
        const activeSnap = await safeGetCount(query(usersCol, where('testerOverride', '==', true)), { fallback: 0, context: 'Stats', description: 'Active Testers' });

        // Expiring Soon (Need specific query or client-side filter if index missing)
        // Since 'testerExpiresAt' query might need index with 'testerOverride', we'll do client side for MVP or try-catch

        // For exact "Expiring in 3 days", we'd query testerExpiresAt > now AND testerExpiresAt < 3days
        // Let's assume we can fetch active testers and count in memory for "Expiring Soon" to save indexes
        // but for "Total Granted 30d" we need audit logs.

        // For "Total Granted 30d", we try the aggregation.
        // If the index is missing (failed-precondition), we gracefully return 0
        // instead of crashing or spamming the console with red text (handled by safeGetCount but we want explicit behavior).
        let totalGranted30d = 0;
        try {
            const auditCol = collection(db, 'admin_audit');
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const grantedSnap = await safeGetCount(query(
                auditCol,
                where('action', '==', 'GRANT_TESTER_PRO'),
                where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
            ), { fallback: 0, context: 'Stats', description: 'Granted Testers' });

            totalGranted30d = grantedSnap.data().count;
        } catch (indexError) {
            // Index likely missing. Suppress.
            totalGranted30d = 0;
        }

        return {
            activeTesters: activeSnap.data().count,
            expiringSoon: 0,
            totalGranted30d: totalGranted30d
        };
    } catch (e) {
        console.warn("Failed to fetch tester stats", e);
        return { activeTesters: 0, expiringSoon: 0, totalGranted30d: 0 };
    }
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

export const getUserSessions = async (filters: SessionFilters = {}) => {
    if (!CLIENT_STATS_ENABLED) return [];
    const { appId, email, activeOnly, dateRange, lastDoc, limitCount = 50 } = filters;

    let q = query(collection(db, 'user_sessions'));

    // Filter by app
    if (appId) {
        q = query(q, where('app', '==', appId));
    }

    // Filter by email (exact match for now)
    if (email) {
        q = query(q, where('email', '==', email));
    }

    // Active Only
    if (activeOnly) {
        q = query(q, where('logoutAt', '==', null));
    }

    // Date Range
    if (dateRange) {
        const now = new Date();
        let startDate: Date;
        if (dateRange === '24h') startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        else if (dateRange === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        q = query(q, where('loginAt', '>=', Timestamp.fromDate(startDate)));
    }

    // Order and Limit
    q = query(q, orderBy('loginAt', 'desc'), limit(limitCount));

    // Pagination
    if (lastDoc) {
        q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await safeGetDocs(q, { fallback: [], context: 'Sessions', description: 'Get User Sessions' });
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _raw: doc // For pagination
    }));
};

export const getActiveSessionsCount = async (appId?: string) => {
    if (!CLIENT_STATS_ENABLED) return 0;
    let q = query(collection(db, 'user_sessions'), where('logoutAt', '==', null));

    if (appId) {
        q = query(q, where('app', '==', appId));
    }

    const snapshot = await safeGetCount(q, { fallback: 0, context: 'Sessions', description: 'Active Count' });
    return snapshot.data().count;
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
    if (!CLIENT_STATS_ENABLED) return 0;
    // Note: This reads all quizAttempts documents.
    // In a high-volume production environment, this should be replaced by a scheduled Cloud Function
    // that maintains a distributed counter or writes to a stats document.
    try {
        const attemptsCol = collection(db, 'quizAttempts');
        // Fetching all documents (be mindful of read costs)
        const snap = await getDocs(attemptsCol);

        let sampleCount = 0;
        snap.forEach(doc => {
            const data = doc.data();
            if (Array.isArray(data.details)) {
                // Count items where actionLatency exists (is not undefined/null)
                // Note: user said "actionLatency is present"
                sampleCount += data.details.filter((d: any) => d.actionLatency !== undefined && d.actionLatency !== null).length;
            }
        });

        return sampleCount;
    } catch (error) {
        console.error("Error counting latency samples:", error);
        return 0; // Graceful fallback
    }
};
