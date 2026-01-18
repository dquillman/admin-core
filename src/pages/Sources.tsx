import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSources, addSource, deleteSource } from '../services/firestoreService';
import { useApp } from '../context/AppContext';
import {
    Globe,
    Plus,
    Trash2,
    Clock,
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    Loader2,
    X,
    Search,
    Filter
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const SourcesPage: React.FC = () => {
    const { appId } = useApp();
    const { isAdmin, loading: authLoading } = useAuth();
    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSource, setNewSource] = useState({ url: '', frequency: 'daily' });
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchSources();
        }
    }, [appId, authLoading, isAdmin]);

    const fetchSources = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const data = await getSources(appId);
            setSources(data);
        } catch (err) {
            console.error("Fetch sources error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSource = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await addSource(appId, newSource);
            setNewSource({ url: '', frequency: 'daily' });
            setShowAddModal(false);
            fetchSources();
        } catch (err) {
            console.error("Add source error:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteSource = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this source?")) return;
        setActionLoading(true);
        try {
            await deleteSource(appId, id);
            fetchSources();
        } catch (err) {
            console.error("Delete source error:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const filteredSources = sources.filter(s =>
        s.url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Sources</h1>
                    <p className="text-slate-400">Monitor external content for updates and changes</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Add New Source
                </button>
            </div>

            {/* Stats/Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Healthy</p>
                        <p className="text-2xl font-bold text-white">{sources.filter(s => s.status === 'ok').length}</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl">
                        <Clock className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Modified</p>
                        <p className="text-2xl font-bold text-white">{sources.filter(s => s.status === 'changed').length}</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-2xl">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Errors</p>
                        <p className="text-2xl font-bold text-white">{sources.filter(s => s.status === 'error').length}</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search sources..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all shadow-xl"
                    />
                </div>
                <button className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all">
                    <Filter className="w-6 h-6" />
                </button>
            </div>

            {/* Sources Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-800">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Source URL</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Frequency</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Last Checked</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredSources.length > 0 ? filteredSources.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4 max-w-md">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                                                <Globe className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <a
                                                href={s.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm font-medium text-white hover:text-brand-400 transition-colors truncate block"
                                            >
                                                {s.url}
                                                <ExternalLink className="w-3 h-3 inline ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider">
                                            {s.frequency}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                            s.status === 'ok' ? "bg-emerald-500/10 text-emerald-500" :
                                                s.status === 'changed' ? "bg-amber-500/10 text-amber-500" :
                                                    "bg-red-500/10 text-red-500"
                                        )}>
                                            {s.status === 'ok' ? <CheckCircle2 className="w-3 h-3" /> :
                                                s.status === 'changed' ? <Clock className="w-3 h-3" /> :
                                                    <AlertCircle className="w-3 h-3" />}
                                            {s.status || 'unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {s.lastCheckedAt?.toDate().toLocaleString() || 'Never'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDeleteSource(s.id)}
                                            className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        No sources found. Add your first one above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Source Modal */}
            {showAddModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-300"
                        onClick={() => setShowAddModal(false)}
                    />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl z-50 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
                            <h2 className="text-xl font-bold text-white">Add New Source</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-all">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSource} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Source URL</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://example.com/api/v1"
                                        value={newSource.url}
                                        onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Check Frequency</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setNewSource({ ...newSource, frequency: 'daily' })}
                                        className={cn(
                                            "py-4 rounded-2xl border transition-all text-sm font-bold uppercase tracking-wider",
                                            newSource.frequency === 'daily' ? "bg-brand-500/10 border-brand-500/50 text-brand-400" : "bg-slate-800 border-transparent text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        Daily
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewSource({ ...newSource, frequency: 'weekly' })}
                                        className={cn(
                                            "py-4 rounded-2xl border transition-all text-sm font-bold uppercase tracking-wider",
                                            newSource.frequency === 'weekly' ? "bg-brand-500/10 border-brand-500/50 text-brand-400" : "bg-slate-800 border-transparent text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        Weekly
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    {actionLoading ? 'Creating...' : 'Create Source Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default SourcesPage;
