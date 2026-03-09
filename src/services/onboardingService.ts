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
} from 'firebase/firestore';
import { db } from '../firebase';
import { safeGetDocs, safeGetDoc } from '../utils/firestoreSafe';
import type { OnboardingFlow, OnboardingFlowStatus, OnboardingSession, OnboardingAnalytics } from '../types';

// Collection references scoped under apps/onboard-kit/
const flowsCol = collection(db, 'apps', 'onboard-kit', 'flows');
const sessionsCol = collection(db, 'apps', 'onboard-kit', 'sessions');
const analyticsCol = collection(db, 'apps', 'onboard-kit', 'analytics');

// --- Flow CRUD ---

export const getFlows = async (): Promise<OnboardingFlow[]> => {
    const q = query(flowsCol, orderBy('updatedAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'OnboardKit',
        description: 'Fetch Flows',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as OnboardingFlow));
};

export const getFlow = async (flowId: string): Promise<OnboardingFlow | null> => {
    const ref = doc(db, 'apps', 'onboard-kit', 'flows', flowId);
    const snap = await safeGetDoc(ref, {
        fallback: null,
        context: 'OnboardKit',
        description: 'Fetch Flow',
    });
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as OnboardingFlow;
};

export const createFlow = async (name: string, description: string): Promise<string> => {
    const now = serverTimestamp();
    const docRef = await addDoc(flowsCol, {
        name,
        description,
        status: 'draft' as OnboardingFlowStatus,
        steps: [],
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
};

export const updateFlow = async (
    flowId: string,
    updates: Partial<Pick<OnboardingFlow, 'name' | 'description' | 'status' | 'steps'>>
): Promise<void> => {
    const ref = doc(db, 'apps', 'onboard-kit', 'flows', flowId);
    const payload: Record<string, unknown> = {
        ...updates,
        updatedAt: serverTimestamp(),
    };
    if (updates.status === 'published') {
        payload.publishedAt = serverTimestamp();
    }
    await updateDoc(ref, payload);
};

export const deleteFlow = async (flowId: string): Promise<void> => {
    const ref = doc(db, 'apps', 'onboard-kit', 'flows', flowId);
    await deleteDoc(ref);
};

// --- Session Queries ---

export const getSessionsByFlow = async (flowId: string): Promise<OnboardingSession[]> => {
    const q = query(sessionsCol, where('flowId', '==', flowId), orderBy('startedAt', 'desc'), limit(200));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'OnboardKit',
        description: 'Fetch Sessions',
    });
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as OnboardingSession));
};

// --- Analytics ---

export const getFlowAnalytics = async (flowId: string): Promise<OnboardingAnalytics | null> => {
    const ref = doc(db, 'apps', 'onboard-kit', 'analytics', flowId);
    const snap = await safeGetDoc(ref, {
        fallback: null,
        context: 'OnboardKit',
        description: 'Fetch Flow Analytics',
    });
    if (!snap.exists()) return null;
    return { flowId: snap.id, ...snap.data() } as OnboardingAnalytics;
};

export const getAllAnalytics = async (): Promise<OnboardingAnalytics[]> => {
    const q = query(analyticsCol, orderBy('updatedAt', 'desc'));
    const snap = await safeGetDocs(q, {
        fallback: [],
        context: 'OnboardKit',
        description: 'Fetch All Analytics',
    });
    return snap.docs.map(d => ({ flowId: d.id, ...d.data() } as OnboardingAnalytics));
};
