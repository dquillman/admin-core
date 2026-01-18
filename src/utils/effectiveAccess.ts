import { Timestamp } from 'firebase/firestore';

export type AccessType = 'tester' | 'tester_invalid' | 'trial' | 'paid' | 'none';

export interface AccessState {
    type: AccessType;
    label: string;
    endsAt?: Timestamp | null;
}

export const getEffectiveAccess = (user: any): AccessState => {
    const now = Timestamp.now();

    // 1. Tester Logic
    if (user.testerOverride === true) {
        // Valid if expiresAt exists and is in the future
        if (user.testerExpiresAt && user.testerExpiresAt.toMillis() > now.toMillis()) {
            return {
                type: 'tester',
                label: 'Active (Tester)',
                endsAt: user.testerExpiresAt
            };
        }
        // Otherwise invalid
        return {
            type: 'tester_invalid',
            label: 'Tester (Invalid)',
            endsAt: null
        };
    }

    // 2. Trial Logic
    if (user.trialActive === true && user.trialEndsAt) {
        if (user.trialEndsAt.toMillis() > now.toMillis()) {
            return {
                type: 'trial',
                label: 'Active (Trial)',
                endsAt: user.trialEndsAt
            };
        }
        // If trial expired, we fall through to paid/none
    }

    // 3. Paid Logic
    if (user.plan === 'pro') {
        return {
            type: 'paid',
            label: 'Paid / Pro',
            endsAt: null
        };
    }

    // 4. Fallback
    return {
        type: 'none',
        label: '—',
        endsAt: null
    };
};
