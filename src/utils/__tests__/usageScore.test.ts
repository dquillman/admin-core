import { describe, it, expect } from 'vitest';
import { getBandFromScore, getScoreConfidence } from '../usageScore';

describe('getBandFromScore', () => {
  it.each([
    [0, 'Dormant'],
    [9, 'Dormant'],
    [10, 'Curious'],
    [29, 'Curious'],
    [30, 'Engaged'],
    [59, 'Engaged'],
    [60, 'Active'],
    [84, 'Active'],
    [85, 'Power User'],
    [100, 'Power User'],
  ])('score %d → %s', (score, expected) => {
    expect(getBandFromScore(score)).toBe(expected);
  });
});

describe('getScoreConfidence', () => {
  it('returns low when no breakdown is provided', () => {
    expect(getScoreConfidence()).toBe('low');
  });

  it('returns low for minimal activity', () => {
    expect(getScoreConfidence({ activeDays: 1, coreActions: 2 })).toBe('low');
  });

  it('returns medium for 3+ active days', () => {
    expect(getScoreConfidence({ activeDays: 3, coreActions: 0 })).toBe('medium');
  });

  it('returns medium for 5+ core actions', () => {
    expect(getScoreConfidence({ activeDays: 0, coreActions: 5 })).toBe('medium');
  });

  it('returns high for 7+ days and 10+ actions', () => {
    expect(getScoreConfidence({ activeDays: 7, coreActions: 10 })).toBe('high');
  });
});
