import type { User } from '../types';

export interface AlertRule {
    id: string;
    name: string;
    description: string;
    severity: 'warning' | 'critical';
    evaluate: (user: User) => boolean;
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
    {
        id: 'high-usage-no-billing',
        name: 'High Usage, No Billing',
        description: 'User has high usage score but no billing status set',
        severity: 'critical',
        evaluate: (u) => (u.usageScore ?? 0) >= 60 && (!u.billingStatus || u.billingStatus === 'unknown'),
    },
    {
        id: 'low-usage-paid',
        name: 'Low Usage, Paid',
        description: 'Paid user with very low activity — possible churn risk',
        severity: 'warning',
        evaluate: (u) => (u.usageScore ?? 0) < 10 && u.billingStatus === 'paid',
    },
    {
        id: 'tester-power-user',
        name: 'Tester Power User',
        description: 'Tester with power-level usage — conversion candidate',
        severity: 'warning',
        evaluate: (u) => u.testerOverride === true && (u.usageScore ?? 0) >= 85,
    },
    {
        id: 'expired-tester-active',
        name: 'Expired Tester Still Active',
        description: 'Tester access expired but usage score still high',
        severity: 'warning',
        evaluate: (u) => {
            if (!u.testerExpiresAt || typeof u.testerExpiresAt.toDate !== 'function') return false;
            const expired = u.testerExpiresAt.toDate() < new Date();
            return expired && (u.usageScore ?? 0) >= 30;
        },
    },
];

export interface TriggeredAlert {
    rule: AlertRule;
    user: User;
}

export function evaluateAlerts(users: User[], rules: AlertRule[] = DEFAULT_ALERT_RULES): TriggeredAlert[] {
    const alerts: TriggeredAlert[] = [];
    for (const user of users) {
        for (const rule of rules) {
            try {
                if (rule.evaluate(user)) {
                    alerts.push({ rule, user });
                }
            } catch (err) {
                console.error(`[BillingAlerts] Rule "${rule.id}" failed for user "${user.uid ?? 'unknown'}":`, err);
            }
        }
    }
    return alerts;
}
