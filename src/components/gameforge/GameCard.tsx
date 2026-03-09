import { Gamepad2, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { GameForgeGame, GameGenre, GameStatus } from '../../types/gameForge';

const genreColors: Record<GameGenre, string> = {
    action: 'bg-red-500/10 text-red-400 border-red-500/20',
    puzzle: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    strategy: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rpg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    casual: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    sports: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const statusStyles: Record<GameStatus, string> = {
    draft: 'bg-slate-800 text-slate-400 border-slate-700',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    archived: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const platformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
        case 'web':
            return <Monitor className="w-3.5 h-3.5" />;
        case 'ios':
        case 'android':
            return <Smartphone className="w-3.5 h-3.5" />;
        case 'tablet':
            return <Tablet className="w-3.5 h-3.5" />;
        default:
            return <Gamepad2 className="w-3.5 h-3.5" />;
    }
};

interface GameCardProps {
    game: GameForgeGame;
    onClick?: () => void;
}

export default function GameCard({ game, onClick }: GameCardProps) {
    return (
        <div
            onClick={onClick}
            className="group relative bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-brand-500/30 transition-all duration-300 cursor-pointer"
        >
            <div className="space-y-4">
                {/* Thumbnail / Placeholder */}
                <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                    {game.thumbnailUrl ? (
                        <img
                            src={game.thumbnailUrl}
                            alt={game.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Gamepad2 className="w-10 h-10 text-slate-600" />
                    )}
                </div>

                {/* Title & Description */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-1 tracking-tight group-hover:text-brand-400 transition-colors">
                        {game.title}
                    </h3>
                    <p className="text-slate-400 text-sm line-clamp-2">{game.description}</p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${genreColors[game.genre]}`}>
                        {game.genre}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusStyles[game.status]}`}>
                        {game.status}
                    </span>
                </div>

                {/* Platforms */}
                {game.platforms && game.platforms.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        {game.platforms.map((p) => (
                            <span
                                key={p}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px] border border-slate-700 uppercase tracking-wider"
                            >
                                {platformIcon(p)}
                                {p}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
