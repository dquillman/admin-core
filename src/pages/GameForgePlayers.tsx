import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Filter, Loader2 } from 'lucide-react';
import { getPlayers } from '../services/gameForgeService';
import type { GameForgePlayer, SubscriptionTier } from '../types/gameForge';
import PlayerCard from '../components/gameforge/PlayerCard';

const TIER_OPTIONS: { label: string; value: SubscriptionTier | 'all' }[] = [
    { label: 'All Tiers', value: 'all' },
    { label: 'Free', value: 'free' },
    { label: 'Pro', value: 'pro' },
    { label: 'Elite', value: 'elite' },
];

const GameForgePlayers: React.FC = () => {
    const navigate = useNavigate();
    const [players, setPlayers] = useState<GameForgePlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'all'>('all');

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const data = await getPlayers() as unknown as GameForgePlayer[];
            setPlayers(data);
        } catch (err) {
            console.error('Failed to fetch players:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        return players.filter((p) => {
            const matchesSearch = !search || p.displayName.toLowerCase().includes(search.toLowerCase());
            const matchesTier = tierFilter === 'all' || p.subscriptionTier === tierFilter;
            return matchesSearch && matchesTier;
        });
    }, [players, search, tierFilter]);

    if (loading) {
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
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Players</h1>
                <p className="text-slate-400">
                    <Users className="w-4 h-4 inline mr-1" />
                    {filtered.length} player{filtered.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                    />
                </div>

                {/* Tier filter */}
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                        value={tierFilter}
                        onChange={(e) => setTierFilter(e.target.value as SubscriptionTier | 'all')}
                        className="pl-10 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm appearance-none focus:outline-none focus:border-brand-500/50 transition-colors cursor-pointer"
                    >
                        {TIER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Player Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No players found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filter</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((player) => (
                        <PlayerCard
                            key={player.id}
                            player={player}
                            onClick={() => navigate(`/game-forge/players/${player.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default GameForgePlayers;
