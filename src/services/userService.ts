// User management service — tester, trial, archive, billing, profile
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp,
    type User,
    type BillingStatus,
    db,
    auth,
    safeGetDocs,
    safeGetDoc,
    TESTER_EXPIRY_MS,
    requireAdmin,
    logGlobalAdminAction,
    pickAccessFields,
    assertUidInvariant,
    getFunctions,
    httpsCallable,
    runTransaction,
} from './adminUtils';

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

/** Fetch all users without search filtering or low limit. Use for dashboard/analytics pages. */
export const getAllUsers = async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, limit(1000));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Users', description: 'Get All Users' });
    return snap.docs.map(doc => {
        const user = { ...doc.data(), uid: doc.id } as User;
        assertUidInvariant(user, doc.id);
        return user;
    });
};

export const getTesterUsers = async (activeOnly: boolean = false): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('testerOverride', '==', true));

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

import type { TesterStats } from './adminUtils';
import { getDashboardStats } from './configService';

export const getTesterSummaryStats = async (): Promise<TesterStats> => {
    return getDashboardStats();
};

/**
 * Tester Access Management (Direct Writes)
 */
const _applyTesterAccess = async (targetUid: string, auditAction: string) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);

    const updates = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");

        const now = new Date();
        const expiresAt = new Date(now.getTime() + TESTER_EXPIRY_MS);

        const userData = userSnap.data();
        const isStripePaid = userData?.billingSource === 'stripe';

        const txUpdates = {
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

        transaction.update(userRef, txUpdates);
        return { prev: pickAccessFields(userData), updates: txUpdates };
    });

    await logGlobalAdminAction(auditAction, targetUid, {
        prev: updates.prev,
        new: updates.updates
    });
};

export const grantTesterAccess = async (targetUid: string) => {
    await _applyTesterAccess(targetUid, 'GRANT_TESTER_PRO');
};

export const revokeTesterAccess = async (targetUid: string) => {
    await requireAdmin();
    const userRef = doc(db, 'users', targetUid);

    const result = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");

        const userData = userSnap.data();
        const txUpdates: Record<string, unknown> = {
            testerOverride: false,
            testerExpiresAt: null,
            testerGrantedAt: null,
            testerGrantedBy: null,
        };

        // Preserve billing status if Stripe-verified paid
        if (userData?.billingSource !== 'stripe') {
            txUpdates.billingStatus = 'unknown';
            txUpdates.billingSource = null;
        }

        transaction.update(userRef, txUpdates);
        return { prev: pickAccessFields(userData), updates: txUpdates };
    });

    await logGlobalAdminAction('REVOKE_TESTER_PRO', targetUid, {
        prev: result.prev,
        new: result.updates
    });
};

export const fixTesterAccess = async (targetUid: string) => {
    await _applyTesterAccess(targetUid, 'FIX_TESTER');
};

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
 * Grant Fresh Trial (Admin Override — Direct Write)
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
 * Archive Management (Soft Delete — Direct Writes)
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
 * Set Billing Status (Direct Write — Pattern A)
 * Admin can explicitly set comped, tester, or unknown.
 * 'paid' is excluded — only Stripe can set that.
 */
export const setBillingStatus = async (targetUid: string, status: Exclude<BillingStatus, 'paid'>) => {
    await requireAdmin();
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("Not authenticated");

    const userRef = doc(db, 'users', targetUid);

    const result = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");

        const currentData = userSnap.data();
        if (currentData?.billingStatus === 'paid' && currentData?.billingSource === 'stripe') {
            console.warn(`[BILLING] Blocked attempt to override Stripe-verified paid status for user ${targetUid}`);
            throw new Error("Cannot override Stripe-verified paid status via admin UI");
        }

        const txUpdates: Record<string, unknown> = {
            billingStatus: status,
            billingSource: status === 'unknown' ? null : 'manual',
        };

        transaction.update(userRef, txUpdates);
        return { prev: pickAccessFields(currentData), updates: txUpdates };
    });

    await logGlobalAdminAction('SET_BILLING_STATUS', targetUid, {
        prev: result.prev,
        new: result.updates,
    });
};

export const setUserTag = async (targetUid: string, tag: string | null) => {
    await requireAdmin();
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { userTag: tag });
    await logGlobalAdminAction('SET_USER_TAG', targetUid, { tag });
};

/**
 * Update User Profile (Direct Write — Pattern A)
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
 * Admin Update Email (Cloud Function — Pattern B)
 * Updates email in both Firebase Auth and Firestore via Cloud Function.
 */
export const adminUpdateEmail = async (targetUid: string, newEmail: string) => {
    const functions = getFunctions();
    const callable = httpsCallable(functions, 'adminUpdateUserEmail');
    await callable({ targetUid, newEmail });
};

// --- User Lookup (lightweight, for dropdowns) ---
export const fetchAllUsersLookup = async (): Promise<{ uid: string; email: string }[]> => {
    const usersCol = collection(db, 'users');
    const snap = await safeGetDocs(usersCol, { fallback: [], context: 'Users', description: 'Fetch All Users Lookup' });
    return snap.docs.map(d => ({ uid: d.id, email: d.data().email || '' }));
};
