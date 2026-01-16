import {
    collection,
    query,
    where,
    getDocs,
    getCountFromServer,
    orderBy,
    limit,
    Timestamp,
    doc,
    getDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    serverTimestamp,
    startAfter
} from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Security Layer: Enforce admin-only access at the service layer
 */
export const requireAdmin = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Access Denied: Not Authenticated");

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data()?.role !== 'admin') {
        throw new Error("Access Denied: Admin Privileges Required");
    }
};

// --- Stats Service ---
export const getDashboardStats = async () => {
    // Note: Dashboard stats are currently global over all users
    try {
        const usersCol = collection(db, 'users');

        // Total Users
        const totalSnap = await getCountFromServer(usersCol);

        // Pro Users
        const proSnap = await getCountFromServer(query(usersCol, where('isPro', '==', true)));

        // Trial Users
        const trialSnap = await getCountFromServer(query(usersCol, where('trial.active', '==', true)));

        // Recent Signups (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSnap = await getCountFromServer(query(usersCol, where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))));

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
export const searchUsers = async (searchTerm: string) => {
    const usersCol = collection(db, 'users');
    let q;

    if (!searchTerm) {
        q = query(usersCol, limit(20), orderBy('createdAt', 'desc'));
    } else {
        q = query(usersCol, where('email', '>=', searchTerm), where('email', '<=', searchTerm + '\uf8ff'), limit(20));
    }

    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
};

// --- Audit Log Service (App Scoped) ---
export const getRecentAuditLogs = async (appId: string, limitCount: number = 10) => {
    const auditCol = collection(db, 'apps', appId, 'audit');
    const q = query(auditCol, orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
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

// --- App Config Service (App Scoped) ---
export const getAppConfig = async (appId: string, docId: string) => {
    const configDoc = await getDoc(doc(db, 'apps', appId, 'config', docId));
    return configDoc.exists() ? configDoc.data() : null;
};

export const updateAppConfig = async (appId: string, docId: string, data: any) => {
    await requireAdmin();
    await updateDoc(doc(db, 'apps', appId, 'config', docId), data);
    await logAdminAction(appId, `update_config_${docId}`, 'system', { newData: data });
};

// --- Legacy Admin Config Service (for migration) ---
export const getLegacyAdminConfig = async (docId: string) => {
    const configDoc = await getDoc(doc(db, 'admin_config', docId));
    return configDoc.exists() ? configDoc.data() : null;
};

// --- Sources Service (App Scoped) ---
export const getSources = async (appId: string) => {
    const sourcesCol = collection(db, 'apps', appId, 'sources');
    const snap = await getDocs(sourcesCol);
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

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _raw: doc // For pagination
    }));
};

export const getActiveSessionsCount = async (appId?: string) => {
    let q = query(collection(db, 'user_sessions'), where('logoutAt', '==', null));
    
    if (appId) {
        q = query(q, where('app', '==', appId));
    }

    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};
