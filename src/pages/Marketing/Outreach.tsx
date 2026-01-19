import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getOutreachLogs, addOutreachLog } from '../../services/marketingService';
import type { OutreachLog, OutreachPlatform } from '../../types';
import {
    Megaphone,
    MessageSquare,
    UserPlus,
    Plus,
    Loader2,
    TrendingUp
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const OutreachPage: React.FC = () => {
    const { isAdmin, loading: authLoading } = useAuth();
    const [logs, setLogs] = useState<OutreachLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogModal, setShowLogModal] = useState(false);

    // New Log Form
    const [newLog, setNewLog] = useState<{
        platform: OutreachPlatform;
        messageVariant: 'A' | 'B';
        responses: number;
        signups: number;
        notes: string;
        date: string; // YYYY-MM-DD
    }>({
        platform: 'LinkedIn',
        messageVariant: 'A',
        responses: 0,
        signups: 0,
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchLogs();
        }
    }, [authLoading, isAdmin]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await getOutreachLogs();
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch outreach logs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const dateObj = new Date(newLog.date);
            await addOutreachLog({
                platform: newLog.platform,
                messageVariant: newLog.messageVariant,
                responses: Number(newLog.responses),
                signups: Number(newLog.signups),
                notes: newLog.notes,
                date: Timestamp.fromDate(dateObj)
            });
            setShowLogModal(false);
            setNewLog({
                platform: 'LinkedIn',
                messageVariant: 'A',
                responses: 0,
                signups: 0,
                notes: '',
                date: new Date().toISOString().split('T')[0]
            });
            fetchLogs();
        } catch (error) {
            console.error("Failed to add log", error);
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate Weekly Stats (Simple Aggregation)
    const stats = {
        totalResponses: logs.reduce((acc, log) => acc + log.responses, 0),
        totalSignups: logs.reduce((acc, log) => acc + log.signups, 0),
        variantA: logs.filter(l => l.messageVariant === 'A').length,
        variantB: logs.filter(l => l.messageVariant === 'B').length,
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Outreach & Validation</h1>
                    <p className="text-slate-400">Log manual outreach efforts and track response rates.</p>
                </div>
                <button
                    onClick={() => setShowLogModal(true)}
                    className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Log Outreach Session
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                        <MessageSquare className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Responses</p>
                        <p className="text-3xl font-bold text-white">{stats.totalResponses}</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <UserPlus className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Direct Signups</p>
                        <p className="text-3xl font-bold text-white">{stats.totalSignups}</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-2xl">
                        <TrendingUp className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Variant Mix</p>
                        <div className="flex items-center gap-3">
                            <span className="text-white font-bold">A: {stats.variantA}</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-white font-bold">B: {stats.variantB}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-lg font-bold text-white">Recent Logs</h2>
                </div>
                <div className="divide-y divide-slate-800">
                    {loading ? (
                        <div className="p-12 flex justify-center">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        </div>
                    ) : logs.length > 0 ? logs.map((log) => (
                        <div key={log.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-slate-800 rounded-xl shrink-0">
                                        <Megaphone className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-white font-bold">{log.platform}</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-400 font-bold uppercase tracking-wider">
                                                Variant {log.messageVariant}
                                            </span>
                                            <span className="text-slate-500 text-sm">
                                                {log.date.toDate().toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-3 max-w-2xl">{log.notes || 'No notes logged.'}</p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                {log.responses} Replies
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                                                <UserPlus className="w-3.5 h-3.5" />
                                                {log.signups} Signups
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-12 text-center text-slate-500 italic">
                            No outreach logs yet. Get out there and hustle!
                        </div>
                    )}
                </div>
            </div>

            {/* Log Modal */}
            {showLogModal && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowLogModal(false)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl z-50 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-6">Log Outreach Session</h2>
                        <form onSubmit={handleLogSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Platform</label>
                                    <select
                                        value={newLog.platform}
                                        onChange={(e) => setNewLog({ ...newLog, platform: e.target.value as OutreachPlatform })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-brand-500/50"
                                    >
                                        <option value="LinkedIn">LinkedIn</option>
                                        <option value="Reddit">Reddit</option>
                                        <option value="Discord">Discord</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Message Variant</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewLog({ ...newLog, messageVariant: 'A' })}
                                            className={cn("flex-1 py-3 rounded-xl border text-sm font-bold", newLog.messageVariant === 'A' ? "bg-brand-500/10 border-brand-500/50 text-brand-400" : "bg-slate-800 border-slate-700 text-slate-400")}
                                        >
                                            Variant A
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewLog({ ...newLog, messageVariant: 'B' })}
                                            className={cn("flex-1 py-3 rounded-xl border text-sm font-bold", newLog.messageVariant === 'B' ? "bg-brand-500/10 border-brand-500/50 text-brand-400" : "bg-slate-800 border-slate-700 text-slate-400")}
                                        >
                                            Variant B
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Replies Received</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newLog.responses}
                                        onChange={(e) => setNewLog({ ...newLog, responses: parseInt(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-brand-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Direct Signups</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newLog.signups}
                                        onChange={(e) => setNewLog({ ...newLog, signups: parseInt(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-brand-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={newLog.date}
                                    onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-brand-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Session Notes</label>
                                <textarea
                                    value={newLog.notes}
                                    onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white min-h-[100px] focus:ring-2 focus:ring-brand-500/50"
                                    placeholder="What worked? What objections did you hear?"
                                />
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Log'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default OutreachPage;
