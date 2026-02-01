// Canonical Issue Statuses
export const ISSUE_STATUS = {
    NEW: 'new',
    REVIEWED: 'reviewed',
    BACKLOGGED: 'backlogged',
    WORKING: 'in_progress',
    FIXED: 'resolved',
    RELEASED: 'released',
    CLOSED: 'closed',
    DELETED: 'deleted' // Soft delete status if used explicitly, though usually a boolean flag
} as const;

export type IssueStatusValue = typeof ISSUE_STATUS[keyof typeof ISSUE_STATUS];

// Display Options for UI Dropdowns
export const ISSUE_STATUS_OPTIONS = [
    { value: ISSUE_STATUS.NEW, label: 'New' },
    { value: ISSUE_STATUS.REVIEWED, label: 'Reviewed' },
    { value: ISSUE_STATUS.BACKLOGGED, label: 'Backlogged' },
    { value: ISSUE_STATUS.WORKING, label: 'In Progress' },
    { value: ISSUE_STATUS.FIXED, label: 'Resolved' },
    { value: ISSUE_STATUS.RELEASED, label: 'Released' },
    { value: ISSUE_STATUS.CLOSED, label: 'Closed' }
];

export const ISSUE_PLATFORMS = {
    MOBILE: 'Mobile',
    DESKTOP: 'Desktop',
    TABLET: 'Tablet',
} as const;

export type IssuePlatform = typeof ISSUE_PLATFORMS[keyof typeof ISSUE_PLATFORMS];

// Helper for UI Coloring (Tailwind classes)
export const getStatusColor = (status: string) => {
    switch (status) {
        case ISSUE_STATUS.NEW: return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
        case ISSUE_STATUS.REVIEWED: return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
        case ISSUE_STATUS.BACKLOGGED: return 'bg-slate-500/10 text-slate-400 border-slate-500/20 border-dashed';
        case ISSUE_STATUS.WORKING: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case ISSUE_STATUS.FIXED: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case ISSUE_STATUS.RELEASED: return 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50';
        case ISSUE_STATUS.CLOSED: return 'bg-slate-800 text-slate-500 border-slate-700';
        default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
};
