import React, { useState, useEffect } from 'react';
import { Loader2, Brain, Sparkles, TrendingUp, Lock } from 'lucide-react';
import { getRecommendations, getPlayers } from '../services/gameForgeService';
import type { AIRecommendation, GameForgePlayer } from '../types/gameForge';
import type { Timestamp } from 'firebase/firestore';

const fmtDate = (ts: Timestamp | undefined) => {
    if (!ts) return '--';
    try {
        return ts.toDate().toLocaleString();
    } catch {
        return '--';
    }
};

const GameForgeAI: React.FC = () => {
    const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
    const [players, setPlayers] = useState<GameForgePlayer[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const fetchPlayers = async () => {
        try {
            const list = await getPlayers();
            setPlayers(list as unknown as GameForgePlayer[]);
            if (list.length > 0) {
                setSelectedPlayer(list[0].id);
            }
        } catch (err) {
            console.error('Failed to load players:', err);
        }
    };

    const fetchRecommendations = async (playerId: string) => {
        if (!playerId) return;
        setLoading(true);
        try {
            const recs = await getRecommendations(playerId);
            setRecommendations(recs);
        } catch (err) {
            console.error('Failed to load recommendations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    useEffect(() => {
        if (selectedPlayer) {
            fetchRecommendations(selectedPlayer);
        } else {
            setLoading(false);
        }
    }, [selectedPlayer]);

    const totalRecs = recommendations.length;
    const acceptedRecs = recommendations.filter((r) => r.accepted === true).length;
    const acceptanceRate = totalRecs > 0 ? Math.round((acceptedRecs / totalRecs) * 100) : 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-xl">
                    <Brain className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">AI Insights</h1>
                    <p className="text-slate-400">Player recommendations and ML-driven analytics</p>
                </div>
            </div>

            {/* Player Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select Player</label>
                <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full md:w-80 bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                >
                    <option value="">-- Select Player --</option>
                    {players.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.displayName}
                        </option>
                    ))}
                </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-violet-500/10 rounded-xl">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Recommendations</span>
                    </div>
                    <p className="text-4xl font-bold text-white">{totalRecs}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Acceptance Rate</span>
                    </div>
                    <p className="text-4xl font-bold text-white">{acceptanceRate}%</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Accepted</span>
                    </div>
                    <p className="text-4xl font-bold text-white">{acceptedRecs}</p>
                </div>
            </div>

            {/* Recommendations List */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <h2 className="text-xl font-bold text-white mb-6">Recent Recommendations</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                    </div>
                ) : recommendations.length === 0 ? (
                    <p className="text-slate-500 text-center py-12">No recommendations found for this player.</p>
                ) : (
                    <div className="space-y-4">
                        {recommendations.map((rec) => (
                            <div key={rec.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-lg bg-violet-500/10 text-violet-400 capitalize">
                                            {rec.type}
                                        </span>
                                        <span className="text-xs text-slate-500">Model: {rec.model}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {rec.accepted !== undefined && (
                                            <span
                                                className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                                                    rec.accepted
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'bg-red-500/10 text-red-400'
                                                }`}
                                            >
                                                {rec.accepted ? 'Accepted' : 'Declined'}
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-500">{fmtDate(rec.generatedAt)}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {rec.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <span className="text-white">{item.title}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-500 text-xs">{item.reason}</span>
                                                <span className="text-violet-400 font-mono text-xs">
                                                    {(item.score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Coming Soon Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 opacity-60">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-700/50 rounded-xl">
                            <Lock className="w-5 h-5 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Custom ML Model Configuration</h3>
                    </div>
                    <p className="text-slate-500 text-sm">
                        Configure recommendation models, training schedules, and feature weights.
                    </p>
                    <span className="inline-block mt-4 px-3 py-1 text-xs font-bold rounded-full bg-slate-800 text-slate-400 uppercase tracking-widest">
                        Coming Soon
                    </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 opacity-60">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-700/50 rounded-xl">
                            <Lock className="w-5 h-5 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white">A/B Testing Framework</h3>
                    </div>
                    <p className="text-slate-500 text-sm">
                        Run experiments on recommendation algorithms and compare conversion metrics.
                    </p>
                    <span className="inline-block mt-4 px-3 py-1 text-xs font-bold rounded-full bg-slate-800 text-slate-400 uppercase tracking-widest">
                        Coming Soon
                    </span>
                </div>
            </div>
        </div>
    );
};

export default GameForgeAI;
