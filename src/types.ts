import { Timestamp } from 'firebase/firestore';

export interface User {
    uid: string;
    email: string;
    role: 'admin' | 'user';
    // Standard Fields
    plan?: 'starter' | 'pro';

    // Profile fields (editable by admin)
    firstName?: string;
    lastName?: string;
    displayName?: string;

    // Auth metadata (read-only in admin)
    authProvider?: string;

    // Trial (Flattened as per request)
    trialActive?: boolean;
    trialEndsAt?: Timestamp | null;

    // Legacy Support (optional, may still be used during migration)
    isPro?: boolean;
    disabled?: boolean;
    createdAt?: Timestamp;

    // Archive (soft delete, reversible)
    archived?: boolean;
    archivedAt?: Timestamp | null;
    archivedBy?: string | null;

    // Tester Access Fields
    testerOverride?: boolean;
    testerExpiresAt?: Timestamp | null;
    testerGrantedBy?: string | null;
    testerGrantedAt?: Timestamp | null;

    trial?: {
        active: boolean;
        endsAt?: Timestamp;
    };

    // Usage Score (pre-computed, admin-only)
    usageScore?: number;       // 0–100
    usageBand?: UsageBand;
    usageBreakdown?: {
        activeDays?: number;
        coreActions?: number;
        completions?: number;
    };

    [key: string]: any;
}

export type UsageBand = 'Dormant' | 'Curious' | 'Engaged' | 'Active' | 'Power User';

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
    displayId?: string; // Friendly ID (e.g. EC-123). Optional initially.
    app: string;
    userId: string | null;
    type: string; // Category registry ID (e.g. 'content_quality', 'quiz_assessment_logic')
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
    platform?: string; // e.g. 'Mobile', 'Desktop'

    // Unused / New Fields
    attachmentUrl?: string | null;
    deleted?: boolean;
    updatedAt?: Timestamp;
    classification?: 'blocking' | 'misleading' | 'trust' | 'cosmetic';

    // Category Governance
    suggestedCategory?: string; // Optional user suggestion if type is 'Uncategorized'

    // Release Planning
    plannedForVersion?: string | null; // semver from release_versions, null = not planned
}

export interface IssueCategory {
    id: string; // immutable slug (e.g. 'bug', 'ux')
    label: string; // Display name
    description: string;
    status: 'active' | 'deprecated';
    createdBy: 'system' | 'admin';
    createdAt: Timestamp;
}

export type ReleaseVersionStatus = 'planned' | 'in-progress' | 'released';

export interface ReleaseVersion {
    id: string;           // doc ID = version string (e.g. "1.15.1")
    version: string;      // x.xx.x format
    status: ReleaseVersionStatus;
    createdAt: Timestamp;
    createdBy: string;    // adminUid
}
