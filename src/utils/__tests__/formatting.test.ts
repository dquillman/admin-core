import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from '../formatting';

describe('sanitizeUrl', () => {
  it.each([
    [null, undefined],
    [undefined, undefined],
    ['', undefined],
    ['http://example.com', 'http://example.com'],
    ['https://example.com', 'https://example.com'],
    ['javascript:alert(1)', undefined],
    ['data:text/html', undefined],
    ['ftp://example.com', undefined],
  ])('sanitizeUrl(%s) → %s', (input, expected) => {
    expect(sanitizeUrl(input)).toBe(expected);
  });
});
