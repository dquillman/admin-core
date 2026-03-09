import { User, Clock } from 'lucide-react';
import type { GameForgePlayer, SubscriptionTier } from '../../types/gameForge';
import XPProgressBar from './XPProgressBar';

const tierStyles: Record<SubscriptionTier, string> = {
    free: 'bg-slate-800 text-slate-400 border-slate-700',
    pro: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    elite: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

interface PlayerCardProps {
    player: GameForgePlayer;
    onClick?: () => void;
}

function formatRelativeTime(ts: { toDate?: () => Date } | undefined): string {
    if (!ts || !ts.toDate) return 'Unknown';
    const diff = Date.now() - ts.toDate().getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function PlayerCard({ player, onClick }: PlayerCardProps) {
    return (
        <div
            onClick={onClick}
            className="group relative bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-brand-500/30 transition-all duration-300 cursor-pointer"
        >
            <div className="space-y-4">
                {/* Avatar & Name */}
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {player.avatar ? (
                            <img
                                src={player.avatar}
                                alt={player.displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-6 h-6 text-slate-600" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white truncate group-hover:text-brand-400 transition-colors">
                            {player.displayName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(player.lastActive)}
                        </div>
                    </div>
                </div>

                {/* Level badge */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-brand-500/10 text-brand-400 border-brand-500/20 uppercase tracking-wider">
                        Lv {player.level}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${tierStyles[player.subscriptionTier]}`}>
                        {player.subscriptionTier}
                    </span>
                </div>

                {/* XP Progress */}
                <XPProgressBar xp={player.xp} level={player.level} />
            </div>
        </div>
    );
}
