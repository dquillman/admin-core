import type { UsageBand } from '../types';

export const USAGE_BANDS: { min: number; max: number; band: UsageBand }[] = [
    { min: 85, max: 100, band: 'Power User' },
    { min: 60, max: 84,  band: 'Active' },
    { min: 30, max: 59,  band: 'Engaged' },
    { min: 10, max: 29,  band: 'Curious' },
    { min: 0,  max: 9,   band: 'Dormant' },
];

export const ALL_BANDS: UsageBand[] = ['Power User', 'Active', 'Engaged', 'Curious', 'Dormant'];

export const getBandFromScore = (score: number): UsageBand => {
    const match = USAGE_BANDS.find(b => score >= b.min && score <= b.max);
    return match ? match.band : 'Dormant';
};

// --- Confidence Thresholds (EC-98) ---
export type ScoreConfidence = 'low' | 'medium' | 'high';

export const CONFIDENCE_COLORS: Record<ScoreConfidence, { text: string; bg: string; border: string }> = {
    low:    { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
    medium: { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
    high:   { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

export function getScoreConfidence(breakdown?: { activeDays?: number; coreActions?: number; completions?: number }): ScoreConfidence {
    if (!breakdown) return 'low';
    const days = breakdown.activeDays ?? 0;
    const actions = breakdown.coreActions ?? 0;
    // High: 7+ active days and 10+ actions
    if (days >= 7 && actions >= 10) return 'high';
    // Medium: 3+ active days or 5+ actions
    if (days >= 3 || actions >= 5) return 'medium';
    return 'low';
}

export const BAND_COLORS: Record<UsageBand, { bar: string; text: string; bg: string; border: string; ring: string }> = {
    'Dormant':    { bar: 'bg-slate-600',   text: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20', ring: 'stroke-slate-600' },
    'Curious':    { bar: 'bg-blue-500',    text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',  ring: 'stroke-blue-500' },
    'Engaged':    { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'stroke-emerald-500' },
    'Active':     { bar: 'bg-teal-500',    text: 'text-teal-400',    bg: 'bg-teal-500/10',    border: 'border-teal-500/20',  ring: 'stroke-teal-500' },
    'Power User': { bar: 'bg-purple-500',  text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20', ring: 'stroke-purple-500' },
};
