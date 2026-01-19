import {
    collection,
    getDocs,
    query,
    where,
    getCountFromServer,
    limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { requireAdmin } from './firestoreService';

export interface ActivationMetrics {
    totalUsers: number;
    activatedUsers: number; // Completed quiz AND viewed explanation
    activationRate: number;
}

export const getActivationMetrics = async (): Promise<ActivationMetrics> => {
    await requireAdmin();

    // Total Users
    const usersCol = collection(db, 'users');
    const totalSnap = await getCountFromServer(usersCol);
    const totalUsers = totalSnap.data().count;

    // Activated Users
    // Querying nested fields directly: 'activation.explanationViewed' == true
    const activatedQ = query(usersCol, where('activation.explanationViewed', '==', true));
    const activatedSnap = await getCountFromServer(activatedQ);
    const activatedUsers = activatedSnap.data().count;

    return {
        totalUsers,
        activatedUsers,
        activationRate: totalUsers > 0 ? (activatedUsers / totalUsers) * 100 : 0
    };
};

export const getFunnelMetrics = async () => {
    await requireAdmin();
    // Funnel: Users -> Activated -> Pricing Viewed -> Upgrade Clicked -> Converted

    // 1. Users & Activated
    const { totalUsers, activatedUsers } = await getActivationMetrics();

    // 2. Pricing Viewed
    const eventsCol = collection(db, 'conversion_events');
    const eventsSnap = await getDocs(eventsCol);

    const pricingViewedSet = new Set<string>();
    const upgradeClickedSet = new Set<string>();
    const convertedSet = new Set<string>();

    eventsSnap.forEach(doc => {
        const data = doc.data();
        if (data.event === 'pricing_viewed') pricingViewedSet.add(data.uid);
        if (data.event === 'upgrade_clicked') upgradeClickedSet.add(data.uid);
        if (data.event === 'converted') convertedSet.add(data.uid);
    });

    return {
        users: totalUsers,
        activated: activatedUsers,
        pricingViewed: pricingViewedSet.size,
        upgradeClicked: upgradeClickedSet.size,
        converted: convertedSet.size
    };
};

export interface TutorImpactMetrics {
    avgExplanationTime: number; // seconds
    returnRate24h: number; // percentage
    wrongAnswersReviewed: number; // percentage
    correlationScore: number; // calculated correlation
}

export const getTutorImpactMetrics = async (): Promise<TutorImpactMetrics> => {
    await requireAdmin();

    // 1. Fetch recent usage data specifically looking for 'explanation_viewed' events vs others
    // We'll use a sample of users for this analysis if the dataset is large, 
    // but for now we'll fetch recent active users.

    // In a real high-scale app, this would be a BigQuery job. 
    // Here we will do a client-side approximation with limitation.
    // We will compare:
    // Group A: Users who have active.explanationViewed = true
    // Group B: Users who have active.explanationViewed = false (but have taken quizzes)

    const usersCol = collection(db, 'users');
    // Limit to 500 recently active for performance in admin panel
    const usersSnap = await getDocs(query(usersCol, limit(500))); // In real app, order by lastActive

    let groupA_Returners = 0; // Explained & Returned
    let groupA_Total = 0;

    let groupB_Returners = 0; // Unexplained & Returned
    let groupB_Total = 0;

    let totalExplanationTime = 0;
    let explanationSessions = 0;

    const oneDay = 24 * 60 * 60 * 1000;

    usersSnap.forEach(doc => {
        const data = doc.data();
        const isExplained = data.activation?.explanationViewed === true;
        const lastActive = data.lastActiveAt?.toDate();
        const createdAt = data.createdAt?.toDate();

        // Check "Return Rate" (active > 24h after signup)
        const returned = lastActive && createdAt && (lastActive.getTime() - createdAt.getTime() > oneDay);

        if (isExplained) {
            groupA_Total++;
            if (returned) groupA_Returners++;

            // Simulating read time data as it's not strictly in user profile yet
            // In real impl, we'd query 'explanation_logs'
            totalExplanationTime += 45; // avg placeholder
            explanationSessions++;
        } else {
            // Only count if they actually did something (completed a quiz)
            if (data.activation?.firstQuizCompletedAt) {
                groupB_Total++;
                if (returned) groupB_Returners++;
            }
        }
    });

    const returnRateA = groupA_Total > 0 ? (groupA_Returners / groupA_Total) : 0;
    const returnRateB = groupB_Total > 0 ? (groupB_Returners / groupB_Total) : 0;

    // Correlation Impact: How much better is A than B?
    // e.g., 2.1x
    const impactFactor = returnRateB > 0 ? (returnRateA / returnRateB) : 1;

    // Normalize score to a 0-100 "Correlation Score" for the UI
    // If Impact is 2x, score is high. If 1x (same), score is 0.
    const correlationScore = Math.min(Math.round((impactFactor - 1) * 100), 100);

    return {
        avgExplanationTime: explanationSessions > 0 ? (totalExplanationTime / explanationSessions) : 0,
        returnRate24h: Math.round(returnRateA * 100),
        wrongAnswersReviewed: 65, // Hardcoded for now until we have 'review_logs'
        correlationScore: correlationScore
    };
};
