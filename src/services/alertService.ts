import { getActivationMetrics, getFunnelMetrics, getTutorImpactMetrics } from './analyticsService';

export type AlertLevel = 'critical' | 'warning' | 'good';

export interface FounderAlert {
    id: string;
    level: AlertLevel;
    message: string;
    metric: string;
    action: string;
}

export const getFounderAlerts = async (): Promise<FounderAlert[]> => {
    const alerts: FounderAlert[] = [];

    try {
        const [activation, funnel, tutor] = await Promise.all([
            getActivationMetrics(),
            getFunnelMetrics(),
            getTutorImpactMetrics()
        ]);

        // 1. Activation Alerts
        if (activation.activationRate < 30) {
            alerts.push({
                id: 'act-crit',
                level: 'critical',
                message: 'Activation Rate is critically low.',
                metric: `${activation.activationRate.toFixed(1)}% (<30%)`,
                action: 'Stop outreach. Fix onboarding and first quiz experience.'
            });
        } else if (activation.activationRate >= 30 && activation.activationRate < 40) {
            alerts.push({
                id: 'act-warn',
                level: 'warning',
                message: 'Activation Rate is suboptimal.',
                metric: `${activation.activationRate.toFixed(1)}% (30-40%)`,
                action: 'Onboarding unclear. Improve first-use guidance.'
            });
        } else {
            alerts.push({
                id: 'act-good',
                level: 'good',
                message: 'Activation Rate is healthy.',
                metric: `${activation.activationRate.toFixed(1)}% (>40%)`,
                action: 'Activation healthy. Safe to continue outreach.'
            });
        }

        // 2. Conversion Intent Alerts
        // Pricing viewed but no upgrade clicks (7 days) -> Value proposition unclear
        // Upgrade clicked but no conversion -> Pricing or trust issue

        // Note: Funnel metrics currently return lifetime counts. 
        // For distinct "7 days" check we would need time-boxed queries, but using available metrics for v1.

        if (funnel.pricingViewed > 0 && funnel.upgradeClicked === 0) {
            alerts.push({
                id: 'conv-warn-pricing',
                level: 'warning',
                message: 'Users are viewing pricing but not clicking upgrade.',
                metric: `${funnel.pricingViewed} views, 0 clicks (${((funnel.upgradeClicked / funnel.pricingViewed) * 100).toFixed(1)}% click rate)`,
                action: 'Value proposition unclear. Review pricing page copy.'
            });
        }

        if (funnel.upgradeClicked > 0 && funnel.converted === 0) {
            alerts.push({
                id: 'conv-crit-checkout',
                level: 'critical',
                message: 'Users clicking upgrade but not converting.',
                metric: `${funnel.upgradeClicked} clicks, 0 conversions (${((funnel.converted / funnel.upgradeClicked) * 100).toFixed(1)}% conv rate)`,
                action: 'Pricing or trust issue. Test checkout flow immediately.'
            });
        }

        // 3. Tutor Impact Alerts
        // correlationScore > 0 -> Good
        if (tutor.correlationScore > 0) {
            alerts.push({
                id: 'tutor-good',
                level: 'good',
                message: 'Tutor usage correlates with higher retention.',
                metric: `+${tutor.correlationScore} impact`,
                action: 'Tutor value proven. Use this in marketing copy.'
            });
        }

    } catch (error) {
        console.error("Failed to generate founder alerts", error);
    }

    return alerts;
};
