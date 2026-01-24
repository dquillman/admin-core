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

// --- Discovery & Marketing Types ---

export type LeadSource = 'landing' | 'linkedin' | 'reddit' | 'discord' | 'manual';
export type LeadStatus = 'new' | 'invited' | 'active' | 'converted' | 'lost';

export interface MarketingLead {
    id?: string;
    email: string;
    source: LeadSource;
    status: LeadStatus;
    notes?: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export type OutreachPlatform = 'LinkedIn' | 'Reddit' | 'Discord';

export interface OutreachLog {
    id?: string;
    platform: OutreachPlatform;
    messageVariant: 'A' | 'B';
    responses: number;
    signups: number;
    notes?: string;
    date: Timestamp;
    week?: string; // e.g., "2024-W01" for grouping
}

export interface ConversionEvent {
    id?: string;
    uid: string;
    event: 'pricing_viewed' | 'upgrade_clicked' | 'converted';
    timestamp: Timestamp;
    metadata?: any;
}

// --- 2112 Activity Types ---

export type DecisionType = 'resource_allocation' | 'feature_prioritization' | 'risk_assessment' | 'simulation';
export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'simulated';

export interface Decision {
    id: string;
    app_id: string;
    type: DecisionType;
    confidence: number;
    reasoning: {
        summary: string;
        details?: string;
    };
    recommended_action: string;
    status: DecisionStatus;
    created_at: Timestamp;
}

export type AppHealthState = 'ok' | 'warning' | 'critical' | 'paused';
export type AppStatus = 'active' | 'inactive' | 'archived';

export interface App {
    id: string;
    name: string;
    status: AppStatus;
    health: {
        state: AppHealthState;
        issues?: string[];
        last_check_at?: Timestamp;
    };
    last_event_at?: Timestamp;
}

export interface FounderBriefing {
    id: string;
    created_at: Timestamp;
    summary: string;
    topics: string[];
    period_start: Timestamp;
    period_end: Timestamp;
}

export type SimulationScenario = 'silent_app' | 'high_friction' | 'low_conversion';


// --- Issues Management Types ---

export interface IssueNote {
    text: string;
    adminUid: string;
    createdAt: Timestamp;
}

export interface ReportedIssue {
    id: string;
    app: string;
    userId: string | null;
    type: 'bug' | 'confusion' | 'feedback' | 'ux' | 'accessibility' | 'tutor-gap' | 'mobile';
    severity?: 'S1' | 'S2' | 'S3' | 'S4';
    message: string; // Legacy or alternative
    description?: string; // Actual field from client
    url: string | null;
    createdAt?: Timestamp; // Optional (legacy/admin-created)
    timestamp?: Timestamp; // Primary (client-created)
    notes?: IssueNote[];

    // Additional Context Fields
    status?: string;
    userEmail?: string;
    version?: string;
    path?: string;
    userAgent?: string;

    // Unused / New Fields
    attachmentUrl?: string | null;
    deleted?: boolean;
    updatedAt?: Timestamp;
    classification?: 'blocking' | 'misleading' | 'trust' | 'cosmetic';
}
