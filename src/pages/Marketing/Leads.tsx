import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getMarketingLeads, addMarketingLead, updateMarketingLead } from '../../services/marketingService';
import type { MarketingLead, LeadSource, LeadStatus } from '../../types';
import {
    Search,
    Filter,
    Plus,
    Loader2,
    Save,
    X,
    MoreHorizontal
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const LeadsPage: React.FC = () => {
    const { isAdmin, loading: authLoading } = useAuth();
    const [leads, setLeads] = useState<MarketingLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');

    // New Lead Form State
    const [newLead, setNewLead] = useState<{ email: string; source: LeadSource; notes: string }>({
        email: '',
        source: 'manual',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<MarketingLead>>({});

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchLeads();
        }
    }, [authLoading, isAdmin]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const data = await getMarketingLeads();
            setLeads(data);
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addMarketingLead({
                email: newLead.email,
                source: newLead.source,
                status: 'new',
                notes: newLead.notes
            });
            setShowAddModal(false);
            setNewLead({ email: '', source: 'manual', notes: '' });
            fetchLeads();
        } catch (error) {
            console.error("Failed to add lead", error);
        } finally {
            setSubmitting(false);
        }
    };

    const startEditing = (lead: MarketingLead) => {
        setEditingId(lead.id || null);
        setEditForm({ status: lead.status, notes: lead.notes });
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await updateMarketingLead(editingId, editForm);
            setEditingId(null);
            fetchLeads();
        } catch (error) {
            console.error("Failed to update lead", error);
        }
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: LeadStatus) => {
        switch (status) {
            case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'invited': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'converted': return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
            case 'lost': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-slate-800 text-slate-400';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Marketing Leads</h1>
                    <p className="text-slate-400">Track early adopters and potential customers</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Add Manual Lead
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search emails or notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    >
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="invited">Invited</option>
                        <option value="active">Active</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-800">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Source</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Notes</th>
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
                            ) : filteredLeads.length > 0 ? filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-white">
                                        {lead.email}
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {lead.createdAt?.toDate().toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium uppercase tracking-wide">
                                            {lead.source}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingId === lead.id ? (
                                            <select
                                                value={editForm.status}
                                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LeadStatus })}
                                                className="bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white"
                                            >
                                                <option value="new">New</option>
                                                <option value="invited">Invited</option>
                                                <option value="active">Active</option>
                                                <option value="converted">Converted</option>
                                                <option value="lost">Lost</option>
                                            </select>
                                        ) : (
                                            <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", getStatusColor(lead.status))}>
                                                {lead.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate">
                                        {editingId === lead.id ? (
                                            <input
                                                type="text"
                                                value={editForm.notes || ''}
                                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-white text-xs"
                                            />
                                        ) : (
                                            lead.notes || <span className="text-slate-600 italic">No notes</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {editingId === lead.id ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={saveEdit} className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors">
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => startEditing(lead)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        No leads found. Start tracking!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Lead Modal */}
            {showAddModal && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl z-50 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Add New Lead</h2>
                            <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
                        </div>
                        <form onSubmit={handleAddLead} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newLead.email}
                                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-brand-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Source</label>
                                <select
                                    value={newLead.source}
                                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value as LeadSource })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-brand-500/50"
                                >
                                    <option value="manual">Manual Entry</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="reddit">Reddit</option>
                                    <option value="discord">Discord</option>
                                    <option value="landing">Landing Page</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes</label>
                                <textarea
                                    value={newLead.notes}
                                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white min-h-[100px] focus:ring-2 focus:ring-brand-500/50"
                                    placeholder="Context, initial interest, etc."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Adding...' : 'Add Lead'}
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default LeadsPage;
