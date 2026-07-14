import { describe, it, expect } from 'vitest';
import { buildUrl } from './builder';
import { emptyState, type FilterState } from './types';

const BASE = 'https://www.google.com/search';
const make = (over: Partial<FilterState>): FilterState => ({ ...emptyState(), ...over });
const qOf = (url: string) => new URL(url).searchParams.get('q') ?? '';
const paramsOf = (url: string) => new URL(url).searchParams;

describe('buildUrl', () => {
  it('emits filetype: and site: operators (spec §6 example)', () => {
    const url = buildUrl(make({ fileTypes: ['pdf'], includeDomains: ['nasa.gov'] }), BASE);
    expect(url).toContain('filetype:pdf');
    expect(url).toContain('site:nasa.gov');
  });

  it('wraps an exact phrase in quotes', () => {
    expect(qOf(buildUrl(make({ exactPhrases: ['climate change'] }), BASE))).toBe('"climate change"');
  });

  it('uses a bare site: for a single include domain', () => {
    expect(qOf(buildUrl(make({ includeDomains: ['nasa.gov'] }), BASE))).toBe('site:nasa.gov');
  });

  it('groups multiple include domains with OR', () => {
    expect(qOf(buildUrl(make({ includeDomains: ['a.com', 'b.com'] }), BASE))).toBe(
      '(site:a.com OR site:b.com)',
    );
  });

  it('emits -site: and -term for exclusions', () => {
    const q = qOf(buildUrl(make({ excludeDomains: ['x.com'], excludeTerms: ['ads'] }), BASE));
    expect(q).toContain('-site:x.com');
    expect(q).toContain('-ads');
  });

  describe('input sanitization (UI can produce these)', () => {
    it('quotes multi-word excluded terms', () => {
      expect(qOf(buildUrl(make({ excludeTerms: ['foo bar'] }), BASE))).toBe('-"foo bar"');
    });

    it('strips embedded double quotes from exact phrases', () => {
      expect(qOf(buildUrl(make({ exactPhrases: ['a"b'] }), BASE))).toBe('"ab"');
    });

    it('strips whitespace from domains', () => {
      const q = qOf(buildUrl(make({ includeDomains: ['nasa .gov'], excludeDomains: [' spam.com '] }), BASE));
      expect(q).toContain('site:nasa.gov');
      expect(q).toContain('-site:spam.com');
    });
  });

  it('serializes a custom date range into tbs=cdr', () => {
    const url = buildUrl(make({ date: { mode: 'custom', min: '2010-01-01', max: '2012-12-31' } }), BASE);
    expect(paramsOf(url).get('tbs')).toBe('cdr:1,cd_min:1/1/2010,cd_max:12/31/2012');
  });

  it('serializes a quick date range into tbs=qdr', () => {
    expect(paramsOf(buildUrl(make({ date: { mode: 'quick', value: 'w' } }), BASE)).get('tbs')).toBe(
      'qdr:w',
    );
  });

  it('sets udm=14 for pure mode', () => {
    expect(paramsOf(buildUrl(make({ pureMode: true }), BASE)).get('udm')).toBe('14');
  });

  describe('mutate, do not replace', () => {
    it('preserves unrelated params and does not strip num=', () => {
      const url = buildUrl(make({ fileTypes: ['pdf'] }), `${BASE}?q=old&hl=it&gl=IT&num=100`);
      const p = paramsOf(url);
      expect(p.get('hl')).toBe('it');
      expect(p.get('gl')).toBe('IT');
      expect(p.get('num')).toBe('100');
    });

    it('regenerates q from state (does not merge the base q)', () => {
      const url = buildUrl(make({ fileTypes: ['pdf'] }), `${BASE}?q=old+stuff`);
      expect(qOf(url)).toBe('filetype:pdf');
      expect(qOf(url)).not.toContain('old');
    });

    it('removes our udm=14 when pure mode is turned off', () => {
      const url = buildUrl(make({ pureMode: false }), `${BASE}?udm=14&q=x`);
      expect(paramsOf(url).get('udm')).toBeNull();
    });

    it('leaves a non-14 udm untouched (not ours)', () => {
      const url = buildUrl(make({}), `${BASE}?udm=2`);
      expect(paramsOf(url).get('udm')).toBe('2');
    });
  });
});
