import React, { useState, useEffect, useMemo } from 'react';
import { assignMissingIssueIds, repairDuplicateIssueIds, subscribeToReportedIssues, subscribeToIssueCategories, fetchAllUsersLookup } from '../services/firestoreService';
import type { ReportedIssue, IssueCategory } from '../types';
import { OperatorReviewPanel } from '../components/OperatorReviewPanel';
import { IssueDetailModal } from '../components/IssueDetailModal';
import { ISSUE_STATUS, ISSUE_STATUS_OPTIONS, ISSUE_PLATFORMS, getStatusColor as getStatusColorConstant } from '../constants';

import {
    AlertCircle,
    Calendar,
    User,
    ExternalLink,

    Loader2,
    Filter,
    ArrowUpDown,
    RefreshCw,
    Download,
    Upload
} from 'lucide-react';
import { ImportIssuesModal } from '../components/ImportIssuesModal';

// Resolve legacy and missing status values to canonical form
const resolveStatus = (s?: string): string => {
    if (!s) return 'new';
    const v = s.toLowerCase();
    if (v === 'open') return 'new';
    if (v === 'working' || v === 'in progress') return 'in_progress';
    if (v === 'fixed') return 'resolved';
    return v;
};

const Issues: React.FC = () => {
    const [issues, setIssues] = useState<ReportedIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<ReportedIssue | null>(null);

    const [isAssigning, setIsAssigning] = useState(false);

    // Filter & Sort State
    const [filterApp, setFilterApp] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [filterPlatform, setFilterPlatform] = useState<string>('all');
    const [searchUser, setSearchUser] = useState<string>('');
    const [filterClassification, setFilterClassification] = useState<string>('all');
    const [filterAssignee, setFilterAssignee] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'issue_id_desc' | 'issue_id_asc' | 'severity_desc' | 'severity_asc' | 'type_asc' | 'type_desc' | 'classification_risk' | 'organized' | 'assignee_asc' | 'assignee_desc'>('newest');
    const [categories, setCategories] = useState<IssueCategory[]>([]);
    const [isImportOpen, setIsImportOpen] = useState(false);

    // User lookup for resolving userId → email on cards
    const [users, setUsers] = useState<{ uid: string; email: string }[]>([]);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToReportedIssues(100, (data) => {
            setIssues(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToIssueCategories((cats) => setCategories(cats));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        fetchAllUsersLookup()
            .then(setUsers)
            .catch((err) => console.error('Failed to fetch users lookup:', err));
    }, []);

    // Manual refresh is no longer strictly necessary but kept for other reasons if needed
    const fetchIssues = async () => {
        // Re-triggering loading state might look glitchy with realtime updates, 
        // so we rely on the listener. 
        // If a hard refresh is absolutely needed, we could re-mount or just log.
        console.log("Realtime listener is active. Manual refresh ignored.");
    };

    const formatDate = (val: any): string => {
        try {
            if (!val) return 'N/A';
            if (typeof val.toDate === 'function') return val.toDate().toLocaleDateString();
            if (val instanceof Date) return val.toLocaleDateString();
            return String(val); // Fallback for strings/numbers
        } catch {
            return 'Invalid Date';
        }
    };

    // Derived State: Unique Apps for Filter Dropdown
    const uniqueApps = useMemo(() => {
        const apps = new Set(issues.map(i => i.app).filter(Boolean));
        return Array.from(apps).sort();
    }, [issues]);

    // Memoized user lookup map (uid → email)
    const userMap = useMemo(() => new Map(users.map(u => [u.uid, u.email])), [users]);

    const resolveAssignee = (userId: string | null | undefined): string => {
        if (!userId) return 'Unassigned';
        if (userMap.has(userId)) return userMap.get(userId)!;
        if (userId.includes('@')) return userId;
        return `Unknown (${userId.slice(0, 8)}...)`;
    };

    // Derived State: Unique assignee display values from current issues
    const uniqueAssignees = useMemo(() => {
        const seen = new Set<string>();
        issues.filter(i => !i.deleted).forEach(i => seen.add(resolveAssignee(i.userId)));
        return Array.from(seen).sort((a, b) => {
            // "Unassigned" always last in dropdown
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
    }, [issues, userMap]);

    // Filter Logic
    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            if (issue.deleted) return false; // Filter out soft-deleted issues
            if (filterApp !== 'all' && issue.app !== filterApp) return false;

            if (filterStatus !== 'all' && resolveStatus(issue.status) !== filterStatus) return false;

            if (filterType !== 'all' && issue.type !== filterType) return false;

            if (filterClassification !== 'all') {
                if (filterClassification === 'unclassified' && issue.classification) return false;
                if (filterClassification !== 'unclassified' && issue.classification !== filterClassification) return false;
            }

            const severity = issue.severity || 'S3';
            if (filterSeverity !== 'all' && severity !== filterSeverity) return false;

            if (filterPlatform !== 'all' && issue.platform !== filterPlatform) return false;

            if (filterAssignee !== 'all' && resolveAssignee(issue.userId) !== filterAssignee) return false;

            if (searchUser) {
                const searchLower = searchUser.toLowerCase();
                const userIdMatch = issue.userId?.toLowerCase().includes(searchLower);
                const emailMatch = issue.userEmail?.toLowerCase().includes(searchLower);
                if (!userIdMatch && !emailMatch) return false;
            }

            return true;
        }).sort((a, b) => {
            const getMillis = (i: ReportedIssue) => {
                if (i.timestamp?.toMillis) return i.timestamp.toMillis();
                if (i.createdAt?.toMillis) return i.createdAt.toMillis();
                return 0;
            };

            if (sortOrder === 'organized') {
                // 1. Status Priority
                const statusMap: Record<string, number> = {
                    [ISSUE_STATUS.NEW]: 0,
                    [ISSUE_STATUS.BACKLOGGED]: 0.5,
                    [ISSUE_STATUS.WORKING]: 1,
                    'blocked': 2,
                    [ISSUE_STATUS.FIXED]: 3,
                    [ISSUE_STATUS.RELEASED]: 4,
                    [ISSUE_STATUS.CLOSED]: 5
                };
                const statA = statusMap[resolveStatus(a.status)] ?? 99;
                const statB = statusMap[resolveStatus(b.status)] ?? 99;
                if (statA !== statB) return statA - statB;

                // 2. Severity Priority (Critical to Low)
                const sevMap: Record<string, number> = { 'S1': 0, 'S2': 1, 'S3': 2, 'S4': 3 };
                const sevA = sevMap[a.severity || 'S3'] ?? 2;
                const sevB = sevMap[b.severity || 'S3'] ?? 2;
                if (sevA !== sevB) return sevA - sevB;

                // 3. Age (Older first)
                const timeA = getMillis(a);
                const timeB = getMillis(b);
                if (timeA !== timeB) return timeA - timeB; // Ascending

                // 4. Tie-breaker: ID
                const getNumericId = (id: string, displayId?: string) => {
                    if (displayId) {
                        const match = displayId.match(/EC-(\d+)/);
                        if (match) return parseInt(match[1], 10);
                    }
                    const matchId = id && id.match(/EC-(\d+)/);
                    if (matchId) return parseInt(matchId[1], 10);
                    return 0;
                };
                return getNumericId(a.id, a.displayId) - getNumericId(b.id, b.displayId);
            }


            if (sortOrder === 'issue_id_desc' || sortOrder === 'issue_id_asc') {
                const getNumericId = (id: string, displayId?: string) => {
                    // Try displayId first (e.g. "EC-123")
                    if (displayId) {
                        const match = displayId.match(/EC-(\d+)/);
                        if (match) return parseInt(match[1], 10);
                    }
                    // Fallback to id if it follows the pattern (unlikely but safe)
                    const matchId = id && id.match(/EC-(\d+)/);
                    if (matchId) return parseInt(matchId[1], 10);

                    return 0;
                };

                const idA = getNumericId(a.id, a.displayId);
                const idB = getNumericId(b.id, b.displayId);

                // Handling for 0 (Pending/Missing IDs) - Always push to bottom
                if (idA === 0 && idB === 0) return 0; // Keep relative order (or by timestamp via stability)
                if (idA === 0) return 1; // A is pending -> A goes last
                if (idB === 0) return -1; // B is pending -> B goes last

                return sortOrder === 'issue_id_desc' ? idB - idA : idA - idB;
            }

            if (sortOrder === 'classification_risk') {
                const cMap: Record<string, number> = { 'blocking': 5, 'misleading': 4, 'trust': 3, 'cosmetic': 2, 'unclassified': 1 };
                const cA = cMap[a.classification || 'unclassified'] || 1;
                const cB = cMap[b.classification || 'unclassified'] || 1;
                // If same classification, fallback to newest
                if (cA === cB) return getMillis(b) - getMillis(a);
                return cB - cA; // Descending risk
            }

            if (sortOrder === 'severity_desc' || sortOrder === 'severity_asc') {
                const sMap: Record<string, number> = { 'S1': 4, 'S2': 3, 'S3': 2, 'S4': 1 };
                const sA = sMap[a.severity || 'S3'] || 0;
                const sB = sMap[b.severity || 'S3'] || 0;
                return sortOrder === 'severity_desc' ? sB - sA : sA - sB;
            }

            if (sortOrder === 'type_asc' || sortOrder === 'type_desc') {
                const typeA = a.type || '';
                const typeB = b.type || '';
                return sortOrder === 'type_asc' ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
            }

            if (sortOrder === 'assignee_asc' || sortOrder === 'assignee_desc') {
                const aName = resolveAssignee(a.userId);
                const bName = resolveAssignee(b.userId);
                // "Unassigned" always sorts to bottom regardless of direction
                if (aName === 'Unassigned' && bName !== 'Unassigned') return 1;
                if (bName === 'Unassigned' && aName !== 'Unassigned') return -1;
                const cmp = aName.localeCompare(bName);
                return sortOrder === 'assignee_asc' ? cmp : -cmp;
            }

            const dateA = getMillis(a);
            const dateB = getMillis(b);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
}, [issues, filterApp, filterType, filterStatus, filterSeverity, filterClassification, filterAssignee, filterPlatform, searchUser, sortOrder, userMap]);



const handleAssignIds = async () => {
    setIsAssigning(true);
    try {
        const count = await assignMissingIssueIds();
        if (count > 0) {
            alert(`Assigned IDs to ${count} issues.`);
        } else {
            alert("No missing IDs found.");
        }
    } catch (error) {
        console.error("Failed to assign IDs:", error);
        alert("Failed to assign IDs. Check console.");
    } finally {
        setIsAssigning(false);
    }
};

const handleRepairIds = async () => {
    setIsAssigning(true);
    try {
        const result = await repairDuplicateIssueIds();
        if (result.fixed > 0) {
            alert(`Repaired ${result.fixed} duplicate IDs:\n${result.log.join('\n')}`);
        } else {
            alert(result.log[0]);
        }
    } catch (error) {
        console.error("Failed to repair IDs:", error);
        alert("Failed to repair IDs. Check console.");
    } finally {
        setIsAssigning(false);
    }
};

const handleExport = () => {
    const exportData = issues.map(i => ({
        id: i.id,
        app: i.app,
        summary: i.message || i.description || 'No Description',
        severity: i.severity || 'S3',
        classification: i.classification || 'unclassified',
        status: i.status || 'new',
        createdAt: i.createdAt?.toDate?.()?.toISOString() || i.timestamp?.toDate?.()?.toISOString() || null,
        lastUpdated: i.updatedAt?.toDate?.()?.toISOString() || null,
        adminNotes: i.notes?.map(n => n.text) || []
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `issues-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const TYPE_COLORS = [
    'bg-red-500/10 text-red-500 border-red-500/20',
    'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'bg-teal-500/10 text-teal-500 border-teal-500/20',
    'bg-pink-500/10 text-pink-500 border-pink-500/20',
    'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
];

const getTypeColor = (type: string) => {
    if (!type) return 'bg-slate-800 text-slate-400';
    // Deterministic color based on string hash
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
        hash = ((hash << 5) - hash) + type.charCodeAt(i);
        hash |= 0;
    }
    return TYPE_COLORS[Math.abs(hash) % TYPE_COLORS.length];
};

const getSeverityColor = (sev?: string) => {
    const s = sev || 'S3'; // Default to S3
    switch (s) {
        case 'S1': return 'bg-red-600 text-white border-red-500 font-bold'; // Critical
        case 'S2': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'; // High
        case 'S3': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'; // Medium (Default)
        case 'S4': return 'bg-slate-800 text-slate-400 border-slate-700'; // Low
        default: return 'bg-slate-800 text-slate-400';
    }
};

const getStatusColor = (status: string) => {
    return getStatusColorConstant(status);
};

const getClassificationColor = (cls?: string) => {
    if (!cls || (cls as string) === 'unclassified') return 'bg-slate-800/50 text-slate-500 border-slate-700/50';
    switch (cls) {
        case 'blocking': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'misleading': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'trust': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
        case 'cosmetic': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
        default: return 'bg-slate-800 text-slate-400';
    }
};

if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
    );
}

return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Reported Issues</h1>
                <div className="text-sm text-slate-500 mt-1">
                    Showing {filteredIssues.length} of {issues.length} issues (Limit: 100)
                </div>
            </div>

            <div className="flex items-center gap-3">
                <input
                    type="text"
                    placeholder="Search User ID or Email..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg p-2.5 focus:ring-brand-500 focus:border-brand-500 w-64"
                />

                <button
                    onClick={handleExport}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors self-start md:self-center flex items-center gap-2"
                    title="Export Issues (JSON)"
                >
                    <Download className="w-5 h-5" />
                    <span className="sr-only md:not-sr-only text-xs font-medium">Export</span>
                </button>

                <button
                    onClick={() => setIsImportOpen(true)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors self-start md:self-center flex items-center gap-2"
                    title="Import Issues (CSV/JSON)"
                >
                    <Upload className="w-5 h-5" />
                    <span className="sr-only md:not-sr-only text-xs font-medium">Import</span>
                </button>

                <button
                    onClick={() => setIsReviewPanelOpen(!isReviewPanelOpen)}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isReviewPanelOpen
                        ? 'bg-purple-900/50 text-purple-300 ring-2 ring-purple-500/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                    title="Toggle Operator Review Mode"
                >
                    <span className="text-lg">🧠</span>
                    <span className="hidden md:inline text-xs font-medium">Operator Review</span>
                </button>

                <button
                    onClick={() => setSortOrder('organized')}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${sortOrder === 'organized'
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                    title="Organize by Priority (Status > Severity > Age)"
                >
                    <Filter className="w-5 h-5" />
                    <span className="hidden md:inline text-xs font-medium">Organize</span>
                </button>

                <button
                    onClick={handleAssignIds}
                    disabled={isAssigning || !issues.some(i => !i.displayId || i.displayId === 'ID_MISSING')}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${(isAssigning || !issues.some(i => !i.displayId || i.displayId === 'ID_MISSING'))
                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                        : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                        }`}
                    title="Assign EC-### IDs to missing issues"
                >
                    {isAssigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5 rotate-90" />}
                    <span className="hidden md:inline text-xs font-medium">Assign IDs</span>
                </button>

                <button
                    onClick={handleRepairIds}
                    disabled={isAssigning}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isAssigning
                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                        : 'bg-amber-900/60 hover:bg-amber-800/70 text-amber-300 border border-amber-700/40'
                        }`}
                    title="Repair duplicate EC-### IDs (one-time)"
                >
                    {isAssigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="hidden md:inline text-xs font-medium">Repair IDs</span>
                </button>

                <button
                    onClick={fetchIssues}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors self-start md:self-center"
                    title="Refresh Issues"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium w-full md:w-auto">
                <Filter className="w-4 h-4" />
                <span>Filters:</span>
            </div>

            {/* App Filter */}
            <select
                value={filterApp}
                onChange={(e) => setFilterApp(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-auto p-2.5"
            >
                <option value="all">All Apps</option>
                {uniqueApps.map(app => (
                    <option key={app} value={app}>{app}</option>
                ))}
            </select>

            {/* Status Filter */}
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-auto p-2.5"
            >
                <option value="all">All Statuses</option>
                {ISSUE_STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label.replace('In Progress / ', '')}</option>
                ))}
            </select>

            {/* Type Filter */}
            <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-auto p-2.5"
            >
                <option value="all">All Types</option>
                {categories.filter(c => c.status === 'active').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
            </select>

            {/* Classification Filter */}
            <select
                value={filterClassification}
                onChange={(e) => setFilterClassification(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-auto p-2.5"
            >
                <option value="all">Class: All</option>
                <option value="blocking">Blocking</option>
                <option value="misleading">Misleading</option>
                <option value="trust">Trust</option>
                <option value="cosmetic">Cosmetic</option>
                <option value="unclassified">Unclassified</option>
            </select>

            {/* Severity Filter */}
            <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-auto p-2.5"
            >
                <option value="all">All Severities</option>
                <option value="S1">S1 (Critical)</option>
                <option value="S2">S2 (High)</option>
                <option value="S3">S3 (Medium)</option>
                <option value="S4">S4 (Low)</option>
            </select>

            {/* Platform Filter */}
            <select
                value={filterPlatform || 'all'}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-auto p-2.5"
            >
                <option value="all">All Platforms</option>
                {Object.values(ISSUE_PLATFORMS).map(p => (
                    <option key={p} value={p}>{p}</option>
                ))}
            </select>

            {/* Assigned To Filter */}
            <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-auto p-2.5"
            >
                <option value="all">All Assignees</option>
                {uniqueAssignees.map(name => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>

            <div className="hidden md:block w-px h-6 bg-slate-800 mx-2"></div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                <ArrowUpDown className="w-4 h-4 text-slate-500" />
                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5"
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="issue_id_desc">Issue ID (High-Low)</option>
                    <option value="issue_id_asc">Issue ID (Low-High)</option>
                    <option value="severity_desc">Severity (High → Low)</option>
                    <option value="severity_asc">Severity (Low → High)</option>
                    <option value="classification_risk">Risk (Classification)</option>
                    <option value="type_asc">Type (A → Z)</option>
                    <option value="type_desc">Type (Z → A)</option>
                    <option value="assignee_asc">Assigned To (A → Z)</option>
                    <option value="assignee_desc">Assigned To (Z → A)</option>
                    <option value="organized">Organized (Smart Sort)</option>
                </select>
            </div>
        </div>

        {filteredIssues.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Issues Found</h3>
                <p className="text-slate-400">Try adjusting your filters or refresh the list.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {filteredIssues.map(issue => (
                    <div key={issue.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all hover:border-slate-700">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Left: Meta */}
                            <div className="w-full md:w-48 shrink-0 space-y-3">
                                <div className="flex gap-2 flex-wrap">
                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(issue.type)} capitalize`}>
                                        {categories.find(c => c.id === issue.type)?.label || issue.type}
                                    </div>
                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(issue.severity)}`}>
                                        {issue.severity || 'S3'}
                                    </div>
                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(resolveStatus(issue.status))} capitalize`}>
                                        {resolveStatus(issue.status)}
                                    </div>
                                    {(issue.classification && (issue.classification as string) !== 'unclassified') && (
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getClassificationColor(issue.classification)} capitalize`}>
                                            {issue.classification}
                                        </div>
                                    )}
                                    {issue.platform && (
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-700 bg-slate-800 text-slate-400 capitalize`}>
                                            {issue.platform}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        {formatDate(issue.timestamp || issue.createdAt)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <User className="w-4 h-4" />
                                    <span className="truncate max-w-[150px]" title={resolveAssignee(issue.userId)}>
                                        {resolveAssignee(issue.userId)}
                                    </span>
                                </div>
                                <div className="text-xs text-brand-400 font-mono font-bold">
                                    {(!issue.displayId || issue.displayId === 'ID_MISSING') ? (
                                        <span className="text-slate-500 animate-pulse">Assigning ID...</span>
                                    ) : (
                                        issue.displayId
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                                    {issue.app}
                                </div>
                            </div>

                            {/* Right: Content */}
                            <div className="flex-1 space-y-4">
                                <p className="text-slate-300 leading-relaxed">
                                    {issue.description || issue.message}
                                </p>

                                {issue.url && (
                                    <a href={issue.url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300">
                                        <ExternalLink className="w-4 h-4" />
                                        Context URL
                                    </a>
                                )}

                                {/* Notes Section */}
                                {issue.notes && issue.notes.length > 0 && (
                                    <div className="bg-slate-950/50 rounded-xl p-4 space-y-3 border border-slate-800/50">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Notes</h4>
                                        {issue.notes.map((note, idx) => (
                                            <div key={idx} className="text-sm text-slate-400 pl-3 border-l-2 border-slate-700">
                                                {note.text}
                                                <span className="ml-2 text-xs text-slate-600">
                                                    - {formatDate(note.createdAt)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="pt-2 flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedIssue(issue)}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors font-medium border border-slate-700"
                                    >
                                        View Full Details
                                    </button>

                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        <OperatorReviewPanel
            isOpen={isReviewPanelOpen}
            onClose={() => setIsReviewPanelOpen(false)}
            issues={issues}
            onSelectIssue={(issue) => setSelectedIssue(issue)}
        />



        {/* View Details Modal */}
        <IssueDetailModal
            issue={selectedIssue}
            onClose={() => setSelectedIssue(null)}
            onUpdate={fetchIssues}
        />

        {/* Import Issues Modal */}
        <ImportIssuesModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
        />
    </div >
);
};

export default Issues;
