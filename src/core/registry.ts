/**
 * Declarative filter registry (spec §3.2) — the backbone for resilience.
 *
 * Each filter is one typed object. Builder and parser iterate this list; the UI renders from
 * it; the `enabled` flag is the local kill-switch (spec §3.7). Adding, removing or disabling a
 * filter is a change *here* — builder/parser/UI never name a filter by hand.
 *
 * `apply` writes the filter's value into the build context; `read` extracts it back from the
 * pre-tokenized read context. Channels are orthogonal: q operators go into `ctx.q`, structured
 * params into `ctx.tbs` / `ctx.params`. Unhandled channels are simply absent here — the builder
 * has nothing to dispatch, so they no-op by construction (e.g. the reserved `as` channel).
 */
import type { DateFilter, FilterState } from './types';
import { isoToUs, type QTokens } from './codec';

export type Channel = 'q' | 'as' | 'tbs' | 'udm';
export type FilterSection = 'base' | 'experimental';

export interface BuildCtx {
  /** Accumulated q= operator parts, joined in registry order. */
  q: string[];
  /** Accumulated tbs= directives. */
  tbs: string[];
  /** The URL params being mutated (for param channels like udm). */
  params: URLSearchParams;
}

export interface ReadCtx {
  qt: QTokens;
  date: DateFilter;
  params: URLSearchParams;
}

export interface FilterDef<K extends keyof FilterState = keyof FilterState> {
  id: K;
  /** i18n key (chrome.i18n / _locales). Never a hardcoded label. */
  labelKey: string;
  channel: Channel;
  section: FilterSection;
  experimental: boolean;
  /** Local kill-switch. Disabled filters are skipped by builder and parser. */
  enabled: boolean;
  // `apply` is intentionally a method (bivariant params) so the heterogeneous array below
  // is assignable to FilterDef[] under strict variance.
  apply(value: FilterState[K], ctx: BuildCtx): void;
  read(ctx: ReadCtx): FilterState[K];
}

/** Identity helper that preserves each entry's literal key type. */
function def<K extends keyof FilterState>(d: FilterDef<K>): FilterDef<K> {
  return d;
}

export const REGISTRY: ReadonlyArray<FilterDef> = [
  def<'exactPhrases'>({
    id: 'exactPhrases',
    labelKey: 'filter_exactPhrase',
    channel: 'q',
    section: 'base',
    experimental: false,
    enabled: true,
    apply(value, ctx) {
      // Embedded double quotes would corrupt tokenization (and Google can't search them).
      for (const phrase of value) {
        const clean = phrase.replace(/"/g, '').trim();
        if (clean) ctx.q.push(`"${clean}"`);
      }
    },
    read: (ctx) => ctx.qt.phrases,
  }),

  def<'includeDomains'>({
    id: 'includeDomains',
    labelKey: 'filter_includeDomains',
    channel: 'q',
    section: 'base',
    experimental: false,
    enabled: true,
    apply(value, ctx) {
      // Domains cannot contain whitespace; a stray space would split the token.
      const domains = value.map((d) => d.replace(/\s+/g, '')).filter(Boolean);
      if (domains.length === 1) ctx.q.push(`site:${domains[0]}`);
      else if (domains.length > 1) {
        ctx.q.push(`(${domains.map((d) => `site:${d}`).join(' OR ')})`);
      }
    },
    read: (ctx) => ctx.qt.includeDomains,
  }),

  def<'excludeDomains'>({
    id: 'excludeDomains',
    labelKey: 'filter_excludeDomains',
    channel: 'q',
    section: 'base',
    experimental: false,
    enabled: true,
    apply(value, ctx) {
      for (const raw of value) {
        const domain = raw.replace(/\s+/g, '');
        if (domain) ctx.q.push(`-site:${domain}`);
      }
    },
    read: (ctx) => ctx.qt.excludeDomains,
  }),

  def<'excludeTerms'>({
    id: 'excludeTerms',
    labelKey: 'filter_excludeTerms',
    channel: 'q',
    section: 'base',
    experimental: false,
    enabled: true,
    apply(value, ctx) {
      // Multi-word exclusions must be quoted (`-foo bar` would exclude only "foo" and leak
      // "bar" into the free text). Quotes inside the term are stripped for the same reason.
      for (const term of value) {
        const clean = term.replace(/"/g, '').trim();
        if (!clean) continue;
        ctx.q.push(/\s/.test(clean) ? `-"${clean}"` : `-${clean}`);
      }
    },
    read: (ctx) => ctx.qt.excludeTerms,
  }),

  def<'fileTypes'>({
    id: 'fileTypes',
    labelKey: 'filter_fileType',
    channel: 'q',
    section: 'base',
    experimental: false,
    enabled: true,
    apply(value, ctx) {
      for (const ext of value) if (ext.trim()) ctx.q.push(`filetype:${ext}`);
    },
    read: (ctx) => ctx.qt.fileTypes,
  }),

  def<'date'>({
    id: 'date',
    labelKey: 'filter_date',
    channel: 'tbs',
    section: 'base',
    experimental: false,
    enabled: true,
    apply(value, ctx) {
      if (value.mode === 'custom') {
        ctx.tbs.push('cdr:1', `cd_min:${isoToUs(value.min)}`, `cd_max:${isoToUs(value.max)}`);
      } else if (value.mode === 'quick') {
        ctx.tbs.push(`qdr:${value.value}`);
      }
    },
    read: (ctx) => ctx.date,
  }),

  def<'pureMode'>({
    id: 'pureMode',
    labelKey: 'filter_pureMode',
    channel: 'udm',
    section: 'experimental',
    experimental: true,
    enabled: true,
    apply(value, ctx) {
      if (value) ctx.params.set('udm', '14');
    },
    read: (ctx) => ctx.params.get('udm') === '14',
  }),
];
