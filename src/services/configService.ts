// Config, sources, sessions, marketing, audit, and billing services
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
    serverTimestamp,
    Timestamp,
    setDoc,
    type QueryDocumentSnapshot,
    type QueryConstraint,
    db,
    auth,
    safeGetDocs,
    safeGetDoc,
    safeGetCount,
    requireAdmin,
    logAdminAction,
    logGlobalAdminAction,
    type AdminStats,
} from './adminUtils';

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
            grantedTesters: grantedSnap.data()?.count ?? 0,
            revokedTesters: 0, // Cannot easily count revoked without expensive audit query
            disabledUsers: disabledSnap.data()?.count ?? 0,
            lastUpdated: Timestamp.now()
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

// --- Audit Log Service (App Scoped) ---
export const getRecentAuditLogs = async (appId: string, limitCount: number = 10) => {
    if (appId === 'all') {
        // Aggregate audit logs from the global admin_audit collection
        const auditCol = collection(db, 'admin_audit');
        const q = query(auditCol, orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await safeGetDocs(q, { fallback: [], context: 'Audit', description: 'Recent Global Logs' });
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    const auditCol = collection(db, 'apps', appId, 'audit');
    const q = query(auditCol, orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Audit', description: 'Recent Logs' });
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- App Config Service (App Scoped) ---
export const getAppConfig = async (appId: string, docId: string) => {
    const configDoc = await safeGetDoc(doc(db, 'apps', appId, 'config', docId), { fallback: null, context: 'Config', description: 'Get App Config' });
    return configDoc.exists() ? configDoc.data() : null;
};

export const updateAppConfig = async (appId: string, docId: string, data: Record<string, unknown>) => {
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

export const addSource = async (appId: string, source: Record<string, unknown>) => {
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

export const updateSource = async (appId: string, sourceId: string, data: Record<string, unknown>) => {
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
    const snap = await safeGetDoc(docRef, { fallback: null, context: 'Marketing', description: 'Get Marketing Assets' });
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

/** @deprecated Aggregation disabled — returns 0. */
export const getActionLatencyCount = async () => {
    return 0;
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
    metadata?: Record<string, unknown>;
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
export const getUsageScoringConfig = async (): Promise<Record<string, unknown> | null> => {
    const configDoc = await safeGetDoc(doc(db, 'config', 'usage_scoring'), { fallback: null, context: 'Config', description: 'Get Usage Scoring Config' });
    return configDoc.exists() ? configDoc.data() as Record<string, unknown> : null;
};

export const updateUsageScoringConfig = async (config: Record<string, unknown>) => {
    await requireAdmin();
    await setDoc(doc(db, 'config', 'usage_scoring'), {
        ...config,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || 'unknown',
    }, { merge: true });
    await logGlobalAdminAction('UPDATE_USAGE_SCORING_CONFIG', 'system', { config });
};

// --- Unresolved Billing Events ---
export interface UnresolvedBillingEvent {
    id: string;
    [key: string]: unknown;
}

export const getUnresolvedBillingEvents = async (): Promise<UnresolvedBillingEvent[]> => {
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

// --- Tester Conversion Data ---
export const getTesterConversionData = async (): Promise<AuditTimelineEntry[]> => {
    await requireAdmin();
    const auditCol = collection(db, 'admin_audit');
    const q = query(auditCol, where('action', 'in', ['GRANT_TESTER_PRO', 'SET_BILLING_STATUS']), orderBy('createdAt', 'desc'), limit(500));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Audit', description: 'Tester Conversion Data' });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditTimelineEntry));
};
