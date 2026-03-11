import { describe, it, expect } from 'vitest';
import { parseOS, parseBrowser } from '../uaParser';

describe('parseOS', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Windows 10/11'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'macOS 10.15'],
    ['Mozilla/5.0 (X11; Linux x86_64)', 'Linux'],
    ['Mozilla/5.0 (X11; CrOS x86_64)', 'ChromeOS'],
    ['Mozilla/5.0 (Linux; Android 13)', 'Android 13'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)', 'iOS 16.0'],
    ['', 'Unknown'],
  ])('parses "%s" → %s', (ua, expected) => {
    expect(parseOS(ua)).toBe(expected);
  });
});

describe('parseBrowser', () => {
  it.each([
    ['Chrome/120.0.0.0 Safari/537.36', 'Chrome 120.0.0.0'],
    ['Chrome/120 Edg/120.0', 'Edge 120.0'],
    ['Version/17.0 Safari/605.1', 'Safari 17.0'],
    ['Firefox/121.0', 'Firefox 121.0'],
    ['', 'Unknown'],
  ])('parses "%s" → %s', (ua, expected) => {
    expect(parseBrowser(ua)).toBe(expected);
  });
});
