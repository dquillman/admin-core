import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Loader2,
    ArrowLeft,
    Save,
    Trash2,
} from 'lucide-react';
import { getGame, updateGame, deleteGame } from '../services/gameForgeService';
import type { GameForgeGame, GameGenre, GameStatus } from '../types/gameForge';

const GENRES: GameGenre[] = ['action', 'puzzle', 'strategy', 'rpg', 'casual', 'sports'];
const STATUSES: GameStatus[] = ['draft', 'active', 'archived'];
const PLATFORMS = ['web', 'ios', 'android', 'desktop'];
const PRICING_TYPES = ['free', 'paid', 'freemium'] as const;

export default function GameForgeGameEditor() {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const [game, setGame] = useState<GameForgeGame | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [genre, setGenre] = useState<GameGenre>('action');
    const [platforms, setPlatforms] = useState<string[]>([]);
    const [pricingType, setPricingType] = useState<'free' | 'paid' | 'freemium'>('free');
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState<GameStatus>('draft');

    useEffect(() => {
        if (!gameId) return;
        const fetchGame = async () => {
            try {
                const data = await getGame(gameId);
                if (!data) {
                    navigate('/game-forge/games');
                    return;
                }
                const g = data as unknown as GameForgeGame;
                setGame(g);
                setTitle(g.title);
                setDescription(g.description);
                setGenre(g.genre);
                setPlatforms(g.platforms || []);
                setPricingType(g.pricing?.type || 'free');
                setPrice(g.pricing?.price || 0);
                setStatus(g.status);
            } catch (error) {
                console.error('Error fetching game:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchGame();
    }, [gameId, navigate]);

    const handleSave = async () => {
        if (!gameId || !title.trim()) return;
        setSaving(true);
        try {
            await updateGame(gameId, {
                title,
                description,
                genre,
                platforms,
                pricing: { type: pricingType, price: pricingType === 'paid' ? price : undefined },
                status,
            } as Partial<GameForgeGame>);
            alert('Game updated successfully.');
        } catch (error) {
            console.error('Error updating game:', error);
            alert('Failed to update game.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!gameId) return;
        if (!window.confirm('Delete this game permanently? This cannot be undone.')) return;
        try {
            await deleteGame(gameId);
            navigate('/game-forge/games');
        } catch (error) {
            console.error('Error deleting game:', error);
            alert('Failed to delete game.');
        }
    };

    const togglePlatform = (platform: string) => {
        setPlatforms((prev) =>
            prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!game) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <p className="text-slate-400 text-lg font-medium">Game not found</p>
                <Link
                    to="/game-forge/games"
                    className="inline-flex items-center gap-2 mt-4 text-brand-400 hover:text-brand-300 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Games
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/game-forge/games"
                        className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Edit Game</h1>
                        <p className="text-slate-400 text-sm">ID: {gameId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 text-red-400 border border-slate-700 hover:bg-red-500/10 hover:border-red-500/20 font-bold transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-lg shadow-brand-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Edit Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                        />
                    </div>

                    {/* Genre */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Genre</label>
                        <select
                            value={genre}
                            onChange={(e) => setGenre(e.target.value as GameGenre)}
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
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
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
                                        platforms.includes(p)
                                            ? 'bg-brand-600 text-white border-brand-500'
                                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                    }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pricing Type */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Pricing</label>
                        <select
                            value={pricingType}
                            onChange={(e) => setPricingType(e.target.value as 'free' | 'paid' | 'freemium')}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                        >
                            {PRICING_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Price (only if paid) */}
                    {pricingType === 'paid' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Price ($)</label>
                            <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={price}
                                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                            />
                        </div>
                    )}

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as GameStatus)}
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
            </div>
        </div>
    );
}
