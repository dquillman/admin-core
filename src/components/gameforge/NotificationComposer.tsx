import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import type { GameForgePlayer, NotificationType } from '../../types/gameForge';

const NOTIFICATION_TYPES: NotificationType[] = ['system', 'achievement', 'social', 'promo', 'billing'];

interface NotificationFormData {
    type: NotificationType;
    title: string;
    body: string;
    target: 'all' | string; // 'all' or a specific playerId
}

interface NotificationComposerProps {
    onSend: (data: NotificationFormData) => Promise<void>;
    players: GameForgePlayer[];
}

const NotificationComposer: React.FC<NotificationComposerProps> = ({ onSend, players }) => {
    const [form, setForm] = useState<NotificationFormData>({
        type: 'system',
        title: '',
        body: '',
        target: 'all',
    });
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.body.trim()) return;
        setSending(true);
        try {
            await onSend(form);
            setForm({ type: 'system', title: '', body: '', target: 'all' });
        } catch (err) {
            console.error('Failed to send notification:', err);
        } finally {
            setSending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
            <h2 className="text-xl font-bold text-white">Compose Notification</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Type</label>
                    <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value as NotificationType })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                    >
                        {NOTIFICATION_TYPES.map((t) => (
                            <option key={t} value={t}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target</label>
                    <select
                        value={form.target}
                        onChange={(e) => setForm({ ...form, target: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                    >
                        <option value="all">All Players</option>
                        {players.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.displayName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Title</label>
                <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Notification title"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Body</label>
                <textarea
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder="Notification body text..."
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all resize-none"
                />
            </div>

            <button
                type="submit"
                disabled={sending || !form.title.trim() || !form.body.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center gap-2"
            >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {sending ? 'Sending...' : 'Send Notification'}
            </button>
        </form>
    );
};

export default NotificationComposer;
