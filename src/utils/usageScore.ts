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
    if (score >= 85) return 'Power User';
    if (score >= 60) return 'Active';
    if (score >= 30) return 'Engaged';
    if (score >= 10) return 'Curious';
    return 'Dormant';
};

export const BAND_COLORS: Record<UsageBand, { bar: string; text: string; bg: string; border: string; ring: string }> = {
    'Dormant':    { bar: 'bg-slate-600',   text: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20', ring: 'stroke-slate-600' },
    'Curious':    { bar: 'bg-blue-500',    text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',  ring: 'stroke-blue-500' },
    'Engaged':    { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'stroke-emerald-500' },
    'Active':     { bar: 'bg-teal-500',    text: 'text-teal-400',    bg: 'bg-teal-500/10',    border: 'border-teal-500/20',  ring: 'stroke-teal-500' },
    'Power User': { bar: 'bg-purple-500',  text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20', ring: 'stroke-purple-500' },
};
