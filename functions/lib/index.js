"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoExpireTesterPro = exports.disableUser = exports.revokeTesterPro = exports.grantTesterPro = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
async function assertAdmin(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const callerDoc = await db.collection("users").doc(context.auth.uid).get();
    if (callerDoc.data()?.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Must be an admin");
    }
}
async function updateAdminStats(updates) {
    try {
        const statsRef = db.doc("stats/admin_core/summary");
        const updateData = {
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };
        for (const [key, value] of Object.entries(updates)) {
            updateData[key] = admin.firestore.FieldValue.increment(value);
        }
        await statsRef.set(updateData, { merge: true });
    }
    catch (e) {
        console.warn("Stats update failed (non-critical):", e);
    }
}
exports.grantTesterPro = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { targetUid } = data;
    if (!targetUid)
        throw new functions.https.HttpsError("invalid-argument", "Target UID required");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const targetRef = db.collection("users").doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists)
        throw new functions.https.HttpsError("not-found", "User not found");
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
    await updateAdminStats({ grantedTesters: 1 });
    return { success: true };
});
exports.revokeTesterPro = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { targetUid } = data;
    if (!targetUid)
        throw new functions.https.HttpsError("invalid-argument", "Target UID required");
    const targetRef = db.collection("users").doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists)
        throw new functions.https.HttpsError("not-found", "User not found");
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
    await updateAdminStats({ revokedTesters: 1 });
    return { success: true };
});
exports.disableUser = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { targetUid, disabled } = data;
    if (!targetUid)
        throw new functions.https.HttpsError("invalid-argument", "Target UID required");
    await admin.auth().updateUser(targetUid, { disabled });
    await db.collection("users").doc(targetUid).update({
        disabled: !!disabled,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("admin_audit").add({
        action: disabled ? "DISABLE_USER" : "ENABLE_USER",
        adminUid: context.auth?.uid,
        targetUserId: targetUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await updateAdminStats({ disabledUsers: disabled ? 1 : 0 });
    return { success: true };
});
exports.autoExpireTesterPro = functions.pubsub.schedule("every 6 hours").onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db.collection("users")
        .where("testerOverride", "==", true)
        .where("testerExpiresAt", "<", now)
        .get();
    if (snapshot.empty)
        return null;
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
//# sourceMappingURL=index.js.map