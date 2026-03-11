import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ExternalLink, Loader2, Save, Trash2, ShieldCheck, Lightbulb } from 'lucide-react';
import type { ReportedIssue, IssueCategory, ReleaseVersion } from '../types';
import { ISSUE_STATUS, ISSUE_STATUS_OPTIONS, ISSUE_PLATFORMS, normalizeAppValue } from '../constants';
import { updateIssueStatus, updateIssueDetails, addIssueNote, deleteIssue, subscribeToIssueCategories, subscribeToReleaseVersions, updateIssuePFV, updateIssueRIV, fetchAllUsersLookup } from '../services/firestoreService';
import { useAuth } from '../hooks/useAuth';

const sanitizeUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return undefined; // reject non-http/https URLs entirely
};

interface IssueDetailModalProps {
    issue: ReportedIssue | null;
    onClose: () => void;
    onUpdate: () => void; // Trigger refetch
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({ issue, onClose, onUpdate }) => {
    const { isAdmin, isSuperAdmin } = useAuth();
    // Debug log to confirm admin status for UI visibility

    const modalRef = useRef<HTMLDivElement>(null);
    const [noteText, setNoteText] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Auto-clear validation error after 5 seconds
    useEffect(() => {
        if (!validationError) return;
        const timer = setTimeout(() => setValidationError(null), 5000);
        return () => clearTimeout(timer);
    }, [validationError]);

    // Registry State
    const [categories, setCategories] = useState<IssueCategory[]>([]);
    const [releaseVersions, setReleaseVersions] = useState<ReleaseVersion[]>([]);

    // User lookup for Reported By dropdown
    const [users, setUsers] = useState<{ uid: string; email: string }[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    // Internal state for immediate UI feedback (Optimistic UI)
    const [localIssue, setLocalIssue] = useState<ReportedIssue | null>(issue);

    useEffect(() => {
        setLocalIssue(issue);
        setNoteText('');
    }, [issue]);

    useEffect(() => {
        const unsubscribe = subscribeToIssueCategories((cats) => setCategories(cats));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Load versions for the issue's app (normalize legacy app names)
        const appId = issue?.app ? normalizeAppValue(issue.app) : undefined;
        const unsubscribe = subscribeToReleaseVersions((versions) => setReleaseVersions(versions), appId);
        return () => unsubscribe();
    }, [issue?.app]);

    useEffect(() => {
        fetchAllUsersLookup()
            .then(setUsers)
            .catch((err) => console.error('Failed to fetch users lookup:', err))
            .finally(() => setLoadingUsers(false));
    }, []);

    // Focus modal on open
    useEffect(() => {
        if (issue) {
            modalRef.current?.focus();
        }
    }, [issue]);

    // Close on Escape key
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    if (!issue || !localIssue) return null;

    const userMap = new Map(users.map(u => [u.uid, u.email]));

    const formatDate = (val: unknown): string => {
        try {
            if (!val) return 'N/A';
            if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') return (val as { toDate: () => Date }).toDate().toLocaleString();
            if (val instanceof Date) return val.toLocaleString();
            return String(val);
        } catch {
            return 'Invalid Date';
        }
    };

    const TERMINAL_STATUSES = [ISSUE_STATUS.FIXED, ISSUE_STATUS.RELEASED, ISSUE_STATUS.CLOSED];

    const handleUpdate = async (updates: Partial<ReportedIssue>) => {
        // Rule: Cannot move status away from 'released' while releasedInVersion is set
        if (
            updates.status &&
            updates.status !== ISSUE_STATUS.RELEASED &&
            localIssue?.releasedInVersion
        ) {
            const msg = 'Cannot change status away from "released" while releasedInVersion is set. Clear RIV first (super-admin required).';
            console.error(msg);
            setValidationError(msg);
            return;
        }

        // Rule: PFV must be set before moving to resolved/released/closed
        if (
            updates.status &&
            TERMINAL_STATUSES.includes(updates.status as typeof TERMINAL_STATUSES[number]) &&
            !localIssue?.plannedForVersion
        ) {
            const msg = 'Planned for Version (PFV) must be set before marking an issue as resolved, released, or closed.';
            console.error(msg);
            setValidationError(msg);
            return;
        }

        // Capture current state before optimistic update for safe revert
        const prevState = localIssue;

        // Optimistic update
        setLocalIssue(prev => prev ? ({ ...prev, ...updates }) : null);

        try {
            if (updates.status) await updateIssueStatus(issue.id, updates.status);

            // Group detail updates
            const detailUpdates: Partial<ReportedIssue> = {};
            if (updates.severity) detailUpdates.severity = updates.severity;
            if (updates.type) detailUpdates.type = updates.type;
            if (updates.classification) detailUpdates.classification = updates.classification;
            if (updates.platform) detailUpdates.platform = updates.platform;
            if ('userId' in updates) detailUpdates.userId = updates.userId;

            if (Object.keys(detailUpdates).length > 0) {
                await updateIssueDetails(issue.id, detailUpdates);
            }

            onUpdate();
        } catch (error) {
            console.error("Failed to update issue:", error);
            // Revert to previous local state, not the issue prop
            setLocalIssue(prevState);
        }
    };

    const handleSaveNote = async () => {
        if (!noteText.trim()) return;
        setSubmittingNote(true);
        try {
            await addIssueNote(issue.id, noteText);
            setNoteText('');
            onUpdate(); // This should fetch the new note
        } catch (error) {
            console.error("Failed to save note:", error);
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this issue?')) {
            try {
                await deleteIssue(issue.id);
                onUpdate();
                onClose();
            } catch (error) {
                console.error("Failed to delete issue:", error);
                setValidationError('Failed to delete issue. Please try again.');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div ref={modalRef} tabIndex={-1} onKeyDown={handleKeyDown} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl outline-none" onClick={e => e.stopPropagation()}>

                {/* Header: ID & Close */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className={`text-xl font-mono font-bold ${(!localIssue.displayId || localIssue.displayId === 'ID_MISSING') ? 'text-slate-500 animate-pulse' : 'text-brand-400'}`}>
                                {(!localIssue.displayId || localIssue.displayId === 'ID_MISSING') ? 'Assigning ID...' : localIssue.displayId}
                            </span>
                            <span className="text-sm text-slate-500 font-medium px-2 py-0.5 rounded border border-slate-700 bg-slate-800">
                                {localIssue.id}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500">
                            Created: {formatDate(localIssue.timestamp || localIssue.createdAt)}
                        </div>
                        {/* Version badges — match what issue cards show */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {localIssue.plannedForVersion && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                                    PFV: {localIssue.plannedForVersion}
                                </span>
                            )}
                            {localIssue.releasedInVersion && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                    RIV: {localIssue.releasedInVersion}
                                </span>
                            )}
                            {localIssue.severity && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    localIssue.severity === 'S1' ? 'border-red-500/20 bg-red-500/10 text-red-400' :
                                    localIssue.severity === 'S2' ? 'border-orange-500/20 bg-orange-500/10 text-orange-400' :
                                    localIssue.severity === 'S3' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' :
                                    'border-slate-500/20 bg-slate-500/10 text-slate-400'
                                }`}>
                                    {localIssue.severity}
                                </span>
                            )}
                            {localIssue.status && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-600/30 bg-slate-700/30 text-slate-300">
                                    {localIssue.status}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Validation Error Banner */}
                    {validationError && (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            <span>{validationError}</span>
                            <button
                                onClick={() => setValidationError(null)}
                                className="shrink-0 text-red-400 hover:text-red-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* 1. Critical Control Panel (Type, Sev, Status, Class) */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/50 p-5 rounded-xl border border-slate-800/50">
                        {/* Type */}
                        <div className="relative group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                Type (Category)
                                <span className="bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Admin
                                </span>
                            </label>

                            <div className="flex gap-2">
                                <select
                                    value={(localIssue.type && categories.some(c => c.id === localIssue.type)) ? localIssue.type : 'Uncategorized'}
                                    onChange={(e) => handleUpdate({ type: e.target.value })}
                                    disabled={!isAdmin}
                                    className={`flex-1 bg-slate-900 border text-slate-200 text-sm rounded-lg p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors shadow-[0_0_10px_rgba(59,130,246,0.05)] ${!isAdmin ? 'opacity-50 cursor-not-allowed border-slate-700' : 'border-brand-500/30'}`}
                                >
                                    {categories.filter(c => c.status === 'active' || c.id === localIssue.type).map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.label} {cat.status === 'deprecated' ? '(Deprecated)' : ''}
                                        </option>
                                    ))}
                                    <option value="Uncategorized">Category not listed (Uncategorized)</option>
                                </select>

                                {/* AI Recommendation Control */}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const { analyzeIssue } = await import('../services/suggestionService');
                                        // Gather context
                                        const notesText = localIssue.notes?.map(n => n.text).join(' ') || '';
                                        const result = analyzeIssue(localIssue, categories, notesText);

                                        if (result) {
                                            const cat = categories.find(c => c.id === result.categoryId);
                                            if (window.confirm(`AI Recommendation:\n\nCategory: ${cat?.label || result.categoryId}\nConfidence: ${result.confidence}%\nReasons: ${result.reasons.join(', ')}\n\nApply this category?`)) {
                                                handleUpdate({ type: result.categoryId });
                                            }
                                        } else {
                                            const msg = 'AI could not confidently recommend a category based on the available text.';
                                            console.error(msg);
                                            setValidationError(msg);
                                        }
                                    }}
                                    className="shrink-0 bg-brand-600 hover:bg-brand-500 text-white border border-brand-500 px-3 rounded-lg transition-colors flex items-center justify-center min-w-[40px] shadow-lg shadow-brand-500/20"
                                    title="Recommend Category (AI)"
                                >
                                    <ShieldCheck className="w-5 h-5" />
                                </button>

                            </div>
                        </div>

                        {/* Severity */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Severity</label>
                            <select
                                value={localIssue.severity || 'S3'}
                                onChange={(e) => handleUpdate({ severity: e.target.value as ReportedIssue['severity'] })}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                            >
                                <option value="S1">S1 (Critical) - Blocking</option>
                                <option value="S2">S2 (High) - Major Functionality</option>
                                <option value="S3">S3 (Medium) - Minor/Cosmetic</option>
                                <option value="S4">S4 (Low) - Nice to have</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                            <select
                                value={localIssue.status || ISSUE_STATUS.NEW}
                                onChange={(e) => handleUpdate({ status: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                            >
                                {ISSUE_STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Classification */}
                        <div>

                            {/* AI Severity Control */}
                            <button
                                type="button"
                                onClick={async () => {
                                    const { analyzeSeverity } = await import('../services/suggestionService');
                                    const result = analyzeSeverity(localIssue);
                                    if (window.confirm(
                                        `AI Recommendation:\n\n` +
                                        `Severity: ${result.severity}\n` +
                                        `Classification: ${result.classification}\n\n` +
                                        `Confidence: ${result.confidence}%\n` +
                                        `Reason: ${result.reasons.join(', ')}\n\n` +
                                        `Apply this classification?`
                                    )) {
                                        handleUpdate({
                                            severity: result.severity,
                                            classification: result.classification
                                        });
                                    }
                                }}
                                className="mb-2 w-full text-xs flex items-center justify-center gap-2 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded transition-colors"
                            >
                                <Lightbulb className="w-3 h-3" /> Evaluate Severity (AI)
                            </button>

                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Classification <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={localIssue.classification || 'unclassified'}
                                    onChange={(e) => handleUpdate({ classification: e.target.value as ReportedIssue['classification'] })}
                                    className={`w-full bg-slate-900 border text-sm rounded-lg p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors ${(!localIssue.classification || localIssue.classification === 'unclassified')
                                        ? 'border-amber-500/50 text-amber-500'
                                        : 'border-slate-700 text-slate-200'
                                        }`}
                                >
                                    <option value="unclassified">⚠️ Unclassified</option>
                                    <option value="blocking">Blocking</option>
                                    <option value="misleading">Misleading</option>
                                    <option value="trust">Trust Issue</option>
                                    <option value="cosmetic">Cosmetic</option>
                                </select>
                            </div>
                        </div>

                        {/* Planned for Version (PFV) */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Planned for Version (PFV)
                            </label>
                            <select
                                value={localIssue.plannedForVersion || ''}
                                onChange={(e) => {
                                    const newPFV = e.target.value || null;
                                    const prevPFV = localIssue.plannedForVersion || null;
                                    const prevState = localIssue;
                                    setLocalIssue(prev => prev ? ({ ...prev, plannedForVersion: newPFV }) : null);
                                    updateIssuePFV(issue.id, prevPFV, newPFV).then(() => {
                                        onUpdate();
                                    }).catch((err) => {
                                        console.error("Failed to update PFV:", err);
                                        setLocalIssue(prevState);
                                        setValidationError(err instanceof Error ? err.message : 'Failed to update PFV.');
                                    });
                                }}
                                disabled={!isAdmin}
                                className={`w-full bg-slate-900 border text-sm rounded-lg p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors ${!isAdmin ? 'opacity-50 cursor-not-allowed border-slate-700' : 'border-slate-700 text-slate-200'}`}
                            >
                                <option value="">Not planned</option>
                                {localIssue.plannedForVersion && !releaseVersions.some(v => v.version === localIssue.plannedForVersion) && (
                                    <option value={localIssue.plannedForVersion}>{localIssue.plannedForVersion} (unlinked)</option>
                                )}
                                {releaseVersions
                                    .filter(v => v.status !== 'released' || v.version === localIssue.plannedForVersion)
                                    .map(v => (
                                        <option key={v.id} value={v.version}>
                                            {v.version} ({v.status})
                                        </option>
                                    ))}
                            </select>
                            <p className="text-[10px] text-slate-500 mt-1">Version where this fix is planned to ship.</p>
                        </div>

                        {/* Released In Version (RIV) */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                Released In Version (RIV)
                                {localIssue.releasedInVersion && !isSuperAdmin && (
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded">
                                        Read-only
                                    </span>
                                )}
                            </label>
                            {localIssue.status === ISSUE_STATUS.RELEASED && !localIssue.releasedInVersion && (
                                <p className="text-xs text-amber-400 font-medium mb-2">
                                    ⚠️ Status is "released" — releasedInVersion must be set.
                                </p>
                            )}
                            <select
                                value={localIssue.releasedInVersion || ''}
                                onChange={(e) => {
                                    const newRIV = e.target.value || null;
                                    const prevRIV = localIssue.releasedInVersion || null;

                                    // Rule: RIV can only be set when status is 'released'
                                    if (newRIV && localIssue.status !== ISSUE_STATUS.RELEASED) {
                                        const msg = 'releasedInVersion can only be set when status is "released".';
                                        console.error(msg);
                                        setValidationError(msg);
                                        return;
                                    }

                                    // Rule: RIV cannot be changed if already set, unless super-admin
                                    if (prevRIV && !isSuperAdmin) {
                                        const msg = 'releasedInVersion is read-only once set. Super-admin access required to modify.';
                                        console.error(msg);
                                        setValidationError(msg);
                                        return;
                                    }

                                    const prevState = localIssue;
                                    setLocalIssue(prev => prev ? ({ ...prev, releasedInVersion: newRIV }) : null);
                                    updateIssueRIV(issue.id, prevRIV, newRIV).then(() => {
                                        onUpdate();
                                    }).catch((err) => {
                                        console.error("Failed to update RIV:", err);
                                        setLocalIssue(prevState);
                                        setValidationError(err instanceof Error ? err.message : 'Failed to update RIV.');
                                    });
                                }}
                                disabled={
                                    !isAdmin ||
                                    localIssue.status !== ISSUE_STATUS.RELEASED ||
                                    (!!localIssue.releasedInVersion && !isSuperAdmin)
                                }
                                className={`w-full bg-slate-900 border text-sm rounded-lg p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors ${
                                    (!isAdmin || localIssue.status !== ISSUE_STATUS.RELEASED || (!!localIssue.releasedInVersion && !isSuperAdmin))
                                        ? 'opacity-50 cursor-not-allowed border-slate-700'
                                        : (localIssue.status === ISSUE_STATUS.RELEASED && !localIssue.releasedInVersion)
                                            ? 'border-amber-500/50 text-amber-500'
                                            : 'border-slate-700 text-slate-200'
                                }`}
                            >
                                <option value="">Not released</option>
                                {localIssue.releasedInVersion && !releaseVersions.some(v => v.version === localIssue.releasedInVersion) && (
                                    <option value={localIssue.releasedInVersion}>{localIssue.releasedInVersion} (unlinked)</option>
                                )}
                                {releaseVersions.map(v => (
                                    <option key={v.id} value={v.version}>
                                        {v.version} ({v.status})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-500 mt-1">
                                {(!!localIssue.releasedInVersion && !isSuperAdmin)
                                    ? 'Locked — contact super-admin to modify.'
                                    : localIssue.status !== ISSUE_STATUS.RELEASED
                                        ? 'Only available when status is "released".'
                                        : 'Version this fix shipped in.'}
                            </p>
                        </div>
                    </section>

                    {/* 2. Description (Read-Only) */}
                    <section>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Description / Message</h4>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {localIssue.description || localIssue.message}
                            {sanitizeUrl(localIssue.url) && (
                                <div className="mt-4 pt-4 border-t border-slate-800/50">
                                    <a
                                        href={sanitizeUrl(localIssue.url)!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-medium"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        View Context URL
                                    </a>
                                </div>
                            )}
                            {sanitizeUrl(localIssue.attachmentUrl) && (
                                <div className="mt-4 pt-4 border-t border-slate-800/50">
                                    <a
                                        href={sanitizeUrl(localIssue.attachmentUrl)!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block relative rounded-lg overflow-hidden border border-slate-800 bg-black/50 hover:border-slate-600 transition-colors"
                                    >
                                        <img
                                            src={sanitizeUrl(localIssue.attachmentUrl)!}
                                            alt="Attachment"
                                            className="max-h-64 object-contain mx-auto"
                                        />
                                    </a>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 3. Admin Notes (Editable / Log) */}
                    <section className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                        <div className="bg-slate-950/50 p-3 border-b border-slate-800 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Save className="w-4 h-4" /> Admin Notes (Internal)
                            </h4>
                            <span className="text-xs text-slate-600">{localIssue.notes?.length || 0} notes</span>
                        </div>

                        {/* History */}
                        <div className="max-h-48 overflow-y-auto p-4 space-y-3 bg-slate-950/30">
                            {localIssue.notes && localIssue.notes.length > 0 ? (
                                localIssue.notes.map((note, idx) => (
                                    <div key={idx} className="text-sm border-l-2 border-slate-700 pl-3 py-1">
                                        <div className="text-slate-300 whitespace-pre-wrap">{note.text}</div>
                                        <div className="text-xs text-slate-600 mt-1 flex gap-2">
                                            <span>{formatDate(note.createdAt)}</span>
                                            {/* Could show author here if we resolved uid */}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-slate-600 italic text-center py-2">No internal notes yet.</div>
                            )}
                        </div>

                        {/* Add New */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900">
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Add a new internal note..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 min-h-[80px]"
                            />
                            <div className="flex justify-between items-center mt-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setNoteText(prev => prev + (prev ? '\n' : '') + "VERDICT: ")}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded"
                                    >
                                        + Verdict
                                    </button>
                                    <button
                                        onClick={() => setNoteText(prev => prev + (prev ? '\n' : '') + "TODO: ")}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded"
                                    >
                                        + Todo
                                    </button>
                                </div>
                                <button
                                    onClick={handleSaveNote}
                                    disabled={!noteText.trim() || submittingNote}
                                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Note
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Telemetry (Auto-Captured) */}
                    {(localIssue.environment || localIssue.os || localIssue.browser || localIssue.submittedFrom) && (
                        <section className="pt-4 border-t border-slate-800">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Telemetry</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {localIssue.version && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">App Version</label>
                                        <div className="mt-1 text-xs text-slate-400 font-mono">{localIssue.version}</div>
                                    </div>
                                )}
                                {localIssue.environment && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Environment</label>
                                        <div className="mt-1 text-xs text-slate-400 font-mono">{localIssue.environment}</div>
                                    </div>
                                )}
                                {localIssue.os && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">OS</label>
                                        <div className="mt-1 text-xs text-slate-400 font-mono">{localIssue.os}</div>
                                    </div>
                                )}
                                {localIssue.browser && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Browser</label>
                                        <div className="mt-1 text-xs text-slate-400 font-mono">{localIssue.browser}</div>
                                    </div>
                                )}
                                {localIssue.submittedFrom && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Submitted From</label>
                                        <div className="mt-1 text-xs text-slate-400 font-mono">{localIssue.submittedFrom}</div>
                                    </div>
                                )}
                                {localIssue.platform && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Device Type</label>
                                        <div className="mt-1 text-xs text-slate-400 font-mono">{localIssue.platform}</div>
                                    </div>
                                )}
                                {(localIssue.examName || localIssue.examId) && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Exam</label>
                                        <div className="mt-1 text-xs text-slate-400 font-mono">{localIssue.examName || localIssue.examId}</div>
                                    </div>
                                )}
                            </div>
                            {localIssue.userAgent && (
                                <details className="mt-3">
                                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">Raw User Agent</summary>
                                    <div className="mt-1 text-xs text-slate-500 font-mono bg-slate-950 p-2 rounded border border-slate-800 break-all">
                                        {localIssue.userAgent}
                                    </div>
                                </details>
                            )}
                        </section>
                    )}

                    {/* 4. Metadata (Read-Only) */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Reported By</label>
                            <div className="mt-1">
                                {isAdmin ? (
                                    <select
                                        value={localIssue.userId || ''}
                                        onChange={(e) => handleUpdate({ userId: e.target.value || null })}
                                        disabled={loadingUsers}
                                        className="bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded px-2 py-1 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 w-full"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(u => (
                                            <option key={u.uid} value={u.uid}>{u.email || u.uid}</option>
                                        ))}
                                        {localIssue.userId && !userMap.has(localIssue.userId) && (
                                            <option value={localIssue.userId}>Unknown user ({localIssue.userId})</option>
                                        )}
                                    </select>
                                ) : (
                                    <div className="text-xs text-slate-400 font-mono truncate" title={localIssue.userId || 'Anonymous'}>
                                        {(localIssue.userId && userMap.has(localIssue.userId)) ? userMap.get(localIssue.userId) : (localIssue.userId || 'Anonymous')}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Platform</label>
                            <div className="mt-1">
                                {isAdmin ? (
                                    <select
                                        value={localIssue.platform || ''}
                                        onChange={(e) => handleUpdate({ platform: e.target.value })}
                                        className="bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded px-2 py-1 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 w-full"
                                    >
                                        <option value="">Unknown</option>
                                        {Object.values(ISSUE_PLATFORMS).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="text-xs text-slate-400">{localIssue.platform || 'N/A'}</div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Version</label>
                            <div className="mt-1 text-xs text-slate-400 font-mono">
                                {localIssue.version || 'Unknown'}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Path</label>
                            <div className="mt-1 text-xs text-slate-400 font-mono truncate" title={localIssue.path || 'N/A'}>
                                {localIssue.path || 'N/A'}
                            </div>
                        </div>
                    </section>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center rounded-b-2xl">
                    <button
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-400 text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" /> Delete Issue
                    </button>
                    <div className="text-xs text-slate-500">
                        Changes are saved automatically
                    </div>
                </div>
            </div >
        </div >
    );
};
