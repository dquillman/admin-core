import {
    getDocs,
    getDoc,
    Query,
    DocumentReference,
    QuerySnapshot,
    DocumentSnapshot,
    AggregateQuerySnapshot,
    AggregateField,
    getCountFromServer
} from 'firebase/firestore';

interface SafeReadOptions<T> {
    fallback: T;
    context: string;
    description?: string;
}

/**
 * Standardized logging for Firestore errors
 */
const logFirestoreError = (error: any, context: string, description: string) => {
    console.error(`[Firestore Error] [${context}] ${description}`, {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
    });
};

/**
 * Safely fetches documents from a query.
 * Returns fallback (usually []) on error.
 */
export const safeGetDocs = async <T>(
    q: Query,
    options: SafeReadOptions<T[]> = { fallback: [], context: 'Unknown', description: 'Fetch Docs' }
): Promise<QuerySnapshot | { docs: any[]; empty: boolean; size: number }> => {
    try {
        const snapshot = await getDocs(q);
        return snapshot;
    } catch (error) {
        logFirestoreError(error, options.context, options.description || 'safeGetDocs failed');
        // Return a mock empty snapshot structure to prevent hard crashes downstream if they use .forEach or .map on docs
        return {
            docs: [],
            empty: true,
            size: 0,
            forEach: () => { },
            docChanges: () => []
        } as any;
    }
};

/**
 * Safely fetches a single document.
 * Returns null or fallback on error.
 */
export const safeGetDoc = async <T>(
    ref: DocumentReference,
    options: SafeReadOptions<T | null> = { fallback: null, context: 'Unknown', description: 'Fetch Single Doc' }
): Promise<DocumentSnapshot | { exists: () => boolean; data: () => T | null; id: string }> => {
    try {
        const snapshot = await getDoc(ref);
        return snapshot;
    } catch (error) {
        logFirestoreError(error, options.context, options.description || 'safeGetDoc failed');
        return {
            exists: () => false,
            data: () => options.fallback,
            id: ref.id
        } as any;
    }
};

/**
 * Safely fetches a count of documents.
 * Returns fallback (usually 0) on error.
 */
export const safeGetCount = async (
    q: Query,
    options: SafeReadOptions<number> = { fallback: 0, context: 'Unknown', description: 'Count Docs' }
): Promise<AggregateQuerySnapshot<{ count: AggregateField<number> }> | { data: () => { count: number } }> => {
    try {
        const snapshot = await getCountFromServer(q);
        return snapshot;
    } catch (error) {
        // If index is missing or permissions fail, fall back safely
        logFirestoreError(error, options.context, options.description || 'safeGetCount failed');
        return {
            data: () => ({ count: options.fallback })
        } as any;
    }
};
