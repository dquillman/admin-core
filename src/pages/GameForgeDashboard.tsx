import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Loader2,
    Gamepad2,
    Users,
    DollarSign,
    Activity,
    ArrowUpRight,
    Clock,
    BarChart3,
    ListChecks,
} from 'lucide-react';
import { getGames, getPlayers, getSessions, getAnalytics } from '../services/gameForgeService';
import GameCard from '../components/gameforge/GameCard';
import type { GameForgeGame, GameForgeSession, GameForgeAnalytics } from '../types/gameForge';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
}

const KpiCard = ({ title, value, icon: Icon, color, subtitle }: KpiCardProps) => (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 transition-all duration-300 hover:border-slate-700 group">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div className="bg-slate-800 p-1 rounded-lg">
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
        </div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
            {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
        </div>
    </div>
);

export default function GameForgeDashboard() {
    const [games, setGames] = useState<GameForgeGame[]>([]);
    const [playerCount, setPlayerCount] = useState(0);
    const [sessions, setSessions] = useState<GameForgeSession[]>([]);
    const [revenue, setRevenue] = useState(0);
    const [dau, setDau] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [gamesData, playersData, sessionsData, analyticsData] = await Promise.all([
                    getGames(),
                    getPlayers(),
                    getSessions(),
                    getAnalytics(),
                ]);

                setGames(gamesData as unknown as GameForgeGame[]);
                setPlayerCount(playersData.length);
                setSessions(sessionsData as unknown as GameForgeSession[]);

                // Aggregate analytics
                if (analyticsData.length > 0) {
                    const latest = analyticsData[0] as unknown as GameForgeAnalytics;
                    setRevenue(latest.revenue ?? 0);
                    setDau(latest.dau ?? 0);
                }
            } catch (error) {
                console.error('GameForge dashboard fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    const recentSessions = sessions.slice(0, 10);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                        GameForge Command Center
                    </h1>
                    <p className="text-slate-400">Platform overview and real-time metrics</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 text-sm text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Total Games"
                    value={games.length}
                    icon={Gamepad2}
                    color="bg-brand-500"
                    subtitle="in catalog"
                />
                <KpiCard
                    title="Active Players"
                    value={playerCount}
                    icon={Users}
                    color="bg-emerald-500"
                    subtitle="registered"
                />
                <KpiCard
                    title="Monthly Revenue"
                    value={`$${revenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-amber-500"
                />
                <KpiCard
                    title="DAU"
                    value={dau.toLocaleString()}
                    icon={Activity}
                    color="bg-purple-500"
                    subtitle="daily active"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                    to="/game-forge/games"
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-brand-500/30 transition-all duration-300 group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-brand-500 bg-opacity-10 group-hover:scale-110 transition-transform duration-300">
                            <Gamepad2 className="w-6 h-6 text-brand-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Games</h3>
                            <p className="text-slate-400 text-sm">Manage game catalog</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-slate-500 ml-auto group-hover:text-brand-400 transition-colors" />
                    </div>
                </Link>
                <Link
                    to="/game-forge/players"
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/30 transition-all duration-300 group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-500 bg-opacity-10 group-hover:scale-110 transition-transform duration-300">
                            <Users className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Players</h3>
                            <p className="text-slate-400 text-sm">View player profiles</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-slate-500 ml-auto group-hover:text-emerald-400 transition-colors" />
                    </div>
                </Link>
                <Link
                    to="/game-forge/analytics"
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-purple-500/30 transition-all duration-300 group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-purple-500 bg-opacity-10 group-hover:scale-110 transition-transform duration-300">
                            <BarChart3 className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Analytics</h3>
                            <p className="text-slate-400 text-sm">Performance metrics</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-slate-500 ml-auto group-hover:text-purple-400 transition-colors" />
                    </div>
                </Link>
            </div>

            {/* Recent Games + Recent Sessions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Games */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-6">Recent Games</h2>
                    {games.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {games.slice(0, 4).map((game) => (
                                <GameCard key={game.id} game={game} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                            <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400 text-lg font-medium">No games yet</p>
                            <p className="text-slate-500 text-sm mt-1">Create your first game to get started</p>
                        </div>
                    )}
                </div>

                {/* Recent Sessions */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-white">Recent Sessions</h2>
                        <ListChecks className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="space-y-4">
                        {recentSessions.length > 0 ? (
                            recentSessions.map((session) => (
                                <div key={session.id} className="flex gap-4">
                                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-200 leading-tight truncate">
                                            <span className="font-bold text-white">Player</span>{' '}
                                            {session.playerId?.slice(0, 8)}...
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Score: {session.score ?? 0} | {Math.round((session.duration ?? 0) / 60)}m
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 italic text-center py-8">
                                No sessions recorded yet.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
