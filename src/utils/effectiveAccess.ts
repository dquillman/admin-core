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
    // Support both 'trialActive' (legacy/standard) and 'trial' (new flow) flags
    // The new flow sets plan='pro' AND trial=true, so we must catch it here before the Paid check
    const isTrial = user.trialActive === true || user.trial === true;

    if (isTrial && user.trialEndsAt) {
        if (user.trialEndsAt.toMillis() > now.toMillis()) {
            return {
                type: 'trial',
                label: 'Active (Trial)',
                endsAt: user.trialEndsAt
            };
        }
        // If expired, fall through?
        // If plan is 'pro' but trial expired, do we count as paid? 
        // Usually yes, if they converted. If they didn't convert, plan should probably not look like 'pro' or disabled.
        // But for now, we follow existing fall-through behavior.
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
