import {
    collection,
    query,
    orderBy,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    where,
    limit,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { safeGetDocs, safeGetDoc } from '../utils/firestoreSafe';
import type {
    Game,
    Player,
    GameSession,
    LeaderboardEntry,
    Subscription,
    Payment,
    Notification,
    AnalyticsSnapshot,
    AIRecommendation,
    Workflow,
    WorkflowRun,
} from '../types/gameForge';

// Collection references scoped under apps/game-forge/
const gamesCol = collection(db, 'apps', 'game-forge', 'games');
const playersCol = collection(db, 'apps', 'game-forge', 'players');
const sessionsCol = collection(db, 'apps', 'game-forge', 'sessions');
const leaderboardsCol = collection(db, 'apps', 'game-forge', 'leaderboards');
const subscriptionsCol = collection(db, 'apps', 'game-forge', 'subscriptions');
const paymentsCol = collection(db, 'apps', 'game-forge', 'payments');
const notificationsCol = collection(db, 'apps', 'game-forge', 'notifications');
const analyticsCol = collection(db, 'apps', 'game-forge', 'analytics');
const aiRecommendationsCol = collection(db, 'apps', 'game-forge', 'ai_recommendations');
const workflowsCol = collection(db, 'apps', 'game-forge', 'workflows');
const workflowRunsCol = collection(db, 'apps', 'game-forge', 'workflow_runs');

// --- Games CRUD ---

export const getGames = async (): Promise<Game[]> => {
    const q = query(gamesCol, orderBy('createdAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Games',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Game));
};

export const getGame = async (id: string): Promise<Game | null> => {
    const ref = doc(db, 'apps', 'game-forge', 'games', id);
    const snap = await safeGetDoc(ref, {
        fallback: null,
        context: 'GameForge',
        description: 'Fetch Game',
    });
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Game;
};

export const createGame = async (data: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = serverTimestamp();
    const docRef = await addDoc(gamesCol, {
        ...data,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
};

export const updateGame = async (id: string, data: Partial<Game>): Promise<void> => {
    const ref = doc(db, 'apps', 'game-forge', 'games', id);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
    });
};

export const deleteGame = async (id: string): Promise<void> => {
    const ref = doc(db, 'apps', 'game-forge', 'games', id);
    await deleteDoc(ref);
};

// --- Players CRUD ---

export const getPlayers = async (): Promise<Player[]> => {
    const q = query(playersCol, orderBy('lastActive', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Players',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
};

export const getPlayer = async (id: string): Promise<Player | null> => {
    const ref = doc(db, 'apps', 'game-forge', 'players', id);
    const snap = await safeGetDoc(ref, {
        fallback: null,
        context: 'GameForge',
        description: 'Fetch Player',
    });
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Player;
};

export const createPlayer = async (data: Omit<Player, 'id' | 'createdAt'>): Promise<string> => {
    const docRef = await addDoc(playersCol, {
        ...data,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const updatePlayer = async (id: string, data: Partial<Player>): Promise<void> => {
    const ref = doc(db, 'apps', 'game-forge', 'players', id);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
    });
};

// --- Sessions ---

export const getSessions = async (playerId?: string): Promise<GameSession[]> => {
    const q = playerId
        ? query(sessionsCol, where('playerId', '==', playerId), orderBy('startedAt', 'desc'))
        : query(sessionsCol, orderBy('startedAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Sessions',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GameSession));
};

export const createSession = async (data: Omit<GameSession, 'id'>): Promise<string> => {
    const docRef = await addDoc(sessionsCol, {
        ...data,
        startedAt: serverTimestamp(),
    });
    return docRef.id;
};

// --- Leaderboards ---

export const getLeaderboard = async (gameId: string, period: string): Promise<LeaderboardEntry[]> => {
    const q = query(
        leaderboardsCol,
        where('gameId', '==', gameId),
        where('period', '==', period),
        orderBy('score', 'desc'),
        limit(100)
    );
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Leaderboard',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardEntry));
};

// --- Subscriptions ---

export const getSubscriptions = async (): Promise<Subscription[]> => {
    const q = query(subscriptionsCol, orderBy('createdAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Subscriptions',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Subscription));
};

export const getSubscription = async (playerId: string): Promise<Subscription | null> => {
    const q = query(subscriptionsCol, where('playerId', '==', playerId), limit(1));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Subscription by Player',
    });
    if (snap.docs.length === 0) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Subscription;
};

export const updateSubscription = async (id: string, data: Partial<Subscription>): Promise<void> => {
    const ref = doc(db, 'apps', 'game-forge', 'subscriptions', id);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
    });
};

// --- Payments ---

export const getPayments = async (playerId?: string): Promise<Payment[]> => {
    const q = playerId
        ? query(paymentsCol, where('playerId', '==', playerId), orderBy('createdAt', 'desc'))
        : query(paymentsCol, orderBy('createdAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Payments',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
};

// --- Notifications ---

export const getNotifications = async (playerId?: string): Promise<Notification[]> => {
    const q = playerId
        ? query(notificationsCol, where('playerId', '==', playerId), orderBy('createdAt', 'desc'))
        : query(notificationsCol, orderBy('createdAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Notifications',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
};

export const createNotification = async (data: Omit<Notification, 'id'>): Promise<string> => {
    const docRef = await addDoc(notificationsCol, {
        ...data,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const markNotificationRead = async (id: string): Promise<void> => {
    const ref = doc(db, 'apps', 'game-forge', 'notifications', id);
    await updateDoc(ref, { read: true });
};

export const sendBulkNotifications = async (
    playerIds: string[],
    notification: Omit<Notification, 'id' | 'playerId' | 'createdAt'>
): Promise<void> => {
    const batch = writeBatch(db);
    const now = serverTimestamp();
    for (const playerId of playerIds) {
        const ref = doc(notificationsCol);
        batch.set(ref, {
            ...notification,
            playerId,
            createdAt: now,
        });
    }
    await batch.commit();
};

// --- Analytics ---

export const getAnalytics = async (period?: string): Promise<AnalyticsSnapshot[]> => {
    const q = period
        ? query(analyticsCol, where('period', '==', period), orderBy('createdAt', 'desc'))
        : query(analyticsCol, orderBy('createdAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Analytics',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AnalyticsSnapshot));
};

export const getGameAnalytics = async (gameId: string): Promise<AnalyticsSnapshot | null> => {
    const ref = doc(db, 'apps', 'game-forge', 'analytics', gameId);
    const snap = await safeGetDoc(ref, {
        fallback: null,
        context: 'GameForge',
        description: 'Fetch Game Analytics',
    });
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as AnalyticsSnapshot;
};

// --- AI Recommendations ---

export const getRecommendations = async (playerId: string): Promise<AIRecommendation[]> => {
    const q = query(aiRecommendationsCol, where('playerId', '==', playerId), orderBy('createdAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch AI Recommendations',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AIRecommendation));
};

export const createRecommendation = async (data: Omit<AIRecommendation, 'id'>): Promise<string> => {
    const docRef = await addDoc(aiRecommendationsCol, {
        ...data,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

// --- Workflows ---

export const getWorkflows = async (): Promise<Workflow[]> => {
    const q = query(workflowsCol, orderBy('createdAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Workflows',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Workflow));
};

export const getWorkflow = async (id: string): Promise<Workflow | null> => {
    const ref = doc(db, 'apps', 'game-forge', 'workflows', id);
    const snap = await safeGetDoc(ref, {
        fallback: null,
        context: 'GameForge',
        description: 'Fetch Workflow',
    });
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Workflow;
};

export const createWorkflow = async (data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = serverTimestamp();
    const docRef = await addDoc(workflowsCol, {
        ...data,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
};

export const updateWorkflow = async (id: string, data: Partial<Workflow>): Promise<void> => {
    const ref = doc(db, 'apps', 'game-forge', 'workflows', id);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
    });
};

export const toggleWorkflow = async (id: string, enabled: boolean): Promise<void> => {
    const ref = doc(db, 'apps', 'game-forge', 'workflows', id);
    await updateDoc(ref, {
        enabled,
        updatedAt: serverTimestamp(),
    });
};

export const getWorkflowRuns = async (workflowId: string): Promise<WorkflowRun[]> => {
    const q = query(workflowRunsCol, where('workflowId', '==', workflowId), orderBy('startedAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'GameForge',
        description: 'Fetch Workflow Runs',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkflowRun));
};
