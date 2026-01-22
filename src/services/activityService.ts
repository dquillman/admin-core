import { db } from '../firebase';
import {
    collection,
    query,
    orderBy,
    limit,
    addDoc,
    serverTimestamp,
    Timestamp,
    where
} from 'firebase/firestore';
import { safeGetDocs, safeGetCount } from '../utils/firestoreSafe';
import type { Decision, App, FounderBriefing, SimulationScenario } from '../types';

export const getRecentDecisions = async (limitCount = 20): Promise<Decision[]> => {
    try {
        const q = query(
            collection(db, 'decisions'),
            orderBy('created_at', 'desc'),
            limit(limitCount)
        );
        const querySnapshot = await safeGetDocs(q, { fallback: [], context: 'Activity', description: 'Recent Decisions' });
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Decision));
    } catch (error) {
        console.error("Error fetching decisions:", error);
        return [];
    }
};

/**
 * LIVE SIGNAL: Weekly Active Tutor Users
 * Aggregates: Count of users with lastActiveAt > 7 days ago AND explanationViewed == true.
 * Guardrails: Read-only. Counts only (no PII).
 */
export const getLiveTutorEngagement = async (): Promise<number> => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Query: Active in last 7 days AND has used the tutor
        // Note: This requires a composite index on [activation.explanationViewed ASC, lastActiveAt ASC/DESC]
        // If index is missing, this might fail or require client-side filtering. 
        // For robustness in this environment without index management rights, we'll try the specific query 
        // but fallback to client-side count if needed (assuming small user base for now).

        try {
            const q = query(
                collection(db, 'users'),
                where('activation.explanationViewed', '==', true),
                where('lastActiveAt', '>=', Timestamp.fromDate(sevenDaysAgo))
            );
            const snapshot = await safeGetCount(q, { fallback: 0, context: 'Activity', description: 'Live Tutor Signal' });
            return snapshot.data().count;
        } catch (indexError) {
            console.warn("Index missing for optimized signal, falling back to client-side aggregation (safe for small scale).");
            // Fallback: Fetch recently active (limit 1000) and count manually
            const fallbackQ = query(
                collection(db, 'users'),
                where('activation.explanationViewed', '==', true),
                limit(1000)
            );
            const snapshot = await safeGetDocs(fallbackQ, { fallback: [], context: 'Activity', description: 'Live Tutor Fallback' });
            const threshold = Timestamp.fromDate(sevenDaysAgo);
            let count = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.lastActiveAt && data.lastActiveAt >= threshold) {
                    count++;
                }
            });
            return count;
        }
    } catch (error) {
        console.error("Error fetching live tutor signal:", error);
        return 0;
    }
};

export const getRecentSimulations = async (limitCount = 5): Promise<Decision[]> => {
    try {
        const q = query(
            collection(db, 'simulations'),
            orderBy('created_at', 'desc'),
            limit(limitCount)
        );
        const querySnapshot = await safeGetDocs(q, { fallback: [], context: 'Activity', description: 'Recent Simulations' });
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Decision));
    } catch (error) {
        console.error("Error fetching simulations:", error);
        return [];
    }
};

export const getAppHealth = async (): Promise<App[]> => {
    try {
        // We want apps where status != active OR health.state != ok
        // Firestore doesn't support OR queries easily across different fields without multiple queries or client-side filtering.
        // For simplicity and likely small dataset of 'apps', we'll fetch active apps and filter client-side, 
        // or just fetch all apps. Let's fetch all apps for now as the 'apps' collection is likely small (dozens, not thousands).

        const q = query(collection(db, 'apps'));
        const querySnapshot = await safeGetDocs(q, { fallback: [], context: 'Activity', description: 'Get App Health' });

        const allApps = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as App));

        // Filter for "interesting" apps: status != active OR health != ok OR silent warnings
        return allApps.filter(app => {
            if (app.status !== 'active') return true;
            if (app.health.state !== 'ok') return true;

            // Check for silence warnings (derived)
            if (app.last_event_at) {
                const now = new Date();
                const lastEvent = app.last_event_at.toDate();
                const diffDays = (now.getTime() - lastEvent.getTime()) / (1000 * 3600 * 24);
                if (diffDays > 3) return true;
            }

            return false;
        });
    } catch (error) {
        console.error("Error fetching apps:", error);
        return [];
    }
};

export const getLatestBriefing = async (): Promise<FounderBriefing | null> => {
    try {
        const q = query(
            collection(db, 'founder_briefings'),
            orderBy('created_at', 'desc'),
            limit(1)
        );
        const querySnapshot = await safeGetDocs(q, { fallback: [], context: 'Activity', description: 'Latest Briefing' });
        if (!querySnapshot.empty) {
            return {
                id: querySnapshot.docs[0].id,
                ...querySnapshot.docs[0].data()
            } as FounderBriefing;
        }
        return null;
    } catch (error) {
        console.error("Error fetching latest briefing:", error);
        return null;
    }
};

export const simulateDecision = async (appId: string, scenario: SimulationScenario): Promise<void> => {
    const simulationData = {
        app_id: appId,
        type: 'simulation',
        confidence: 0.85 + (Math.random() * 0.1), // Random highish confidence
        reasoning: {
            summary: `Simulated decision for scenario: ${scenario}`,
            details: `This is a test generated by the 2112 Simulation Panel. Scenario '${scenario}' triggered a synthetic review pattern.`
        },
        // INTENT BOUNDARY: Suggesting pattern detection, not commanding action.
        recommended_action: scenario === 'silent_app' ? 'Signal suggests integration check' :
            scenario === 'high_friction' ? 'Funnel pattern indicates drop-off' :
                'Conversion signal warrants analysis',
        status: 'simulated',
        created_at: serverTimestamp()
    };

    // GUARDRAIL: Strict separation of simulation data.
    // Never write to 'decisions' (production log).
    await addDoc(collection(db, 'simulations'), simulationData);
};
