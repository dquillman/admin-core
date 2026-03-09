import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader2,
    Workflow,
    Plus,
    ToggleLeft,
    ToggleRight,
    Clock,
    Play,
    X,
} from 'lucide-react';
import {
    getWorkflows,
    createWorkflow,
    toggleWorkflow,
} from '../services/gameForgeService';
import type { GameForgeWorkflow, WorkflowTrigger } from '../types/gameForge';
import type { Timestamp } from 'firebase/firestore';

const TRIGGER_TYPES: WorkflowTrigger[] = ['schedule', 'event', 'manual'];

const fmtDate = (ts: Timestamp | undefined) => {
    if (!ts) return '--';
    try {
        return ts.toDate().toLocaleString();
    } catch {
        return '--';
    }
};

const GameForgeWorkflows: React.FC = () => {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState<GameForgeWorkflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', trigger: 'manual' as WorkflowTrigger });

    const fetchWorkflows = async () => {
        setLoading(true);
        try {
            const list = await getWorkflows();
            setWorkflows(list as unknown as GameForgeWorkflow[]);
        } catch (err) {
            console.error('Failed to load workflows:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setCreating(true);
        try {
            await createWorkflow({
                name: form.name,
                description: form.description,
                trigger: form.trigger,
                actions: [],
                enabled: false,
            });
            setForm({ name: '', description: '', trigger: 'manual' });
            setShowCreate(false);
            await fetchWorkflows();
        } catch (err) {
            console.error('Failed to create workflow:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleToggle = async (id: string, currentEnabled: boolean) => {
        try {
            await toggleWorkflow(id, !currentEnabled);
            setWorkflows((prev) =>
                prev.map((w) => (w.id === id ? { ...w, enabled: !currentEnabled } : w))
            );
        } catch (err) {
            console.error('Failed to toggle workflow:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Workflow className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight">Workflows</h1>
                        <p className="text-slate-400">Automate game operations with triggers and actions</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center gap-2"
                >
                    {showCreate ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {showCreate ? 'Cancel' : 'New Workflow'}
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <form
                    onSubmit={handleCreate}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6"
                >
                    <h2 className="text-xl font-bold text-white">Create Workflow</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Workflow name"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Trigger</label>
                            <select
                                value={form.trigger}
                                onChange={(e) => setForm({ ...form, trigger: e.target.value as WorkflowTrigger })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                            >
                                {TRIGGER_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="What does this workflow do?"
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all resize-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={creating || !form.name.trim()}
                        className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-2xl transition-all flex items-center gap-2"
                    >
                        {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        {creating ? 'Creating...' : 'Create Workflow'}
                    </button>
                </form>
            )}

            {/* Workflow Cards */}
            {workflows.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                    <p className="text-slate-500">No workflows created yet. Click "New Workflow" to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {workflows.map((wf) => (
                        <div
                            key={wf.id}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all cursor-pointer"
                            onClick={() => navigate(`/game-forge/workflows/${wf.id}`)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{wf.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{wf.description || 'No description'}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggle(wf.id, wf.enabled);
                                    }}
                                    className="shrink-0"
                                    title={wf.enabled ? 'Disable workflow' : 'Enable workflow'}
                                >
                                    {wf.enabled ? (
                                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                                    ) : (
                                        <ToggleLeft className="w-8 h-8 text-slate-600" />
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-slate-300 capitalize">
                                    <Play className="w-3 h-3" />
                                    {wf.trigger}
                                </span>
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    Last: {fmtDate(wf.lastRun)}
                                </span>
                                <span
                                    className={`text-xs font-semibold ${wf.enabled ? 'text-emerald-400' : 'text-slate-600'}`}
                                >
                                    {wf.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GameForgeWorkflows;
