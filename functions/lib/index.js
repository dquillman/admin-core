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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.pruneUsageWindows = exports.onUsageEvent = exports.onIssueCreated = exports.adminUpdateUserEmail = exports.autoExpireTesterPro = exports.disableUser = exports.revokeTesterPro = exports.grantTesterPro = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
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
        const statsRef = db.doc("stats/admin_core");
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
        isPro: true,
        billingStatus: 'tester',
        billingSource: 'manual',
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
    const revokeUpdates = {
        testerOverride: false,
        testerExpiresAt: null,
        isPro: false,
    };
    if (prevState?.billingSource !== 'stripe') {
        revokeUpdates.billingStatus = 'unknown';
        revokeUpdates.billingSource = null;
    }
    await targetRef.update(revokeUpdates);
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
        const userData = userDoc.data();
        const expireUpdates = {
            testerOverride: false,
            testerExpiresAt: null,
            isPro: false,
        };
        if (userData?.billingSource !== 'stripe') {
            expireUpdates.billingStatus = 'unknown';
            expireUpdates.billingSource = null;
        }
        batch.update(userDoc.ref, expireUpdates);
        const auditRef = db.collection("admin_audit").doc();
        auditBatch.set(auditRef, {
            action: "AUTO_EXPIRE_TESTER_PRO",
            adminUid: "SYSTEM",
            targetUserId: userDoc.id,
            targetUserEmail: userData?.email || "unknown",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    });
    await batch.commit();
    await auditBatch.commit();
    return null;
});
exports.adminUpdateUserEmail = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { targetUid, newEmail } = data;
    if (!targetUid)
        throw new functions.https.HttpsError("invalid-argument", "Target UID required");
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        throw new functions.https.HttpsError("invalid-argument", "Valid email required");
    }
    const targetRef = db.collection("users").doc(targetUid);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists)
        throw new functions.https.HttpsError("not-found", "User not found");
    const prevEmail = targetDoc.data()?.email || "unknown";
    await admin.auth().updateUser(targetUid, { email: newEmail });
    await targetRef.update({
        email: newEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
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
exports.onIssueCreated = functions.firestore.document('issues/{issueId}').onCreate(async (snap, context) => {
    const newData = snap.data();
    const VALID_PREFIXES = ['AC-', 'EC-'];
    if (newData.displayId && typeof newData.displayId === 'string') {
        const hasValidPrefix = VALID_PREFIXES.some(prefix => newData.displayId.startsWith(prefix));
        if (hasValidPrefix) {
            console.log(`Issue ${context.params.issueId} already has valid displayId: ${newData.displayId} - skipping`);
            return null;
        }
    }
    try {
        const recentSnap = await db.collection('issues')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        let maxId = 0;
        recentSnap.docs.forEach(doc => {
            const data = doc.data();
            const idStr = data.displayId || data.issueId;
            if (idStr && typeof idStr === 'string') {
                const match = idStr.match(/(?:EC|AC)-(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxId) {
                        maxId = num;
                    }
                }
            }
        });
        const nextId = maxId + 1;
        const newDisplayId = `EC-${nextId}`;
        await snap.ref.set({
            displayId: newDisplayId,
            issueId: newDisplayId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`Assigned ${newDisplayId} to issue ${context.params.issueId} (was missing)`);
        return null;
    }
    catch (error) {
        console.error("Failed to auto-assign issue ID", error);
        return null;
    }
});
const USAGE_SCORE = {
    MAX_POINTS: 500,
    WINDOW_DAYS: 30,
    SESSION_POINTS: 1,
    ACTION_POINTS: 5,
    ACTION_DAILY_CAP: 3,
    COMPLETION_POINTS: 15,
};
function getBandFromScore(score) {
    if (score >= 85)
        return 'Power User';
    if (score >= 60)
        return 'Active';
    if (score >= 30)
        return 'Engaged';
    if (score >= 10)
        return 'Curious';
    return 'Dormant';
}
function toDateKey(ts) {
    const d = ts ? ts.toDate() : new Date();
    return d.toISOString().slice(0, 10);
}
function cutoffKey() {
    const d = new Date();
    d.setDate(d.getDate() - USAGE_SCORE.WINDOW_DAYS);
    return d.toISOString().slice(0, 10);
}
function computeUsageScore(buckets) {
    const cutoff = cutoffKey();
    let totalPoints = 0;
    let activeDays = 0;
    let totalActions = 0;
    let totalCompletions = 0;
    for (const [day, bucket] of Object.entries(buckets)) {
        if (day < cutoff)
            continue;
        if (bucket.sessions > 0) {
            activeDays++;
            totalPoints += USAGE_SCORE.SESSION_POINTS;
        }
        const cappedActions = Math.min(bucket.actions, USAGE_SCORE.ACTION_DAILY_CAP);
        totalActions += cappedActions;
        totalPoints += cappedActions * USAGE_SCORE.ACTION_POINTS;
        totalCompletions += bucket.completions;
        totalPoints += bucket.completions * USAGE_SCORE.COMPLETION_POINTS;
    }
    const score = Math.min(100, Math.round(totalPoints * 100 / USAGE_SCORE.MAX_POINTS));
    return {
        score,
        band: getBandFromScore(score),
        breakdown: { activeDays, coreActions: totalActions, completions: totalCompletions },
    };
}
exports.onUsageEvent = functions.firestore
    .document('usage_events/{eventId}')
    .onCreate(async (snap, context) => {
    const event = snap.data();
    const { userId, eventType, timestamp } = event;
    if (!userId || typeof userId !== 'string') {
        console.warn(`Invalid usage event ${context.params.eventId}: missing userId`);
        return null;
    }
    const validTypes = ['session', 'coreAction', 'completion'];
    if (!validTypes.includes(eventType)) {
        console.warn(`Invalid usage event ${context.params.eventId}: invalid eventType "${eventType}"`);
        return null;
    }
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        console.warn(`Usage event for unknown user ${userId}`);
        return null;
    }
    const userData = userDoc.data();
    const buckets = userData.usageDailyBuckets || {};
    const day = toDateKey(timestamp);
    if (!buckets[day]) {
        buckets[day] = { sessions: 0, actions: 0, completions: 0 };
    }
    switch (eventType) {
        case 'session':
            buckets[day].sessions = (buckets[day].sessions || 0) + 1;
            break;
        case 'coreAction':
            buckets[day].actions = (buckets[day].actions || 0) + 1;
            break;
        case 'completion':
            buckets[day].completions = (buckets[day].completions || 0) + 1;
            break;
    }
    const cutoff = cutoffKey();
    for (const key of Object.keys(buckets)) {
        if (key < cutoff)
            delete buckets[key];
    }
    const { score, band, breakdown } = computeUsageScore(buckets);
    await userRef.update({
        usageDailyBuckets: buckets,
        usageScore: score,
        usageBand: band,
        usageBreakdown: breakdown,
    });
    return null;
});
exports.pruneUsageWindows = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
    const cutoff = cutoffKey();
    const BATCH_LIMIT = 450;
    const snapshot = await db.collection('users')
        .where('usageScore', '>', 0)
        .get();
    if (snapshot.empty)
        return null;
    let batch = db.batch();
    let batchCount = 0;
    let totalUpdated = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const buckets = data.usageDailyBuckets || {};
        let pruned = false;
        for (const key of Object.keys(buckets)) {
            if (key < cutoff) {
                delete buckets[key];
                pruned = true;
            }
        }
        if (!pruned)
            continue;
        const { score, band, breakdown } = computeUsageScore(buckets);
        batch.update(doc.ref, {
            usageDailyBuckets: buckets,
            usageScore: score,
            usageBand: band,
            usageBreakdown: breakdown,
        });
        batchCount++;
        totalUpdated++;
        if (batchCount >= BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    }
    if (batchCount > 0) {
        await batch.commit();
    }
    console.log(`Pruned usage windows for ${totalUpdated} users`);
    return null;
});
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const config = functions.config();
    const stripeSecretKey = config.stripe?.secret_key;
    const webhookSecret = config.stripe?.webhook_secret;
    if (!stripeSecretKey || !webhookSecret) {
        console.error('Stripe config missing. Set stripe.secret_key and stripe.webhook_secret via firebase functions:config:set');
        res.status(500).send('Stripe not configured');
        return;
    }
    const stripe = new stripe_1.default(stripeSecretKey, { apiVersion: '2024-04-10' });
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error('Stripe signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    const resolveUser = async (customerEmail) => {
        if (!customerEmail)
            return null;
        const snap = await db.collection('users')
            .where('email', '==', customerEmail)
            .limit(1)
            .get();
        return snap.empty ? null : snap.docs[0];
    };
    const logUnresolved = async (eventType, email, eventId) => {
        await db.collection('billing_events_unresolved').add({
            stripeEventId: eventId,
            eventType,
            customerEmail: email || 'unknown',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    };
    const logStripeAudit = async (action, targetUid, metadata) => {
        await db.collection('admin_audit').add({
            action,
            adminUid: 'STRIPE_WEBHOOK',
            targetUserId: targetUid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata,
        });
    };
    try {
        let customerEmail = null;
        let billingUpdates = {};
        let auditAction = '';
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const sub = event.data.object;
                const customer = await stripe.customers.retrieve(sub.customer);
                customerEmail = customer.email;
                if (sub.status === 'active') {
                    billingUpdates = {
                        billingStatus: 'paid',
                        billingSource: 'stripe',
                        billingRef: sub.id,
                        verifiedPaidAt: admin.firestore.FieldValue.serverTimestamp(),
                    };
                    auditAction = 'STRIPE_SUBSCRIPTION_ACTIVE';
                }
                else if (sub.status === 'trialing') {
                    billingUpdates = {
                        billingStatus: 'trial',
                        billingSource: 'stripe',
                        billingRef: sub.id,
                    };
                    auditAction = 'STRIPE_SUBSCRIPTION_TRIALING';
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const customer = await stripe.customers.retrieve(sub.customer);
                customerEmail = customer.email;
                billingUpdates = {
                    billingStatus: 'unknown',
                    billingSource: null,
                };
                auditAction = 'STRIPE_SUBSCRIPTION_DELETED';
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const customer = await stripe.customers.retrieve(invoice.customer);
                customerEmail = customer.email;
                billingUpdates = {
                    billingStatus: 'paid',
                    billingSource: 'stripe',
                    verifiedPaidAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                auditAction = 'STRIPE_PAYMENT_SUCCEEDED';
                break;
            }
            default:
                res.status(200).json({ received: true, handled: false });
                return;
        }
        if (Object.keys(billingUpdates).length === 0) {
            res.status(200).json({ received: true, handled: false });
            return;
        }
        const userDoc = await resolveUser(customerEmail);
        if (!userDoc) {
            console.warn(`Stripe event ${event.type}: could not resolve user for email ${customerEmail}`);
            await logUnresolved(event.type, customerEmail, event.id);
            res.status(200).json({ received: true, resolved: false });
            return;
        }
        await userDoc.ref.update(billingUpdates);
        await logStripeAudit(auditAction, userDoc.id, {
            stripeEventId: event.id,
            customerEmail,
            billingUpdates,
        });
        console.log(`Stripe ${event.type}: updated user ${userDoc.id} (${customerEmail}) → ${billingUpdates.billingStatus}`);
        res.status(200).json({ received: true, resolved: true, userId: userDoc.id });
    }
    catch (err) {
        console.error('Stripe webhook processing error:', err);
        res.status(500).send('Internal error');
    }
});
//# sourceMappingURL=index.js.map