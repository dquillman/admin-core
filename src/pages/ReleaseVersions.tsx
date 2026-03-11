import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import {
    Tag,
    Plus,
    AlertTriangle,
    Loader2,
    Trash2
} from 'lucide-react';
import {
    addReleaseVersion,
    updateReleaseVersionStatus,
    deleteReleaseVersion
} from '../services/firestoreService';
import { collection, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeAppValue } from '../constants';
import type { ReleaseVersion, ReleaseVersionStatus } from '../types';

const VERSION_REGEX = /^\d+\.\d{1,2}\.\d+$/;

const STATUS_COLORS: Record<ReleaseVersionStatus, string> = {
    'planned': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'in-progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'released': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const ReleaseVersionsPage: React.FC = () => {
    const { isAdmin, loading: authLoading } = useAuth();
    const { appId } = useApp();
    const [versions, setVersions] = useState<ReleaseVersion[]>([]);
    const [loading, setLoading] = useState(true);

    // Add form
    const [newVersion, setNewVersion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const col = collection(db, 'release_versions');
        const isAll = appId === 'all';
        const norm = isAll ? null : normalizeAppValue(appId);
        // 'all' = no filter; non-exam-coach = server-side filter; exam-coach = client-side filter
        const constraints = (!isAll && norm && norm !== 'exam-coach')
            ? [where('appId', '==', norm), orderBy('version', 'desc')]
            : [orderBy('version', 'desc')];
        const unsubscribe = onSnapshot(query(col, ...constraints), (snapshot) => {
            let vers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseVersion));
            // Client-side filter for exam-coach to catch legacy docs without appId field
            if (!isAll && norm === 'exam-coach') {
                vers = vers.filter(v => normalizeAppValue(v.appId || 'exam-coach') === 'exam-coach');
            }
            setVersions(vers);
            setLoading(false);
        }, (err) => {
            console.error("ReleaseVersions subscription failed:", err);
            setError(`Subscription failed: ${err.message}`);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [isAdmin, appId]);

    const handleAddVersion = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const trimmed = newVersion.trim();
        if (!trimmed) {
            setError('Version is required');
            return;
        }
        if (!VERSION_REGEX.test(trimmed)) {
            setError('Invalid format. Use x.xx.x (e.g. 1.15.1)');
            return;
        }

        setIsSubmitting(true);
        try {
            await addReleaseVersion(trimmed, appId);
            setNewVersion('');
            setSuccess(`Version ${trimmed} added`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to add version');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (versionId: string, status: ReleaseVersionStatus) => {
        try {
            await updateReleaseVersionStatus(versionId, status);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    const handleDelete = async (v: ReleaseVersion) => {
        if (!confirm(`Delete version ${v.version}? This cannot be undone.`)) return;
        try {
            await deleteReleaseVersion(v.id);
            setSuccess(`Version ${v.version} deleted`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to delete version');
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
                <p className="text-red-400 font-bold">Access Restricted</p>
                <p className="text-slate-400 text-sm mt-2">Admin privileges required.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Release Versions</h1>
                <p className="text-slate-400">
                    {appId === 'all'
                        ? 'Viewing release versions across all apps.'
                        : <>Manage release versions for <span className="text-white font-semibold">{appId}</span> used for issue planning (PFV).</>
                    }
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Version List */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-800">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Version</th>
                                    {appId === 'all' && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">App</th>}
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={appId === 'all' ? 5 : 4} className="px-6 py-12 text-center">
                                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : versions.length > 0 ? versions.map((v) => (
                                    <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-4 h-4 text-cyan-400" />
                                                <span className="text-sm font-bold text-white font-mono">{v.version}</span>
                                            </div>
                                        </td>
                                        {appId === 'all' && (
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-slate-400 font-mono">{v.appId || 'exam-coach'}</span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[v.status]}`}>
                                                {v.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {v.createdAt?.toDate?.().toLocaleDateString() || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={v.status}
                                                    onChange={(e) => handleStatusChange(v.id, e.target.value as ReleaseVersionStatus)}
                                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-1.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                                                >
                                                    <option value="planned">Planned</option>
                                                    <option value="in-progress">In Progress</option>
                                                    <option value="released">Released</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDelete(v)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="Delete version"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={appId === 'all' ? 5 : 4} className="px-6 py-12 text-center text-slate-500 italic">
                                            No versions{appId !== 'all' ? ` for ${appId}` : ''}. {appId !== 'all' ? 'Add one to get started.' : 'Select an app to add versions.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add Version Form */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sticky top-8">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-brand-400" />
                            Add Version
                        </h3>

                        {appId === 'all' ? (
                            <p className="text-sm text-slate-500">Select a specific app to add versions.</p>
                        ) : (
                            <form onSubmit={handleAddVersion} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Version Number
                                    </label>
                                    <input
                                        type="text"
                                        value={newVersion}
                                        onChange={(e) => setNewVersion(e.target.value)}
                                        placeholder="1.15.1"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Format: x.xx.x (e.g. 1.15.1, 2.0.0)</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newVersion.trim()}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Create Version
                                </button>
                            </form>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                                {success}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReleaseVersionsPage;
