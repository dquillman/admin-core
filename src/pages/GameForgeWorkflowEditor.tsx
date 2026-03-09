import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Settings, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { getWorkflow, getWorkflowRuns } from '../services/gameForgeService';
import type { GameForgeWorkflow, WorkflowRun } from '../types/gameForge';
import type { Timestamp } from 'firebase/firestore';

const fmtDate = (ts: Timestamp | undefined) => {
    if (!ts) return '--';
    try {
        return ts.toDate().toLocaleString();
    } catch {
        return '--';
    }
};

const statusColor: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400',
    running: 'bg-blue-500/10 text-blue-400',
    completed: 'bg-emerald-500/10 text-emerald-400',
    failed: 'bg-red-500/10 text-red-400',
};

const statusIcon: Record<string, React.ReactNode> = {
    pending: <Clock className="w-4 h-4" />,
    running: <Loader2 className="w-4 h-4 animate-spin" />,
    completed: <CheckCircle className="w-4 h-4" />,
    failed: <XCircle className="w-4 h-4" />,
};

const GameForgeWorkflowEditor: React.FC = () => {
    const { workflowId } = useParams<{ workflowId: string }>();
    const navigate = useNavigate();
    const [workflow, setWorkflow] = useState<GameForgeWorkflow | null>(null);
    const [runs, setRuns] = useState<WorkflowRun[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!workflowId) return;
        const fetch = async () => {
            setLoading(true);
            try {
                const [wf, runList] = await Promise.all([
                    getWorkflow(workflowId),
                    getWorkflowRuns(workflowId),
                ]);
                setWorkflow(wf as unknown as GameForgeWorkflow | null);
                setRuns(runList);
            } catch (err) {
                console.error('Failed to load workflow:', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [workflowId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!workflow) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <button
                    onClick={() => navigate('/game-forge/workflows')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Workflows
                </button>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                    <p className="text-slate-400">Workflow not found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Back link */}
            <button
                onClick={() => navigate('/game-forge/workflows')}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Workflows
            </button>

            {/* Workflow Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Settings className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{workflow.name}</h1>
                        <p className="text-slate-400 mt-1">{workflow.description || 'No description'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Trigger</span>
                        <span className="text-white capitalize">{workflow.trigger}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</span>
                        <span className={workflow.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                            {workflow.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Last Run</span>
                        <span className="text-slate-300">{fmtDate(workflow.lastRun)}</span>
                    </div>
                </div>

                {/* Trigger Config */}
                {workflow.triggerConfig && Object.keys(workflow.triggerConfig).length > 0 && (
                    <div className="mt-6">
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Trigger Configuration
                        </span>
                        <pre className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 overflow-x-auto">
                            {JSON.stringify(workflow.triggerConfig, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <h2 className="text-xl font-bold text-white mb-6">Actions</h2>
                {workflow.actions.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No actions configured for this workflow.</p>
                ) : (
                    <div className="space-y-4">
                        {workflow.actions.map((action, idx) => (
                            <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="inline-block w-6 h-6 rounded-full bg-slate-700 text-center text-xs font-bold text-slate-300 leading-6">
                                        {idx + 1}
                                    </span>
                                    <span className="text-white font-semibold capitalize">{action.type}</span>
                                </div>
                                <pre className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 overflow-x-auto">
                                    {JSON.stringify(action.config, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Run History */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <h2 className="text-xl font-bold text-white mb-6">Run History</h2>

                {runs.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No runs recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Started</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Completed</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runs.map((run) => (
                                    <tr key={run.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-lg capitalize ${
                                                    statusColor[run.status] || 'bg-slate-800 text-slate-400'
                                                }`}
                                            >
                                                {statusIcon[run.status]}
                                                {run.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 text-sm">{fmtDate(run.startedAt)}</td>
                                        <td className="py-3 px-4 text-slate-400 text-sm">{fmtDate(run.completedAt)}</td>
                                        <td className="py-3 px-4 text-red-400 text-sm truncate max-w-xs">
                                            {run.error || '--'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameForgeWorkflowEditor;
