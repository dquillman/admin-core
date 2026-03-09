import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, Pencil, Eye, EyeOff, ListChecks, Search } from 'lucide-react';
import { getFlows, deleteFlow, updateFlow } from '../services/onboardingService';
import type { OnboardingFlow, OnboardingFlowStatus } from '../types';

const statusStyles: Record<OnboardingFlowStatus, string> = {
    draft: 'bg-slate-800 text-slate-400 border-slate-700',
    published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    archived: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function OnboardingFlows() {
    const [flows, setFlows] = useState<OnboardingFlow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchFlows();
    }, []);

    const fetchFlows = async () => {
        try {
            const data = await getFlows();
            setFlows(data);
        } catch (error) {
            console.error('Error fetching flows:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (flowId: string) => {
        if (!window.confirm('Delete this onboarding flow? This cannot be undone.')) return;
        try {
            await deleteFlow(flowId);
            setFlows(flows.filter(f => f.id !== flowId));
        } catch (error) {
            console.error('Error deleting flow:', error);
            alert('Failed to delete flow.');
        }
    };

    const handleTogglePublish = async (flow: OnboardingFlow) => {
        const newStatus: OnboardingFlowStatus = flow.status === 'published' ? 'draft' : 'published';
        try {
            await updateFlow(flow.id, { status: newStatus });
            setFlows(flows.map(f => f.id === flow.id ? { ...f, status: newStatus } : f));
        } catch (error) {
            console.error('Error toggling publish:', error);
            alert('Failed to update status.');
        }
    };

    const filtered = flows.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Onboarding Flows</h1>
                    <p className="text-slate-400">Build and manage multi-step onboarding experiences</p>
                </div>
                <Link
                    to="/onboarding/new"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-lg shadow-brand-900/20"
                >
                    <Plus className="w-5 h-5" />
                    Create Flow
                </Link>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search flows..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                />
            </div>

            {/* Flow Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((flow) => (
                    <div key={flow.id} className="group relative bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-brand-500/30 transition-all duration-300">
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-brand-400 border border-slate-700">
                                    <ListChecks className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-700 uppercase tracking-wider">
                                        {flow.steps?.length ?? 0} Steps
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusStyles[flow.status]}`}>
                                        {flow.status}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-1 tracking-tight">{flow.name}</h3>
                                <p className="text-slate-400 text-sm line-clamp-2">{flow.description}</p>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-slate-800">
                                <button
                                    onClick={() => navigate(`/onboarding/${flow.id}`)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold hover:bg-brand-600 hover:text-white transition-all border border-slate-700"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleTogglePublish(flow)}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${flow.status === 'published'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                                        }`}
                                    title={flow.status === 'published' ? 'Unpublish' : 'Publish'}
                                >
                                    {flow.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => handleDelete(flow.id)}
                                    className="px-3 py-2.5 bg-slate-800 text-slate-500 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all border border-slate-700"
                                    title="Delete Flow"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                    <ListChecks className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium">
                        {search ? 'No flows match your search' : 'No onboarding flows yet'}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                        {search ? 'Try a different search term' : 'Create your first flow to get started'}
                    </p>
                </div>
            )}
        </div>
    );
}
