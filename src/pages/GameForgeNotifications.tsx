import React, { useState, useEffect } from 'react';
import { Loader2, Bell, CheckCircle, Circle } from 'lucide-react';
import {
    getNotifications,
    createNotification,
    sendBulkNotifications,
    markNotificationRead,
} from '../services/gameForgeService';
import { getPlayers } from '../services/gameForgeService';
import NotificationComposer from '../components/gameforge/NotificationComposer';
import type { GameForgeNotification, GameForgePlayer, NotificationType } from '../types/gameForge';
import type { Timestamp } from 'firebase/firestore';

const fmtDate = (ts: Timestamp | undefined) => {
    if (!ts) return '--';
    try {
        return ts.toDate().toLocaleString();
    } catch {
        return '--';
    }
};

const GameForgeNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<GameForgeNotification[]>([]);
    const [players, setPlayers] = useState<GameForgePlayer[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [notifs, playerList] = await Promise.all([getNotifications(), getPlayers()]);
            setNotifications(notifs as unknown as GameForgeNotification[]);
            setPlayers(playerList as unknown as GameForgePlayer[]);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSend = async (data: {
        type: NotificationType;
        title: string;
        body: string;
        target: 'all' | string;
    }) => {
        const payload = {
            type: data.type,
            title: data.title,
            body: data.body,
            read: false,
        };

        if (data.target === 'all') {
            const ids = players.map((p) => p.id);
            if (ids.length > 0) {
                await sendBulkNotifications(ids, payload);
            }
        } else {
            await createNotification({
                ...payload,
                playerId: data.target,
                createdAt: null as unknown as Timestamp, // serverTimestamp handled by service
            });
        }
        await fetchData();
    };

    const handleMarkRead = async (id: string) => {
        await markNotificationRead(id);
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const playerName = (playerId: string) => {
        const p = players.find((pl) => pl.id === playerId);
        return p ? p.displayName : playerId;
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
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                    <Bell className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">Notifications</h1>
                    <p className="text-slate-400">Send and manage player notifications</p>
                </div>
            </div>

            <NotificationComposer onSend={handleSend} players={players} />

            {/* History Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <h2 className="text-xl font-bold text-white mb-6">Notification History</h2>

                {notifications.length === 0 ? (
                    <p className="text-slate-500 text-center py-12">No notifications sent yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Title</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Player</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notifications.map((n) => (
                                    <tr key={n.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 capitalize">
                                                {n.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-white font-medium">{n.title}</td>
                                        <td className="py-3 px-4 text-slate-400">{playerName(n.playerId)}</td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => !n.read && handleMarkRead(n.id)}
                                                className="flex items-center gap-1.5"
                                                disabled={n.read}
                                            >
                                                {n.read ? (
                                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <Circle className="w-4 h-4 text-slate-500" />
                                                )}
                                                <span className={n.read ? 'text-emerald-400 text-sm' : 'text-slate-500 text-sm'}>
                                                    {n.read ? 'Read' : 'Unread'}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 text-sm">{fmtDate(n.createdAt)}</td>
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

export default GameForgeNotifications;
