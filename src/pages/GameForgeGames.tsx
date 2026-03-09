import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader2,
    Plus,
    Search,
    Gamepad2,
    X,
} from 'lucide-react';
import { getGames, createGame } from '../services/gameForgeService';
import GameCard from '../components/gameforge/GameCard';
import type { GameForgeGame, GameGenre, GameStatus } from '../types/gameForge';

const GENRES: GameGenre[] = ['action', 'puzzle', 'strategy', 'rpg', 'casual', 'sports'];
const STATUSES: GameStatus[] = ['draft', 'active', 'archived'];
const PLATFORMS = ['web', 'ios', 'android', 'desktop'];
const PRICING_TYPES = ['free', 'paid', 'freemium'] as const;

const emptyForm = {
    title: '',
    description: '',
    genre: 'action' as GameGenre,
    platforms: [] as string[],
    pricing: { type: 'free' as 'free' | 'paid' | 'freemium', price: 0 },
    status: 'draft' as GameStatus,
};

export default function GameForgeGames() {
    const [games, setGames] = useState<GameForgeGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterGenre, setFilterGenre] = useState<GameGenre | ''>('');
    const [filterStatus, setFilterStatus] = useState<GameStatus | ''>('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            const data = await getGames();
            setGames(data as unknown as GameForgeGame[]);
        } catch (error) {
            console.error('Error fetching games:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!form.title.trim()) return;
        setSubmitting(true);
        try {
            await createGame({
                title: form.title,
                description: form.description,
                genre: form.genre,
                platforms: form.platforms,
                pricing: form.pricing,
                status: form.status,
            } as Omit<GameForgeGame, 'id' | 'createdAt' | 'updatedAt'>);
            setForm(emptyForm);
            setShowForm(false);
            await fetchGames();
        } catch (error) {
            console.error('Error creating game:', error);
            alert('Failed to create game.');
        } finally {
            setSubmitting(false);
        }
    };

    const togglePlatform = (platform: string) => {
        setForm((prev) => ({
            ...prev,
            platforms: prev.platforms.includes(platform)
                ? prev.platforms.filter((p) => p !== platform)
                : [...prev.platforms, platform],
        }));
    };

    const filtered = games.filter((g) => {
        const matchesSearch =
            g.title.toLowerCase().includes(search.toLowerCase()) ||
            g.description.toLowerCase().includes(search.toLowerCase());
        const matchesGenre = !filterGenre || g.genre === filterGenre;
        const matchesStatus = !filterStatus || g.status === filterStatus;
        return matchesSearch && matchesGenre && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Games</h1>
                    <p className="text-slate-400">Manage your game catalog</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-lg shadow-brand-900/20"
                >
                    {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {showForm ? 'Cancel' : 'New Game'}
                </button>
            </div>

            {/* New Game Form */}
            {showForm && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                    <h2 className="text-xl font-bold text-white">Create New Game</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Title</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="Game title"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                            />
                        </div>

                        {/* Genre */}
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Genre</label>
                            <select
                                value={form.genre}
                                onChange={(e) => setForm({ ...form, genre: e.target.value as GameGenre })}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                            >
                                {GENRES.map((g) => (
                                    <option key={g} value={g}>
                                        {g.charAt(0).toUpperCase() + g.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-400 mb-2">Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Brief description of the game"
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors resize-none"
                            />
                        </div>

                        {/* Platforms */}
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Platforms</label>
                            <div className="flex flex-wrap gap-2">
                                {PLATFORMS.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => togglePlatform(p)}
                                        className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${
                                            form.platforms.includes(p)
                                                ? 'bg-brand-600 text-white border-brand-500'
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                        }`}
                                    >
                                        {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pricing */}
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Pricing</label>
                            <select
                                value={form.pricing.type}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        pricing: { ...form.pricing, type: e.target.value as 'free' | 'paid' | 'freemium' },
                                    })
                                }
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                            >
                                {PRICING_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Status</label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value as GameStatus })}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                            >
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleCreate}
                            disabled={submitting || !form.title.trim()}
                            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-lg shadow-brand-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Game
                        </button>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search games..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                    />
                </div>
                <select
                    value={filterGenre}
                    onChange={(e) => setFilterGenre(e.target.value as GameGenre | '')}
                    className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                >
                    <option value="">All Genres</option>
                    {GENRES.map((g) => (
                        <option key={g} value={g}>
                            {g.charAt(0).toUpperCase() + g.slice(1)}
                        </option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as GameStatus | '')}
                    className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((game) => (
                    <GameCard
                        key={game.id}
                        game={game}
                        onClick={() => navigate(`/game-forge/games/${game.id}`)}
                    />
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                    <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium">
                        {search || filterGenre || filterStatus
                            ? 'No games match your filters'
                            : 'No games yet'}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                        {search || filterGenre || filterStatus
                            ? 'Try different search terms or filters'
                            : 'Create your first game to get started'}
                    </p>
                </div>
            )}
        </div>
    );
}
