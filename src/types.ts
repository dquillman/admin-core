import { Timestamp } from 'firebase/firestore';

export type BillingStatus = 'paid' | 'tester' | 'comped' | 'trial' | 'unknown';
export type BillingSource = 'stripe' | 'manual';
export type UserTag = 'tester' | 'friend' | 'user' | 'influencer' | 'beta';

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

    // Trial (Flattened as per request)
    trialActive?: boolean;
    trialEndsAt?: Timestamp | null;

    disabled?: boolean;
    createdAt?: Timestamp;

    // Archive (soft delete, reversible)
    archived?: boolean;
    archivedAt?: Timestamp | null;
    archivedBy?: string | null;

    // Billing Status (Stripe-verified payments)
    billingStatus?: BillingStatus;
    billingSource?: BillingSource | null;
    billingRef?: string | null;
    verifiedPaidAt?: Timestamp | null;

    // Tester Access Fields
    testerOverride?: boolean;
    testerExpiresAt?: Timestamp | null;
    testerGrantedBy?: string | null;
    testerGrantedAt?: Timestamp | null;

    trial?: {
        active: boolean;
        endsAt?: Timestamp;
    };

    // Admin classification tag (independent of access tier)
    userTag?: UserTag;

    // Usage Score (pre-computed, admin-only)
    usageScore?: number;       // 0–100
    usageBand?: UsageBand;
    usageBreakdown?: {
        activeDays?: number;
        coreActions?: number;
        completions?: number;
    };

    [key: string]: unknown;
}

export type UsageBand = 'Dormant' | 'Curious' | 'Engaged' | 'Active' | 'Power User';

export interface AuditLog {
    id: string;
    action: string;
    adminUid: string;
    targetUid?: string;
    timestamp: Timestamp;
    metadata?: Record<string, unknown>;
}

export interface TesterStats {
    grantedTesters: number;
    revokedTesters: number;
    disabledUsers: number;
    totalSessions?: number;
    lastUpdated?: Timestamp;
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
    metadata?: Record<string, unknown>;
}

// --- Activity Types (used by GodsView / Activity2112) ---

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

// --- OnboardKit Types ---

export type OnboardingStepType = 'welcome' | 'form' | 'checklist' | 'video' | 'redirect';
export type OnboardingFlowStatus = 'draft' | 'published' | 'archived';

export interface OnboardingStep {
    id: string;
    type: OnboardingStepType;
    title: string;
    config: Record<string, unknown>;
    order: number;
}

export interface OnboardingFlow {
    id: string;
    name: string;
    description: string;
    status: OnboardingFlowStatus;
    steps: OnboardingStep[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
    publishedAt?: Timestamp;
}

export interface OnboardingSession {
    id: string;
    flowId: string;
    userId: string;
    currentStep: number;
    completed: boolean;
    startedAt: Timestamp;
    completedAt?: Timestamp;
    stepData: Record<string, unknown>;
}

export interface OnboardingAnalytics {
    flowId: string;
    totalSessions: number;
    completedSessions: number;
    stepDropoff: Record<string, number>;
    avgCompletionTime: number;
    updatedAt: Timestamp;
}

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
    classification?: 'unclassified' | 'blocking' | 'misleading' | 'trust' | 'cosmetic';

    // Category Governance
    suggestedCategory?: string; // Optional user suggestion if type is 'Uncategorized'

    // Release Planning
    plannedForVersion?: string | null; // semver from release_versions, null = not planned
    releasedInVersion?: string | null; // semver from release_versions, set when status === 'released'

    // Telemetry (auto-captured on submission)
    environment?: string;       // e.g. 'development', 'production'
    os?: string;                // e.g. 'Windows 11', 'macOS 14'
    browser?: string;           // e.g. 'Chrome 120', 'Safari 17'
    submittedFrom?: string;     // e.g. 'admin-core', 'exam-coach'
    examId?: string;            // context: which exam was active
    examName?: string;          // context: human-readable exam name
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
    id: string;           // doc ID = appId__version (e.g. "exam-coach__1.15.1")
    version: string;      // x.xx.x format
    appId?: string;       // APP_REGISTRY key (e.g. "exam-coach"); absent on legacy docs
    status: ReleaseVersionStatus;
    createdAt: Timestamp;
    createdBy: string;    // adminUid
}
