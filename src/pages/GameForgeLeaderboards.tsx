import React, { useState, useEffect } from 'react';
import { Trophy, Loader2, Gamepad2 } from 'lucide-react';
import { getGames, getLeaderboard } from '../services/gameForgeService';
import type { LeaderboardEntry, LeaderboardPeriod } from '../types/gameForge';

interface GameOption {
    id: string;
    title: string;
}

const PERIODS: { label: string; value: LeaderboardPeriod }[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'All-time', value: 'alltime' },
];

function formatDate(ts: { toDate?: () => Date } | undefined): string {
    if (!ts || !ts.toDate) return '—';
    return ts.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function rankBadge(rank: number): string {
    if (rank === 1) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (rank === 2) return 'bg-slate-400/10 text-slate-300 border-slate-400/20';
    if (rank === 3) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    return 'bg-slate-800 text-slate-400 border-slate-700';
}

const GameForgeLeaderboards: React.FC = () => {
    const [games, setGames] = useState<GameOption[]>([]);
    const [selectedGame, setSelectedGame] = useState<string>('');
    const [period, setPeriod] = useState<LeaderboardPeriod>('alltime');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loadingGames, setLoadingGames] = useState(true);
    const [loadingBoard, setLoadingBoard] = useState(false);

    useEffect(() => {
        fetchGames();
    }, []);

    useEffect(() => {
        if (selectedGame) {
            fetchLeaderboard(selectedGame, period);
        }
    }, [selectedGame, period]);

    const fetchGames = async () => {
        setLoadingGames(true);
        try {
            const data = await getGames();
            const opts = data.map((g) => ({ id: g.id, title: g.title ?? g.id }));
            setGames(opts);
            if (opts.length > 0) {
                setSelectedGame(opts[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch games:', err);
        } finally {
            setLoadingGames(false);
        }
    };

    const fetchLeaderboard = async (gameId: string, p: LeaderboardPeriod) => {
        setLoadingBoard(true);
        try {
            const data = await getLeaderboard(gameId, p);
            setEntries(data);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        } finally {
            setLoadingBoard(false);
        }
    };

    if (loadingGames) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Leaderboards</h1>
                <p className="text-slate-400">View top players by game and time period</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Game selector */}
                <div className="relative">
                    <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                        value={selectedGame}
                        onChange={(e) => setSelectedGame(e.target.value)}
                        className="pl-10 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm appearance-none focus:outline-none focus:border-brand-500/50 transition-colors cursor-pointer"
                    >
                        {games.length === 0 && (
                            <option value="">No games available</option>
                        )}
                        {games.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Period tabs */}
                <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                period === p.value
                                    ? 'bg-brand-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                {loadingBoard ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">No leaderboard entries</p>
                        <p className="text-sm mt-1">
                            {selectedGame ? 'No scores recorded for this game and period' : 'Select a game to view the leaderboard'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="text-left py-3 px-3 font-medium w-16">Rank</th>
                                    <th className="text-left py-3 px-3 font-medium">Player</th>
                                    <th className="text-right py-3 px-3 font-medium">Score</th>
                                    <th className="text-right py-3 px-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry, idx) => (
                                    <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-bold ${rankBadge(entry.rank || idx + 1)}`}>
                                                {entry.rank || idx + 1}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-white font-medium">{entry.playerName}</td>
                                        <td className="py-3 px-3 text-right text-white font-bold">{entry.score.toLocaleString()}</td>
                                        <td className="py-3 px-3 text-right text-slate-400">{formatDate(entry.updatedAt)}</td>
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

export default GameForgeLeaderboards;
