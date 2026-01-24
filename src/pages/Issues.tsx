import React, { useState, useEffect, useMemo } from 'react';
import { getReportedIssues, addIssueNote, updateIssueStatus, deleteIssue, updateIssueDetails } from '../services/firestoreService';
import type { ReportedIssue } from '../types';

import {
    AlertCircle,
    Calendar,
    User,
    ExternalLink,
    Plus,
    X,
    Loader2,
    Filter,
    ArrowUpDown,
    RefreshCw
} from 'lucide-react';

const Issues: React.FC = () => {
    const [issues, setIssues] = useState<ReportedIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<ReportedIssue | null>(null);
    const [noteText, setNoteText] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);

    // Filter & Sort State
    const [filterApp, setFilterApp] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [searchUser, setSearchUser] = useState<string>('');
    const [filterClassification, setFilterClassification] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'severity_desc' | 'severity_asc' | 'type_asc' | 'type_desc' | 'classification_risk'>('newest');

    useEffect(() => {
        fetchIssues();
    }, []);

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

    const fetchIssues = async () => {
        setLoading(true);
        const data = await getReportedIssues(100);
        setIssues(data);
        setLoading(false);
    };

    // Derived State: Unique Apps for Filter Dropdown
    const uniqueApps = useMemo(() => {
        const apps = new Set(issues.map(i => i.app).filter(Boolean));
        return Array.from(apps).sort();
    }, [issues]);

    // Filter Logic
    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            if (issue.deleted) return false; // Filter out soft-deleted issues
            if (filterApp !== 'all' && issue.app !== filterApp) return false;

            const issueStatus = issue.status || 'new';
            if (filterStatus !== 'all' && issueStatus !== filterStatus) return false;

            if (filterType !== 'all' && issue.type !== filterType) return false;

            if (filterClassification !== 'all') {
                if (filterClassification === 'unclassified' && issue.classification) return false;
                if (filterClassification !== 'unclassified' && issue.classification !== filterClassification) return false;
            }

            const severity = issue.severity || 'S3';
            if (filterSeverity !== 'all' && severity !== filterSeverity) return false;

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

            const dateA = getMillis(a);
            const dateB = getMillis(b);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [issues, filterApp, filterType, filterStatus, filterSeverity, filterClassification, searchUser, sortOrder]);

    const handleAddNoteClick = (issue: ReportedIssue) => {
        setSelectedIssue(issue);
        setNoteText('');
        setIsNoteModalOpen(true);
    };

    const submitNote = async () => {
        if (!selectedIssue || !noteText.trim()) return;

        setSubmittingNote(true);
        try {
            await addIssueNote(selectedIssue.id, noteText);
            // Optimistic update or refetch
            await fetchIssues();
            setIsNoteModalOpen(false);
        } catch (error) {
            console.error("Failed to add note", error);
        } finally {
            setSubmittingNote(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'bug': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'confusion': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'feedback': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'ux': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'accessibility': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
            case 'tutor-gap': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
            case 'mobile': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            default: return 'bg-slate-800 text-slate-400';
        }
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
                    <option value="new">New</option>
                    <option value="working">Working</option>
                    <option value="fixed">Fixed</option>
                    <option value="released">Released</option>
                    <option value="closed">Closed</option>
                </select>

                {/* Type Filter */}
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-auto p-2.5"
                >
                    <option value="all">All Types</option>
                    <option value="bug">Bug</option>
                    <option value="confusion">Confusion</option>
                    <option value="feedback">Feedback</option>
                    <option value="ux">UX</option>
                    <option value="accessibility">Accessibility</option>
                    <option value="tutor-gap">Tutor Gap</option>
                    <option value="mobile">Mobile</option>
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
                        <option value="severity_desc">Severity (High → Low)</option>
                        <option value="severity_asc">Severity (Low → High)</option>
                        <option value="classification_risk">Risk (Classification)</option>
                        <option value="type_asc">Type (A → Z)</option>
                        <option value="type_desc">Type (Z → A)</option>
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
                                    <div className="flex gap-2">
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(issue.type)} capitalize`}>
                                            {issue.type}
                                        </div>
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(issue.severity)}`}>
                                            {issue.severity || 'S3'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            {formatDate(issue.timestamp || issue.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <User className="w-4 h-4" />
                                        <span className="truncate max-w-[150px]" title={issue.userId || 'Anonymous'}>
                                            {issue.userId ? issue.userId.slice(0, 8) + '...' : 'Anonymous'}
                                        </span>
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
                                        <button
                                            onClick={() => handleAddNoteClick(issue)}
                                            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors px-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Note
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Note Modal */}
            {isNoteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Add Note</h3>
                            <button onClick={() => setIsNoteModalOpen(false)} className="text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* ... existing note logic ... */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <button
                                    onClick={() => setNoteText(prev => prev + (prev.length > 0 ? '\n\n' : '') + `OPERATOR NOTE:\nVerdict: \nSeverity: \nImpact: \nRecommendation: `)}
                                    className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                                >
                                    + Insert Operator Template
                                </button>
                            </div>
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Enter internal note..."
                                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white font-medium">Cancel</button>
                                <button onClick={submitNote} disabled={!noteText.trim() || submittingNote} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                                    {submittingNote && <Loader2 className="w-4 h-4 animate-spin" />} Save Note
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {selectedIssue && !isNoteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedIssue(null)}>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <h3 className="text-xl font-bold text-white">Issue Details</h3>
                            <button onClick={() => setSelectedIssue(null)} className="text-slate-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                                    <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(selectedIssue.type)} capitalize`}>
                                        {selectedIssue.type}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Severity</label>
                                        <select
                                            value={selectedIssue.severity || 'S3'}
                                            onChange={async (e) => {
                                                const newSev = e.target.value;
                                                // Optimistic
                                                setSelectedIssue(prev => prev ? ({ ...prev, severity: newSev } as any) : null);
                                                try {
                                                    await updateIssueDetails(selectedIssue.id, { severity: newSev });
                                                    fetchIssues();
                                                } catch (err) {
                                                    console.error("Failed to update severity", err);
                                                }
                                            }}
                                            className="mt-1 block w-full bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg p-1.5 focus:ring-brand-500 focus:border-brand-500"
                                        >
                                            <option value="S1">S1 (Critical)</option>
                                            <option value="S2">S2 (High)</option>
                                            <option value="S3">S3 (Medium)</option>
                                            <option value="S4">S4 (Low)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classification</label>
                                        <select
                                            value={selectedIssue.classification || ''}
                                            onChange={async (e) => {
                                                const newClass = e.target.value;
                                                // Optimistic update
                                                setSelectedIssue(prev => prev ? ({ ...prev, classification: newClass } as any) : null);
                                                try {
                                                    await updateIssueDetails(selectedIssue.id, { classification: newClass });
                                                    fetchIssues();
                                                } catch (err) {
                                                    console.error("Failed to update classification", err);
                                                }
                                            }}
                                            className="mt-1 block w-full bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg p-1.5 focus:ring-brand-500 focus:border-brand-500"
                                        >
                                            <option value="">Unclassified</option>
                                            <option value="blocking">Blocking</option>
                                            <option value="misleading">Misleading</option>
                                            <option value="trust">Trust</option>
                                            <option value="cosmetic">Cosmetic</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Edit Type</label>
                                    <select
                                        value={selectedIssue.type}
                                        onChange={async (e) => {
                                            const newType = e.target.value;
                                            // Optimistic
                                            setSelectedIssue(prev => prev ? ({ ...prev, type: newType } as any) : null);
                                            try {
                                                await updateIssueDetails(selectedIssue.id, { type: newType });
                                                fetchIssues();
                                            } catch (err) {
                                                console.error("Failed to update type", err);
                                            }
                                        }}
                                        className="mt-1 block w-full bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg p-1.5 focus:ring-brand-500 focus:border-brand-500"
                                    >
                                        <option value="bug">Bug</option>
                                        <option value="confusion">Confusion</option>
                                        <option value="feedback">Feedback</option>
                                        <option value="ux">UX</option>
                                        <option value="accessibility">Accessibility</option>
                                        <option value="tutor-gap">Tutor Gap</option>
                                        <option value="mobile">Mobile</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                                <select
                                    value={selectedIssue.status || 'new'}
                                    onChange={async (e) => {
                                        const newStatus = e.target.value;
                                        try {
                                            await updateIssueStatus(selectedIssue.id, newStatus);
                                            setSelectedIssue(prev => prev ? ({ ...prev, status: newStatus }) : null);
                                            fetchIssues(); // Refresh list
                                        } catch (err) {
                                            console.error("Failed to update status", err);
                                        }
                                    }}
                                    className="mt-1 block w-full bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg p-1.5 focus:ring-brand-500 focus:border-brand-500"
                                >
                                    <option value="new">New</option>
                                    <option value="working">Working</option>
                                    <option value="fixed">Fixed</option>
                                    <option value="released">Released</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">User ID</label>
                                <div className="mt-1 text-slate-300 font-mono text-sm">{selectedIssue.userId || 'Anonymous'}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                <div className="mt-1 text-slate-300">{selectedIssue.userEmail || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">App Version</label>
                                <div className="mt-1 text-slate-300 font-mono text-sm">{selectedIssue.version || 'Unknown'}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Path</label>
                                <div className="mt-1 text-slate-300 font-mono text-sm">{selectedIssue.path || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</label>
                                <div className="mt-1 text-slate-300">
                                    {formatDate(selectedIssue.timestamp || selectedIssue.createdAt)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description / Message</label>
                        <div className="mt-2 p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 whitespace-pre-wrap">
                            {selectedIssue.description || selectedIssue.message}
                        </div>
                    </div>

                    {selectedIssue.url && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Context URL</label>
                            <div className="mt-1">
                                <a href={selectedIssue.url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 break-all">
                                    {selectedIssue.url}
                                </a>
                            </div>
                        </div>
                    )}

                    {selectedIssue.attachmentUrl && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attachment / Screenshot</label>
                            <div className="mt-2">
                                <a href={selectedIssue.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-800">
                                    <img
                                        src={selectedIssue.attachmentUrl}
                                        alt="Issue Attachment"
                                        className="w-full h-auto max-h-[300px] object-contain bg-slate-950"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="p-4 block text-slate-500 italic">Failed to load image (Click to open)</span>`;
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-medium flex items-center gap-2">
                                            <ExternalLink className="w-4 h-4" />
                                            Open Original
                                        </span>
                                    </div>
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Raw JSON Toggle for Debugging */}
                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                        <details>
                            <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400">View Raw JSON</summary>
                            <pre className="mt-2 p-4 bg-slate-950 rounded-xl overflow-x-auto text-xs font-mono text-slate-500 w-full max-w-lg">
                                {JSON.stringify(selectedIssue, (key, value) => {
                                    if (key === 'createdAt' || key === 'timestamp') return 'Timestamp(...)';
                                    return value;
                                }, 2)}
                            </pre>
                        </details>

                        <button
                            type="button"
                            onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("Delete button clicked for issue:", selectedIssue.id);

                                if (window.confirm('Are you sure you want to delete this issue?')) {
                                    try {
                                        console.log("Attempting delete...");
                                        await deleteIssue(selectedIssue.id);
                                        console.log("Delete successful");

                                        setSelectedIssue(null);
                                        fetchIssues();
                                    } catch (err: any) {
                                        console.error("Failed to delete", err);
                                        alert(`Failed to delete issue: ${err.message || 'Unknown Error'}. Check console for details.`);
                                    }
                                }
                            }}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wider rounded-lg border border-red-500/20 transition-colors cursor-pointer"
                        >
                            Delete Issue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Issues;
