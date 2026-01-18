import { Timestamp } from 'firebase/firestore';

export interface User {
    uid: string;
    email: string;
    role: 'admin' | 'user';
    // Standard Fields
    plan?: 'starter' | 'pro';

    // Trial (Flattened as per request)
    trialActive?: boolean;
    trialEndsAt?: Timestamp | null;

    // Legacy Support (optional, may still be used during migration)
    isPro?: boolean;
    disabled?: boolean;
    createdAt?: Timestamp;

    // Tester Access Fields
    testerOverride?: boolean;
    testerExpiresAt?: Timestamp | null;
    testerGrantedBy?: string | null;
    testerGrantedAt?: Timestamp | null;

    trial?: {
        active: boolean;
        endsAt?: Timestamp;
    };

    [key: string]: any;
}

export interface AuditLog {
    id: string;
    action: string;
    adminUid: string;
    targetUid?: string;
    timestamp: Timestamp;
    metadata?: any;
}

export interface TesterStats { // For summary cards
    activeTesters: number;
    expiringSoon: number; // e.g. next 3 days
    totalGranted30d: number;
}
