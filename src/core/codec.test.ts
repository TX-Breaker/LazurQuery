import { describe, it, expect } from 'vitest';
import { tokenizeQ, parseTbs, usToIso, isoToUs } from './codec';
import { REGISTRY } from './registry';
import { buildUrl } from './builder';
import { parseUrl } from './parser';
import { emptyState, type FilterState } from './types';

describe('date conversion', () => {
  it('usToIso pads single-digit month/day', () => {
    expect(usToIso('1/1/2010')).toBe('2010-01-01');
    expect(usToIso('12/31/2012')).toBe('2012-12-31');
  });

  it('usToIso rejects malformed input', () => {
    expect(usToIso('2010-01-01')).toBeUndefined();
    expect(usToIso('nope')).toBeUndefined();
  });

  it('isoToUs strips leading zeros', () => {
    expect(isoToUs('2010-01-01')).toBe('1/1/2010');
    expect(isoToUs('2020-12-09')).toBe('12/9/2020');
  });
});

describe('tokenizeQ', () => {
  it('pulls quoted phrases out first, atomically', () => {
    const t = tokenizeQ('"a b" cats "c"');
    expect(t.phrases).toEqual(['a b', 'c']);
    expect(t.rest).toEqual(['cats']);
  });

  it('classifies every operator family in one pass', () => {
    const t = tokenizeQ('site:a.com -site:b.com -cats filetype:pdf free text');
    expect(t.includeDomains).toEqual(['a.com']);
    expect(t.excludeDomains).toEqual(['b.com']);
    expect(t.excludeTerms).toEqual(['cats']);
    expect(t.fileTypes).toEqual(['pdf']);
    expect(t.rest).toEqual(['free', 'text']);
  });

  it('drops empty quotes without crashing', () => {
    expect(tokenizeQ('""').phrases).toEqual([]);
  });

  it('routes -"..." to excluded terms, not phrases (multi-word exclusions)', () => {
    const t = tokenizeQ('-"foo bar" baz "kept phrase"');
    expect(t.excludeTerms).toEqual(['foo bar']);
    expect(t.phrases).toEqual(['kept phrase']);
    expect(t.rest).toEqual(['baz']);
  });
});

describe('parseTbs', () => {
  it('returns none for empty input', () => {
    expect(parseTbs('')).toEqual({ date: { mode: 'none' }, extra: [] });
  });

  it('keeps a stray qdr alongside a custom range', () => {
    const r = parseTbs('cdr:1,cd_min:1/1/2010,cd_max:2/2/2020,qdr:y');
    expect(r.date.mode).toBe('custom');
    expect(r.extra).toEqual(['qdr:y']);
  });
});

describe('kill-switch (spec §3.7 / DoD)', () => {
  const make = (over: Partial<FilterState>): FilterState => ({ ...emptyState(), ...over });
  const qOf = (url: string) => new URL(url).searchParams.get('q') ?? '';

  it('disabling an experimental filter does not break the rest', () => {
    const pure = REGISTRY.find((d) => d.id === 'pureMode');
    expect(pure).toBeDefined();
    const original = pure!.enabled;
    pure!.enabled = false;
    try {
      const url = buildUrl(make({ pureMode: true, fileTypes: ['pdf'] }), 'https://www.google.com/search');
      // pureMode is off: udm not emitted, but the rest still works.
      expect(new URL(url).searchParams.get('udm')).toBeNull();
      expect(qOf(url)).toContain('filetype:pdf');

      const back = parseUrl(url);
      expect(back.fileTypes).toEqual(['pdf']);
      expect(back.pureMode).toBe(false);
    } finally {
      pure!.enabled = original;
    }
  });
});
