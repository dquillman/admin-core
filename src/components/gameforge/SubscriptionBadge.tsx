import React from 'react';
import type { SubscriptionTier } from '../../types/gameForge';

interface SubscriptionBadgeProps {
    tier: SubscriptionTier;
}

const tierStyles: Record<SubscriptionTier, string> = {
    free: 'bg-zinc-700/50 text-zinc-300 border-zinc-600',
    pro: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
    elite: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ tier }) => (
    <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${tierStyles[tier] ?? tierStyles.free}`}
    >
        {tier}
    </span>
);

export default SubscriptionBadge;
