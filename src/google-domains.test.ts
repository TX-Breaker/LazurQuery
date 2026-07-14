import { describe, it, expect } from 'vitest';
import { GOOGLE_MATCH_PATTERNS, GOOGLE_NAV_FILTER, isGoogleSerp } from './google-domains';

describe('isGoogleSerp', () => {
  it('accepts www ccTLD hosts (Google 301s bare -> www)', () => {
    expect(isGoogleSerp('https://www.google.it/search?q=x')).toBe(true);
    expect(isGoogleSerp('https://www.google.co.uk/search?q=x')).toBe(true);
    expect(isGoogleSerp('https://www.google.com/search?q=x')).toBe(true);
  });

  it('accepts bare domains too', () => {
    expect(isGoogleSerp('https://google.it/search?q=x')).toBe(true);
    expect(isGoogleSerp('https://google.com/search?q=x')).toBe(true);
  });

  it('rejects lookalike hosts (suffix must be dot-anchored)', () => {
    expect(isGoogleSerp('https://evilgoogle.it/search?q=x')).toBe(false);
    expect(isGoogleSerp('https://notgoogle.com/search?q=x')).toBe(false);
  });

  it('rejects non-search paths and garbage', () => {
    expect(isGoogleSerp('https://www.google.com/maps')).toBe(false);
    expect(isGoogleSerp('not a url')).toBe(false);
    expect(isGoogleSerp('')).toBe(false);
  });
});

describe('match patterns / nav filter', () => {
  it('never uses a TLD wildcard', () => {
    for (const p of GOOGLE_MATCH_PATTERNS) expect(p).not.toMatch(/google\.\*/);
  });

  it('uses subdomain wildcards so www hosts are covered', () => {
    expect(GOOGLE_MATCH_PATTERNS).toContain('*://*.google.it/search*');
  });

  it('nav filter covers both bare and subdomain hosts for every domain', () => {
    const it_ = GOOGLE_NAV_FILTER.url.filter(
      (u) => u.hostEquals === 'google.it' || u.hostSuffix === '.google.it',
    );
    expect(it_).toHaveLength(2);
    for (const u of GOOGLE_NAV_FILTER.url) expect(u.pathPrefix).toBe('/search');
  });
});
