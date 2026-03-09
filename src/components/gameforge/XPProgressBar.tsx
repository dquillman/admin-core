interface XPProgressBarProps {
    xp: number;
    level: number;
}

export default function XPProgressBar({ xp, level }: XPProgressBarProps) {
    const xpForCurrentLevel = (level - 1) * 1000;
    const xpForNextLevel = level * 1000;
    const xpInLevel = xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const percent = Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));

    return (
        <div className="w-full">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>{xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
                <span>Lv {level + 1}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
