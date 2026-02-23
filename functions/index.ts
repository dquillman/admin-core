import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

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

    const revokeUpdates: Record<string, any> = {
        testerOverride: false,
        testerExpiresAt: null,
        isPro: false,
    };

    // Preserve billing status if Stripe-verified paid
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
        const userData = userDoc.data();
        const expireUpdates: Record<string, any> = {
            testerOverride: false,
            testerExpiresAt: null,
            isPro: false,
        };

        // Preserve billing status if Stripe-verified paid
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

// =============================================
// USAGE SCORE — Event-Driven Computation
// =============================================

/** Scoring constants */
const USAGE_SCORE = {
    MAX_POINTS: 500,
    WINDOW_DAYS: 30,
    SESSION_POINTS: 1,      // 1pt per active day
    ACTION_POINTS: 5,       // 5pts per core action
    ACTION_DAILY_CAP: 3,    // max 3 counted per day
    COMPLETION_POINTS: 15,  // 15pts per completion
};

type UsageBand = 'Dormant' | 'Curious' | 'Engaged' | 'Active' | 'Power User';

interface DailyBucket {
    sessions: number;
    actions: number;
    completions: number;
}

function getBandFromScore(score: number): UsageBand {
    if (score >= 85) return 'Power User';
    if (score >= 60) return 'Active';
    if (score >= 30) return 'Engaged';
    if (score >= 10) return 'Curious';
    return 'Dormant';
}

function toDateKey(ts?: admin.firestore.Timestamp): string {
    const d = ts ? ts.toDate() : new Date();
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function cutoffKey(): string {
    const d = new Date();
    d.setDate(d.getDate() - USAGE_SCORE.WINDOW_DAYS);
    return d.toISOString().slice(0, 10);
}

function computeUsageScore(buckets: Record<string, DailyBucket>): {
    score: number;
    band: UsageBand;
    breakdown: { activeDays: number; coreActions: number; completions: number };
} {
    const cutoff = cutoffKey();
    let totalPoints = 0;
    let activeDays = 0;
    let totalActions = 0;
    let totalCompletions = 0;

    for (const [day, bucket] of Object.entries(buckets)) {
        if (day < cutoff) continue;

        // Sessions: 1pt per active day
        if (bucket.sessions > 0) {
            activeDays++;
            totalPoints += USAGE_SCORE.SESSION_POINTS;
        }

        // Core actions: 5pts each, capped at 3/day
        const cappedActions = Math.min(bucket.actions, USAGE_SCORE.ACTION_DAILY_CAP);
        totalActions += cappedActions;
        totalPoints += cappedActions * USAGE_SCORE.ACTION_POINTS;

        // Completions: 15pts each, no cap
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

/**
 * Trigger: On Usage Event Created
 * Client apps write to `usage_events/{eventId}` with:
 *   { userId: string, eventType: 'session' | 'coreAction' | 'completion', timestamp: Timestamp }
 *
 * This trigger:
 * 1. Validates the event
 * 2. Updates the user's daily bucket
 * 3. Recomputes the rolling 30-day usage score
 * 4. Writes usageScore, usageBand, usageBreakdown to the user doc
 */
export const onUsageEvent = functions.firestore
    .document('usage_events/{eventId}')
    .onCreate(async (snap, context) => {
        const event = snap.data();
        const { userId, eventType, timestamp } = event;

        // Validate
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

        const userData = userDoc.data()!;
        const buckets: Record<string, DailyBucket> = userData.usageDailyBuckets || {};

        // Determine the day key from the event timestamp
        const day = toDateKey(timestamp as admin.firestore.Timestamp);

        // Initialize bucket if missing
        if (!buckets[day]) {
            buckets[day] = { sessions: 0, actions: 0, completions: 0 };
        }

        // Increment the appropriate counter
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

        // Prune buckets outside the 30-day window
        const cutoff = cutoffKey();
        for (const key of Object.keys(buckets)) {
            if (key < cutoff) delete buckets[key];
        }

        // Recompute score
        const { score, band, breakdown } = computeUsageScore(buckets);

        // Write back to user doc (Admin SDK bypasses Firestore rules)
        await userRef.update({
            usageDailyBuckets: buckets,
            usageScore: score,
            usageBand: band,
            usageBreakdown: breakdown,
        });

        return null;
    });

/**
 * Scheduled Job: Prune Usage Windows & Recompute Scores
 * Runs daily to clean up expired buckets and recompute scores
 * for users who had no new events (so their score naturally decays).
 */
export const pruneUsageWindows = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
        const cutoff = cutoffKey();
        const BATCH_LIMIT = 450;

        // Query users with active usage scores (score > 0 means data to potentially prune)
        const snapshot = await db.collection('users')
            .where('usageScore', '>', 0)
            .get();

        if (snapshot.empty) return null;

        let batch = db.batch();
        let batchCount = 0;
        let totalUpdated = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const buckets: Record<string, DailyBucket> = data.usageDailyBuckets || {};

            // Prune old buckets
            let pruned = false;
            for (const key of Object.keys(buckets)) {
                if (key < cutoff) {
                    delete buckets[key];
                    pruned = true;
                }
            }

            if (!pruned) continue;

            // Recompute with pruned data
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

// =============================================
// STRIPE WEBHOOK — Billing Status
// =============================================

/**
 * Stripe Webhook Handler (HTTP function)
 * Receives Stripe events and updates user billing status.
 *
 * Config (set via CLI, not committed):
 *   firebase functions:config:set stripe.secret_key="sk_..." stripe.webhook_secret="whsec_..."
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
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

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' as any });

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err: any) {
        console.error('Stripe signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Resolve user by customer email
    const resolveUser = async (customerEmail: string | null | undefined) => {
        if (!customerEmail) return null;
        const snap = await db.collection('users')
            .where('email', '==', customerEmail)
            .limit(1)
            .get();
        return snap.empty ? null : snap.docs[0];
    };

    // Log unresolved events for admin review
    const logUnresolved = async (eventType: string, email: string | null | undefined, eventId: string) => {
        await db.collection('billing_events_unresolved').add({
            stripeEventId: eventId,
            eventType,
            customerEmail: email || 'unknown',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    };

    // Audit log helper for Stripe actions
    const logStripeAudit = async (action: string, targetUid: string, metadata: Record<string, any>) => {
        await db.collection('admin_audit').add({
            action,
            adminUid: 'STRIPE_WEBHOOK',
            targetUserId: targetUid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata,
        });
    };

    try {
        let customerEmail: string | null | undefined = null;
        let billingUpdates: Record<string, any> = {};
        let auditAction = '';

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const sub = event.data.object as Stripe.Subscription;
                const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
                customerEmail = customer.email;

                if (sub.status === 'active') {
                    billingUpdates = {
                        billingStatus: 'paid',
                        billingSource: 'stripe',
                        billingRef: sub.id,
                        verifiedPaidAt: admin.firestore.FieldValue.serverTimestamp(),
                    };
                    auditAction = 'STRIPE_SUBSCRIPTION_ACTIVE';
                } else if (sub.status === 'trialing') {
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
                const sub = event.data.object as Stripe.Subscription;
                const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
                customerEmail = customer.email;

                billingUpdates = {
                    billingStatus: 'unknown',
                    billingSource: null,
                    // Keep billingRef for history
                };
                auditAction = 'STRIPE_SUBSCRIPTION_DELETED';
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
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
                // Unhandled event type — acknowledge receipt
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
    } catch (err: any) {
        console.error('Stripe webhook processing error:', err);
        res.status(500).send('Internal error');
    }
});

