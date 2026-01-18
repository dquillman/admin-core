import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Grant "Pro (Tester)" access to a user.
 * - Sets testerOverride=true
 * - Sets testerExpiresAt = now + 14 days
 * - Sets plan="pro" (optional, depending on app logic, but requested in checking)
 */
export const grantTesterPro = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

    // Verify Admin
    const callerUid = context.auth.uid;
    const callerDoc = await db.collection("users").doc(callerUid).get();
    if (callerDoc.data()?.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be an admin");
    }

    const { targetUid } = data;
    if (!targetUid) throw new functions.https.HttpsError("invalid-argument", "Target UID required");

    // 14 Days from now
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const targetRef = db.collection("users").doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists) throw new functions.https.HttpsError("not-found", "User not found");

    const prevState = targetDoc.data();

    // Update User
    await targetRef.update({
        testerOverride: true,
        testerExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        testerGrantedBy: callerUid,
        testerGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        // We set 'isPro' to true so the app sees them as Pro immediately without complex logic changes
        isPro: true
    });

    // Log Audit
    await db.collection("admin_audit").add({
        action: "GRANT_TESTER_PRO",
        adminUid: callerUid,
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

    return { success: true };
});

export const revokeTesterPro = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

    const callerUid = context.auth.uid;
    const callerDoc = await db.collection("users").doc(callerUid).get();
    if (callerDoc.data()?.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be an admin");
    }

    const { targetUid } = data;
    if (!targetUid) throw new functions.https.HttpsError("invalid-argument", "Target UID required");

    const targetRef = db.collection("users").doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists) throw new functions.https.HttpsError("not-found", "User not found");

    const prevState = targetDoc.data();

    await targetRef.update({
        testerOverride: false,
        testerExpiresAt: null,
        isPro: false // Revert to standard
    });

    await db.collection("admin_audit").add({
        action: "REVOKE_TESTER_PRO",
        adminUid: callerUid,
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

    return { success: true };
});

export const extendTesterPro = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

    const callerUid = context.auth.uid;
    const callerDoc = await db.collection("users").doc(callerUid).get();
    if (callerDoc.data()?.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be an admin");
    }

    const { targetUid } = data;
    const targetRef = db.collection("users").doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists) throw new functions.https.HttpsError("not-found", "User not found");

    const currentExpire = targetDoc.data()?.testerExpiresAt;
    if (!currentExpire) throw new functions.https.HttpsError("failed-precondition", "User is not currently a tester");

    // Add 7 days to current expiration
    const currentDate = currentExpire.toDate();
    const newExpire = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    await targetRef.update({
        testerExpiresAt: admin.firestore.Timestamp.fromDate(newExpire)
    });

    await db.collection("admin_audit").add({
        action: "EXTEND_TESTER_PRO",
        adminUid: callerUid,
        targetUserId: targetUid,
        metadata: {
            extendedByDays: 7,
            oldExpire: currentDate.toISOString(),
            newExpire: newExpire.toISOString()
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, newExpire };
});

/**
 * Scheduled Job: Auto-expire testers
 * Runs every 6 hours
 */
export const autoExpireTesterPro = functions.pubsub.schedule('every 6 hours').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    // Find expired testers
    const expiredQuery = db.collection("users")
        .where("testerOverride", "==", true)
        .where("testerExpiresAt", "<", now);

    const snapshot = await expiredQuery.get();

    if (snapshot.empty) {
        console.log("No expired testers found.");
        return null;
    }

    const batch = db.batch();
    const auditBatch = db.batch(); // Separate batch or sequential writes for audit

    let count = 0;
    for (const userDoc of snapshot.docs) {
        const userRef = db.collection("users").doc(userDoc.id);

        batch.update(userRef, {
            testerOverride: false,
            testerExpiresAt: null,
            isPro: false
        });

        const auditRef = db.collection("admin_audit").doc();
        auditBatch.set(auditRef, {
            action: "AUTO_EXPIRE_TESTER_PRO",
            adminUid: "SYSTEM",
            targetUserId: userDoc.id,
            targetUserEmail: userDoc.data().email || "unknown",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        count++;
    }

    await batch.commit();
    await auditBatch.commit();

    console.log(`Expired ${count} tester accounts.`);
    return null;
});
