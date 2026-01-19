import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    where
} from 'firebase/firestore';
import { db } from '../firebase';
import { requireAdmin } from './firestoreService';
import { getActivationMetrics, getFunnelMetrics } from './analyticsService';

export interface WeeklyReview {
    id?: string;
    weekId: string; // e.g., "2024-W03"
    weekStart: Timestamp;
    newUsers: number;
    activationRate: number;
    pricingViews: number;
    upgradeClicks: number;
    founderDecision: string;
    createdAt: Timestamp;
}

// Helper to get current week ID (ISO Week)
export const getCurrentWeekId = (): string => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDays = (now.getTime() - startOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNum}`;
};

export const getLatestWeeklyReview = async (): Promise<WeeklyReview | null> => {
    await requireAdmin();
    const q = query(
        collection(db, 'weekly_reviews'),
        orderBy('createdAt', 'desc'),
        limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as WeeklyReview;
    }
    return null;
};

export const hasReviewForCurrentWeek = async (): Promise<boolean> => {
    await requireAdmin();
    const currentWeekId = getCurrentWeekId();
    const q = query(
        collection(db, 'weekly_reviews'),
        where('weekId', '==', currentWeekId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
};

export const submitWeeklyReview = async (decision: string) => {
    await requireAdmin();

    // Snapshot current metrics for the record
    const [activation, funnel] = await Promise.all([
        getActivationMetrics(),
        getFunnelMetrics()
    ]);

    const review: Omit<WeeklyReview, 'id'> = {
        weekId: getCurrentWeekId(),
        weekStart: Timestamp.now(), // Approximate
        newUsers: activation.totalUsers, // Snapshot of total at this time
        activationRate: activation.activationRate,
        pricingViews: funnel.pricingViewed,
        upgradeClicks: funnel.upgradeClicked,
        founderDecision: decision,
        createdAt: Timestamp.now()
    };

    await addDoc(collection(db, 'weekly_reviews'), review);
    return review;
};
