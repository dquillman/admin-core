import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * Helper: Check Admin Role
 */
async function assertAdmin(context: functions.https.CallableContext) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const callerDoc = await db.collection("users").doc(context.auth.uid).get();
    if (callerDoc.data()?.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be an admin");
    }
}

/**
 * Helper: Atomically update admin stats (best effort)
 */
async function updateAdminStats(updates: { [key: string]: number }) {
    try {
        const statsRef = db.doc("stats/admin_core");
        const updateData: any = {
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        for (const [key, value] of Object.entries(updates)) {
            updateData[key] = admin.firestore.FieldValue.increment(value);
        }

        await statsRef.set(updateData, { merge: true });
    } catch (e) {
        console.warn("Stats update failed (non-critical):", e);
    }
}

/**
 * Grant "Pro (Tester)" access to a user.
 */
export const grantTesterPro = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { targetUid } = data;
    if (!targetUid) throw new functions.https.HttpsError("invalid-argument", "Target UID required");

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const targetRef = db.collection("users").doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists) throw new functions.https.HttpsError("not-found", "User not found");

    const prevState = targetDoc.data();

    await targetRef.update({
        testerOverride: true,
        testerExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        testerGrantedBy: context.auth?.uid,
        testerGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        isPro: true
    });

    await db.collection("admin_audit").add({
        action: "GRANT_TESTER_PRO",
        adminUid: context.auth?.uid,
        targetUserId: targetUid,
        targetUserEmail: prevState?.email || "unknown",
        prevState: {
            testerOverride: prevState?.testerOverride || false,
            isPro: prevState?.isPro || false
        },
        newState: {
            testerOverride: true,
            isPro: true,
            expiresAt: expiresAt.toISOString()
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Best-effort stats update
    await updateAdminStats({ grantedTesters: 1 });

    return { success: true };
});

export const revokeTesterPro = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { targetUid } = data;
    if (!targetUid) throw new functions.https.HttpsError("invalid-argument", "Target UID required");

    const targetRef = db.collection("users").doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists) throw new functions.https.HttpsError("not-found", "User not found");

    const prevState = targetDoc.data();

    await targetRef.update({
        testerOverride: false,
        testerExpiresAt: null,
        isPro: false
    });

    await db.collection("admin_audit").add({
        action: "REVOKE_TESTER_PRO",
        adminUid: context.auth?.uid,
        targetUserId: targetUid,
        targetUserEmail: prevState?.email || "unknown",
        prevState: {
            testerOverride: prevState?.testerOverride,
            isPro: prevState?.isPro
        },
        newState: {
            testerOverride: false,
            isPro: false
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Best-effort stats update
    await updateAdminStats({ revokedTesters: 1 });

    return { success: true };
});

export const disableUser = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { targetUid, disabled } = data;
    if (!targetUid) throw new functions.https.HttpsError("invalid-argument", "Target UID required");

    // 1. Update Auth
    await admin.auth().updateUser(targetUid, { disabled });

    // 2. Update Firestore
    await db.collection("users").doc(targetUid).update({
        disabled: !!disabled,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Log Audit
    await db.collection("admin_audit").add({
        action: disabled ? "DISABLE_USER" : "ENABLE_USER",
        adminUid: context.auth?.uid,
        targetUserId: targetUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Best-effort stats update
    await updateAdminStats({ disabledUsers: disabled ? 1 : 0 });

    return { success: true };
});

/**
 * Scheduled Job: Auto-expire testers
 */
export const autoExpireTesterPro = functions.pubsub.schedule("every 6 hours").onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db.collection("users")
        .where("testerOverride", "==", true)
        .where("testerExpiresAt", "<", now)
        .get();

    if (snapshot.empty) return null;

    const batch = db.batch();
    const auditBatch = db.batch();

    snapshot.docs.forEach(userDoc => {
        batch.update(userDoc.ref, {
            testerOverride: false,
            testerExpiresAt: null,
            isPro: false
        });

        const auditRef = db.collection("admin_audit").doc();
        auditBatch.set(auditRef, {
            action: "AUTO_EXPIRE_TESTER_PRO",
            adminUid: "SYSTEM",
            targetUserId: userDoc.id,
            targetUserEmail: userDoc.data()?.email || "unknown",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    await auditBatch.commit();
    return null;
});

/**
 * Admin Update User Email
 * Updates email in both Firebase Auth and Firestore, with audit logging.
 */
export const adminUpdateUserEmail = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { targetUid, newEmail } = data;
    if (!targetUid) throw new functions.https.HttpsError("invalid-argument", "Target UID required");
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        throw new functions.https.HttpsError("invalid-argument", "Valid email required");
    }

    const targetRef = db.collection("users").doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists) throw new functions.https.HttpsError("not-found", "User not found");

    const prevEmail = targetDoc.data()?.email || "unknown";

    // 1. Update Firebase Auth
    await admin.auth().updateUser(targetUid, { email: newEmail });

    // 2. Update Firestore
    await targetRef.update({
        email: newEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Audit log
    await db.collection("admin_audit").add({
        action: "ADMIN_UPDATE_EMAIL",
        adminUid: context.auth?.uid,
        targetUserId: targetUid,
        prevEmail,
        newEmail,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
});

/**
 * Trigger: On Issue Creation
 * Auto-assigns a readable displayId ONLY if truly missing.
 * 
 * CRITICAL: This trigger must respect existing displayId values with ANY valid prefix.
 * Valid prefixes: AC- (Admin Core), EC- (Exam Coach)
 * 
 * If displayId is already set, this trigger does NOTHING - identity is immutable.
 */
export const onIssueCreated = functions.firestore.document('issues/{issueId}').onCreate(async (snap, context) => {
    const newData = snap.data();

    // VALID PREFIXES - must match APP_REGISTRY in constants.ts
    const VALID_PREFIXES = ['AC-', 'EC-'];

    // 1. If displayId already exists with any valid prefix, do nothing (identity is immutable)
    if (newData.displayId && typeof newData.displayId === 'string') {
        const hasValidPrefix = VALID_PREFIXES.some(prefix => newData.displayId.startsWith(prefix));
        if (hasValidPrefix) {
            console.log(`Issue ${context.params.issueId} already has valid displayId: ${newData.displayId} - skipping`);
            return null;
        }
    }

    try {
        // 2. Find the highest existing ID for EC- prefix (legacy/fallback only)
        // NOTE: This trigger should ideally never run for properly created issues.
        // The client-side createIssue() always assigns displayId.
        // This is a safety net for issues created without displayId via other means.
        const recentSnap = await db.collection('issues')
            .orderBy('timestamp', 'desc')
            .limit(100) // Increased to catch more IDs
            .get();

        let maxId = 0;

        recentSnap.docs.forEach(doc => {
            const data = doc.data();
            const idStr = data.displayId || data.issueId;
            if (idStr && typeof idStr === 'string') {
                // Match ANY valid prefix
                const match = idStr.match(/(?:EC|AC)-(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxId) {
                        maxId = num;
                    }
                }
            }
        });

        // 3. Increment and assign EC- as default (for backward compatibility with client issues)
        const nextId = maxId + 1;
        const newDisplayId = `EC-${nextId}`;

        // 4. Update the document - ONLY set identity fields
        await snap.ref.set({
            displayId: newDisplayId,
            issueId: newDisplayId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`Assigned ${newDisplayId} to issue ${context.params.issueId} (was missing)`);
        return null;

    } catch (error) {
        console.error("Failed to auto-assign issue ID", error);
        return null;
    }
});

