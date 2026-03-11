import { describe, it, expect, vi } from 'vitest';
import { evaluateAlerts } from '../billingAlerts';
import type { User } from '../../types';

/** Minimal mock user — only the fields the alert rules inspect. */
function mockUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'test-uid',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  } as User;
}

describe('evaluateAlerts', () => {
  it('triggers high-usage-no-billing for high usage + unknown billing', () => {
    const users = [mockUser({ usageScore: 60, billingStatus: 'unknown' })];
    const alerts = evaluateAlerts(users);
    const ids = alerts.map(a => a.rule.id);
    expect(ids).toContain('high-usage-no-billing');
  });

  it('triggers low-usage-paid for paid user with very low usage', () => {
    const users = [mockUser({ usageScore: 5, billingStatus: 'paid' })];
    const alerts = evaluateAlerts(users);
    const ids = alerts.map(a => a.rule.id);
    expect(ids).toContain('low-usage-paid');
  });

  it('triggers tester-power-user for tester with power-level usage', () => {
    const users = [mockUser({ testerOverride: true, usageScore: 85 })];
    const alerts = evaluateAlerts(users);
    const ids = alerts.map(a => a.rule.id);
    expect(ids).toContain('tester-power-user');
  });

  it('returns no alerts for a normal paid user with moderate usage', () => {
    const users = [mockUser({ usageScore: 50, billingStatus: 'paid' })];
    const alerts = evaluateAlerts(users);
    expect(alerts).toHaveLength(0);
  });

  it('catches errors in rules gracefully', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badRule = {
      id: 'bad-rule',
      name: 'Bad Rule',
      description: 'Always throws',
      severity: 'warning' as const,
      evaluate: () => { throw new Error('boom'); },
    };
    const users = [mockUser()];
    const alerts = evaluateAlerts(users, [badRule]);
    expect(alerts).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
