import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { AlertCircle, Users, CheckCircle, Mail, Save, RefreshCw } from 'lucide-react';

const Broadcast = () => {
    const { user } = useAuth();
    const [audience, setAudience] = useState<'testers' | 'all'>('testers');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isLoadingCount, setIsLoadingCount] = useState(false);
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [drafts, setDrafts] = useState<any[]>([]);
    const [loadedDraft, setLoadedDraft] = useState<any | null>(null);

    // Fetch Drafts
    React.useEffect(() => {
        const fetchDrafts = async () => {
            try {
                const q = query(
                    collection(db, 'broadcast_drafts'),
                    orderBy('createdAt', 'desc'),
                    limit(20)
                );
                const snapshot = await getDocs(q);
                setDrafts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Failed to fetch drafts", err);
            }
        };
        fetchDrafts();
    }, [result]); // Re-fetch when a new result (save) occurs

    // Fetch Audience Count (Client-Side Safe Mode)
    const checkAudienceSize = React.useCallback(async (aud: string) => {
        setIsLoadingCount(true);
        setRecipientCount(null);
        try {
            const usersRef = collection(db, 'users');

            // Note: For 600 users, fetching all and filtering is acceptable for admin tool.
            // We use basic queries to approximate or fetch-all for safety.

            const snapshot = await getDocs(usersRef);
            const users = snapshot.docs.map(d => d.data());

            let count = 0;
            if (aud === 'testers') {
                // Strictly match Users Page logic: testerOverride is the primary flag
                count = users.filter((u: any) => u.testerOverride === true).length;
            } else if (aud === 'all') {
                // All non-admin users
                count = users.filter((u: any) => u.role !== 'admin').length;
            }

            setRecipientCount(count);
        } catch (err) {
            console.error("Failed to fetch audience size", err);
        } finally {
            setIsLoadingCount(false);
        }
    }, []);

    // Trigger count check when audience changes
    React.useEffect(() => {
        // We auto-calculate on switch, but also provide the manual button as requested.
        checkAudienceSize(audience);
    }, [audience, checkAudienceSize]);

    const handleSaveDraft = async () => {
        if (!subject || !message) return;

        setIsSaving(true);
        setResult(null);

        try {
            await addDoc(collection(db, 'broadcast_drafts'), {
                audience,
                subject,
                body: message,
                recipientCount,
                status: 'draft',
                createdBy: user?.uid,
                creatorEmail: user?.email,
                createdAt: serverTimestamp()
            });

            setResult({
                success: true,
                message: "Draft saved successfully. No emails were sent."
            });
        } catch (err: any) {
            console.error(err);
            setResult({ success: false, message: 'Failed to save draft.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Header / Context */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg text-slate-300">
                <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    Broadcast Email (Draft Mode)
                </h2>
                <p className="text-sm text-slate-400">
                    Prepare notifications for users.
                    <span className="text-emerald-400 block mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Safe Mode Active: Emails are NOT sent. Drafts are saved to database.
                    </span>
                </p>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left: Inputs */}
                <div className="md:col-span-2 space-y-4">

                    {/* Loaded Draft Context */}
                    {loadedDraft && (
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded px-3 py-2 flex items-center justify-between text-xs mb-2">
                            <span className="text-slate-400">
                                Editing draft from <strong className="text-slate-300">{loadedDraft.creatorEmail}</strong>
                            </span>
                            <span className="text-slate-500">
                                Created {loadedDraft.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}
                            </span>
                        </div>
                    )}

                    {/* Audience */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Audience</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setAudience('testers')}
                                className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors ${audience === 'testers'
                                    ? 'bg-indigo-950/30 border-indigo-500 text-indigo-200'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Testers
                                </span>
                                {audience === 'testers' && <CheckCircle className="w-4 h-4" />}
                            </button>

                            <button
                                onClick={() => setAudience('all')}
                                className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors ${audience === 'all'
                                    ? 'bg-indigo-950/30 border-indigo-500 text-indigo-200'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    All Users
                                </span>
                                {audience === 'all' && <CheckCircle className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Audience Count Preview */}
                        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-3 mt-2">
                            <div className="text-sm text-slate-400">
                                {isLoadingCount ? (
                                    <span className="animate-pulse">Calculating...</span>
                                ) : (
                                    recipientCount !== null && (
                                        <span>This message would be sent to <strong className="text-white">{recipientCount}</strong> users</span>
                                    )
                                )}
                            </div>

                            <button
                                onClick={() => checkAudienceSize(audience)}
                                className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Preview Recipients
                            </button>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="e.g., New Feature: Study Plans Available"
                        />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Message Body</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={8}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="Write your message here..."
                        />
                        <p className="text-xs text-slate-500 text-right">Plain text, newlines converted to &lt;br&gt;</p>
                    </div>

                </div>

                {/* Right: Actions */}
                <div className="space-y-6">

                    {/* Status Card */}
                    {result && (
                        <div className={`p-4 rounded-lg border ${result.success
                            ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-red-950/20 border-red-500/50 text-red-300'
                            }`}>
                            <h4 className="font-semibold text-sm mb-1">{result.success ? 'Draft Saved' : 'Error'}</h4>
                            <p className="text-xs opacity-90">{result.message}</p>
                        </div>
                    )}

                    {/* Save Draft */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">Actions</h3>

                        <button
                            onClick={handleSaveDraft}
                            disabled={isSaving || !subject || !message}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20"
                        >
                            <Save className="w-3 h-3" />
                            {isSaving ? 'Saving...' : 'Save Draft (stored safely)'}
                        </button>

                        <p className="text-xs text-slate-500 mt-3 text-center">
                            Drafts are saved to the system but cannot be reopened yet.
                        </p>
                    </div>

                    {/* Saved Drafts List (Read-Only) */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-3">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                            Saved Drafts (Read-Only)
                        </h3>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {drafts.length === 0 ? (
                                <p className="text-xs text-slate-500 italic text-center py-4">No saved drafts yet.</p>
                            ) : (
                                drafts.map((draft) => (
                                    <div
                                        key={draft.id}
                                        onClick={() => {
                                            setSubject(draft.subject);
                                            setMessage(draft.body);
                                            setAudience(draft.audience as any);
                                            setLoadedDraft(draft);
                                        }}
                                        className="p-3 rounded bg-slate-950 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all group"
                                    >
                                        <p className="text-sm font-medium text-slate-300 truncate group-hover:text-indigo-300">
                                            {draft.subject || '(No Subject)'}
                                        </p>
                                        <div className="flex flex-col gap-1 mt-2 text-[10px] text-slate-500">
                                            <div className="flex justify-between">
                                                <span>By: {draft.creatorEmail || 'Unknown'}</span>
                                                <span>{draft.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default Broadcast;
