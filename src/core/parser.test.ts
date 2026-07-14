import { describe, it, expect } from 'vitest';
import { parseUrl } from './parser';

const BASE = 'https://www.google.com/search';
const withQ = (q: string) => parseUrl(`${BASE}?q=${encodeURIComponent(q)}`);
const withParam = (k: string, v: string) => parseUrl(`${BASE}?${k}=${encodeURIComponent(v)}`);

describe('parseUrl — q operators', () => {
  it('reads a single include domain', () => {
    expect(withQ('site:nasa.gov').includeDomains).toEqual(['nasa.gov']);
  });

  it('reads an OR group of include domains', () => {
    expect(withQ('(site:a.com OR site:b.com)').includeDomains).toEqual(['a.com', 'b.com']);
  });

  it('accepts a pipe-separated group for wild URLs', () => {
    expect(withQ('(site:a.com | site:b.com)').includeDomains).toEqual(['a.com', 'b.com']);
  });

  it('treats a quoted phrase as atomic (no operator parsing inside)', () => {
    const s = withQ('"site:foo.com -bar"');
    expect(s.exactPhrases).toEqual(['site:foo.com -bar']);
    expect(s.includeDomains).toEqual([]);
    expect(s.excludeTerms).toEqual([]);
  });

  it('separates excluded terms, excluded domains and free text', () => {
    const s = withQ('-cats -site:spam.com dogs');
    expect(s.excludeTerms).toEqual(['cats']);
    expect(s.excludeDomains).toEqual(['spam.com']);
    expect(s.freeText).toBe('dogs');
  });

  it('treats ext: as an alias of filetype:', () => {
    expect(withQ('ext:pdf').fileTypes).toEqual(['pdf']);
  });

  it('collects multiple filetypes', () => {
    expect(withQ('filetype:pdf filetype:docx').fileTypes).toEqual(['pdf', 'docx']);
  });
});

describe('parseUrl — tbs', () => {
  it('reads a custom date range and converts to ISO', () => {
    expect(withParam('tbs', 'cdr:1,cd_min:1/1/2010,cd_max:12/31/2012').date).toEqual({
      mode: 'custom',
      min: '2010-01-01',
      max: '2012-12-31',
    });
  });

  it('reads a quick date range', () => {
    expect(withParam('tbs', 'qdr:w').date).toEqual({ mode: 'quick', value: 'w' });
  });

  it('preserves unknown tbs directives in tbsExtra', () => {
    const s = withParam('tbs', 'sbd:1,cdr:1,cd_min:1/1/2010,cd_max:2/2/2020');
    expect(s.date.mode).toBe('custom');
    expect(s.tbsExtra).toEqual(['sbd:1']);
  });

  it('ignores an unknown qdr value but keeps it lossless', () => {
    const s = withParam('tbs', 'qdr:zzz');
    expect(s.date).toEqual({ mode: 'none' });
    expect(s.tbsExtra).toEqual(['qdr:zzz']);
  });
});

describe('parseUrl — udm', () => {
  it('detects pure mode from udm=14', () => {
    expect(withParam('udm', '14').pureMode).toBe(true);
  });

  it('does not treat other udm values as pure mode', () => {
    expect(withParam('udm', '2').pureMode).toBe(false);
  });
});
