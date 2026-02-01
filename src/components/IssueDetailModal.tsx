import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2, Save, Trash2, ShieldCheck, Lightbulb } from 'lucide-react';
import type { ReportedIssue, IssueCategory } from '../types';
import { ISSUE_STATUS, ISSUE_STATUS_OPTIONS, ISSUE_PLATFORMS } from '../constants';
import { updateIssueStatus, updateIssueDetails, addIssueNote, deleteIssue, subscribeToIssueCategories } from '../services/firestoreService';
import { useAuth } from '../hooks/useAuth';

interface IssueDetailModalProps {
    issue: ReportedIssue | null;
    onClose: () => void;
    onUpdate: () => void; // Trigger refetch
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({ issue, onClose, onUpdate }) => {
    const { isAdmin } = useAuth();
    // Debug log to confirm admin status for UI visibility
    // console.log('[IssueDetailModal] isAdmin:', isAdmin);
    const [noteText, setNoteText] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);

    // Registry State
    const [categories, setCategories] = useState<IssueCategory[]>([]);

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

    if (!issue || !localIssue) return null;

    const formatDate = (val: any): string => {
        try {
            if (!val) return 'N/A';
            if (typeof val.toDate === 'function') return val.toDate().toLocaleString();
            if (val instanceof Date) return val.toLocaleString();
            return String(val);
        } catch {
            return 'Invalid Date';
        }
    };

    const handleUpdate = async (updates: Partial<ReportedIssue>) => {
        // Optimistic update
        setLocalIssue(prev => prev ? ({ ...prev, ...updates }) : null);

        try {
            if (updates.status) await updateIssueStatus(issue.id, updates.status);

            // Group detail updates
            const detailUpdates: any = {};
            if (updates.severity) detailUpdates.severity = updates.severity;
            if (updates.type) detailUpdates.type = updates.type;
            if (updates.classification) detailUpdates.classification = updates.classification;
            if (updates.platform) detailUpdates.platform = updates.platform;

            if (Object.keys(detailUpdates).length > 0) {
                await updateIssueDetails(issue.id, detailUpdates);
            }

            onUpdate();
        } catch (error) {
            console.error("Failed to update issue:", error);
            // Revert on failure (could improve this)
            setLocalIssue(issue);
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
                alert("Failed to delete issue");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

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
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">

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
                                    onChange={(e) => handleUpdate({ type: e.target.value as any })}
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
                                                handleUpdate({ type: result.categoryId as any });
                                            }
                                        } else {
                                            alert("AI could not confidently recommend a category based on the available text.");
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
                                onChange={(e) => handleUpdate({ severity: e.target.value as any })}
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
                                    onChange={(e) => handleUpdate({ classification: e.target.value as any })}
                                    className={`w-full bg-slate-900 border text-sm rounded-lg p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors ${(!localIssue.classification || (localIssue.classification as string) === 'unclassified')
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
                    </section>

                    {/* 2. Description (Read-Only) */}
                    <section>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Description / Message</h4>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {localIssue.description || localIssue.message}
                            {localIssue.url && (
                                <div className="mt-4 pt-4 border-t border-slate-800/50">
                                    <a
                                        href={localIssue.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-medium"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        View Context URL
                                    </a>
                                </div>
                            )}
                            {localIssue.attachmentUrl && (
                                <div className="mt-4 pt-4 border-t border-slate-800/50">
                                    <a
                                        href={localIssue.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block relative rounded-lg overflow-hidden border border-slate-800 bg-black/50 hover:border-slate-600 transition-colors"
                                    >
                                        <img
                                            src={localIssue.attachmentUrl}
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

                    {/* 4. Metadata (Read-Only) */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">User</label>
                            <div className="mt-1 text-xs text-slate-400 font-mono truncate" title={localIssue.userId || 'Anonymous'}>
                                {localIssue.userId || 'Anonymous'}
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
