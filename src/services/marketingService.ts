import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { requireAdmin } from './firestoreService';
import { safeGetDocs } from '../utils/firestoreSafe';
import type { MarketingLead, OutreachLog } from '../types';

// --- Leads Service ---

export const getMarketingLeads = async (): Promise<MarketingLead[]> => {
    await requireAdmin();
    const q = query(collection(db, 'marketing_leads'), orderBy('createdAt', 'desc'));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Marketing', description: 'Get Leads' });
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketingLead));
};

export const addMarketingLead = async (lead: Omit<MarketingLead, 'id' | 'createdAt'>) => {
    await requireAdmin();
    await addDoc(collection(db, 'marketing_leads'), {
        ...lead,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
};

export const updateMarketingLead = async (id: string, updates: Partial<MarketingLead>) => {
    await requireAdmin();
    await updateDoc(doc(db, 'marketing_leads', id), {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const deleteMarketingLead = async (id: string) => {
    await requireAdmin();
    await deleteDoc(doc(db, 'marketing_leads', id));
};

// --- Outreach Service ---

export const getOutreachLogs = async (): Promise<OutreachLog[]> => {
    await requireAdmin();
    // Default to last 30 days or 50 entries for now
    const q = query(collection(db, 'outreach_logs'), orderBy('date', 'desc'));
    const snap = await safeGetDocs(q, { fallback: [], context: 'Marketing', description: 'Get Outreach Logs' });
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutreachLog));
};

export const addOutreachLog = async (log: Omit<OutreachLog, 'id'>) => {
    await requireAdmin();
    await addDoc(collection(db, 'outreach_logs'), {
        ...log
        // Timestamp is usually passed from the form as the selected date, so we use it directly or ensure it's a Timestamp
    });
};
