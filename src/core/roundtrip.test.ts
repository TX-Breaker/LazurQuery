import { describe, it, expect } from 'vitest';
import { buildUrl } from './builder';
import { parseUrl } from './parser';
import { emptyState, type FilterState } from './types';

const BASE = 'https://www.google.com/search';
const make = (over: Partial<FilterState>): FilterState => ({ ...emptyState(), ...over });
const roundTrip = (s: FilterState) => parseUrl(buildUrl(s, BASE));

describe('round-trip: parse(build(x)) deep-equals x for canonical states', () => {
  const cases: ReadonlyArray<[string, FilterState]> = [
    ['empty', make({})],
    ['single phrase', make({ exactPhrases: ['hello world'] })],
    ['multiple phrases', make({ exactPhrases: ['a b', 'c'] })],
    ['single include domain', make({ includeDomains: ['nasa.gov'] })],
    ['multiple include domains (OR group)', make({ includeDomains: ['a.com', 'b.org', 'c.net'] })],
    ['exclude domains', make({ excludeDomains: ['spam.com', 'ads.net'] })],
    ['exclude terms', make({ excludeTerms: ['cats', 'dogs'] })],
    ['multi-word exclude term', make({ excludeTerms: ['climate change', 'ads'] })],
    ['single filetype', make({ fileTypes: ['pdf'] })],
    ['multiple filetypes', make({ fileTypes: ['pdf', 'docx'] })],
    ['custom date range', make({ date: { mode: 'custom', min: '2010-01-01', max: '2012-12-31' } })],
    ['quick date range', make({ date: { mode: 'quick', value: 'y' } })],
    ['pure mode', make({ pureMode: true })],
    ['free text', make({ freeText: 'climate change report' })],
    ['tbs extra preserved', make({ tbsExtra: ['sbd:1'] })],
    [
      'kitchen sink',
      make({
        exactPhrases: ['exact match'],
        includeDomains: ['nasa.gov', 'esa.int'],
        excludeDomains: ['pinterest.com'],
        excludeTerms: ['ai'],
        fileTypes: ['pdf'],
        date: { mode: 'custom', min: '2000-06-15', max: '2020-01-02' },
        pureMode: true,
        freeText: 'mars rover',
        tbsExtra: ['sbd:1'],
      }),
    ],
  ];

  for (const [name, state] of cases) {
    it(name, () => expect(roundTrip(state)).toEqual(state));
  }
});

describe('idempotence on wild URLs: parse(build(parse(u))) deep-equals parse(u)', () => {
  const wild: ReadonlyArray<[string, string]> = [
    ['interleaved operators + text', 'cats site:a.com dogs -ai filetype:pdf "exact one"'],
    ['pipe OR group + locale params', '(site:a.com | site:b.com) hello'],
    ['ext alias + excluded site', 'ext:doc -site:spam.com report'],
    ['mixed bare + grouped include', 'site:x.com (site:y.com OR site:z.com) text'],
  ];

  for (const [name, q] of wild) {
    it(name, () => {
      const u = `${BASE}?q=${encodeURIComponent(q)}&hl=it&gl=IT`;
      const once = parseUrl(u);
      expect(parseUrl(buildUrl(once, u))).toEqual(once);
    });
  }

  it('wild tbs with unknown directives is stable', () => {
    const u = `${BASE}?tbs=${encodeURIComponent('sbd:1,cdr:1,cd_min:1/1/2010,cd_max:2/2/2020,lr:lang_en')}`;
    const once = parseUrl(u);
    expect(once.date).toEqual({ mode: 'custom', min: '2010-01-01', max: '2020-02-02' });
    expect(once.tbsExtra).toEqual(['sbd:1', 'lr:lang_en']);
    expect(parseUrl(buildUrl(once, u))).toEqual(once);
  });
});
