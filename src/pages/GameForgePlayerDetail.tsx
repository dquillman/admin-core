import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    Gamepad2,
    Clock,
    Trophy,
    CreditCard,
    Loader2,
} from 'lucide-react';
import { getPlayer, getSessions, getPayments } from '../services/gameForgeService';
import type { GameForgePlayer, GameForgeSession, GameForgePayment, SubscriptionTier } from '../types/gameForge';
import XPProgressBar from '../components/gameforge/XPProgressBar';

const tierStyles: Record<SubscriptionTier, string> = {
    free: 'bg-slate-800 text-slate-400 border-slate-700',
    pro: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    elite: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function formatDate(ts: { toDate?: () => Date } | undefined): string {
    if (!ts || !ts.toDate) return '—';
    return ts.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
}

function formatPlaytime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainMins = minutes % 60;
    return `${hours}h ${remainMins}m`;
}

const GameForgePlayerDetail: React.FC = () => {
    const { playerId } = useParams<{ playerId: string }>();
    const navigate = useNavigate();
    const [player, setPlayer] = useState<GameForgePlayer | null>(null);
    const [sessions, setSessions] = useState<GameForgeSession[]>([]);
    const [payments, setPayments] = useState<GameForgePayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (playerId) fetchData(playerId);
    }, [playerId]);

    const fetchData = async (id: string) => {
        setLoading(true);
        try {
            const [playerData, sessionData, paymentData] = await Promise.all([
                getPlayer(id) as unknown as Promise<GameForgePlayer | null>,
                getSessions(id) as unknown as Promise<GameForgeSession[]>,
                getPayments(id) as unknown as Promise<GameForgePayment[]>,
            ]);
            setPlayer(playerData);
            setSessions(sessionData);
            setPayments(paymentData);
        } catch (err) {
            console.error('Failed to fetch player data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!player) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => navigate('/game-forge/players')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Players
                </button>
                <div className="text-center py-16 text-slate-500">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">Player not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Back link */}
            <button
                onClick={() => navigate('/game-forge/players')}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Players
            </button>

            {/* Player Info Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {player.avatar ? (
                            <img
                                src={player.avatar}
                                alt={player.displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-10 h-10 text-slate-600" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">
                                {player.displayName}
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-brand-500/10 text-brand-400 border-brand-500/20 uppercase tracking-wider">
                                    Lv {player.level}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${tierStyles[player.subscriptionTier]}`}>
                                    {player.subscriptionTier}
                                </span>
                            </div>
                        </div>

                        <div className="max-w-xs">
                            <XPProgressBar xp={player.xp} level={player.level} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Gamepad2 className="w-5 h-5 text-brand-400" />
                        <span className="text-sm text-slate-400">Total Games Played</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{player.totalGamesPlayed.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm text-slate-400">Total Playtime</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{formatPlaytime(player.totalPlaytime)}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span className="text-sm text-slate-400">Achievements</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{player.achievements?.length ?? 0}</p>
                </div>
            </div>

            {/* Session History */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-brand-400" />
                    Session History
                </h2>
                {sessions.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">No sessions recorded</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="text-left py-3 px-3 font-medium">Game</th>
                                    <th className="text-left py-3 px-3 font-medium">Date</th>
                                    <th className="text-right py-3 px-3 font-medium">Score</th>
                                    <th className="text-right py-3 px-3 font-medium">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((session) => (
                                    <tr key={session.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-3 text-white">{session.gameId}</td>
                                        <td className="py-3 px-3 text-slate-400">{formatDate(session.startedAt)}</td>
                                        <td className="py-3 px-3 text-right text-white font-medium">{session.score.toLocaleString()}</td>
                                        <td className="py-3 px-3 text-right text-slate-400">{formatDuration(session.duration)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment History */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    Payment History
                </h2>
                {payments.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">No payments recorded</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="text-left py-3 px-3 font-medium">Amount</th>
                                    <th className="text-left py-3 px-3 font-medium">Type</th>
                                    <th className="text-left py-3 px-3 font-medium">Description</th>
                                    <th className="text-left py-3 px-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-3 text-emerald-400 font-medium">
                                            ${(payment.amount / 100).toFixed(2)} {payment.currency?.toUpperCase()}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-800 text-slate-400 border-slate-700 uppercase tracking-wider">
                                                {payment.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-slate-400">{payment.description || '—'}</td>
                                        <td className="py-3 px-3 text-slate-400">{formatDate(payment.createdAt)}</td>
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

export default GameForgePlayerDetail;
