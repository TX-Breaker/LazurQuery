/**
 * Core domain types. The URL is the single source of truth (spec §3.1); this is the
 * in-memory mirror the UI edits. The builder serializes it back to a Google URL and the
 * parser reconstructs it — the two are tested to be mutually coherent (round-trip).
 */

export type Channel = 'q' | 'as' | 'tbs' | 'udm';

export type QuickRange = 'd' | 'w' | 'm' | 'y';

/** Date filter as a discriminated union: cdr (custom) and qdr (quick) are mutually exclusive. */
export type DateFilter =
  | { mode: 'none' }
  | { mode: 'quick'; value: QuickRange }
  | { mode: 'custom'; min: string; max: string }; // ISO yyyy-mm-dd (datepicker-friendly)

export interface FilterState {
  /** q: each wrapped in "..." */
  exactPhrases: string[];
  /** q: site:a (single) or (site:a OR site:b) (grouped) */
  includeDomains: string[];
  /** q: -site:a */
  excludeDomains: string[];
  /** q: -term */
  excludeTerms: string[];
  /** q: filetype:pdf */
  fileTypes: string[];
  /** tbs: cdr (custom) / qdr (quick) */
  date: DateFilter;
  /** udm=14 — experimental "pure web, no AI" mode */
  pureMode: boolean;
  /** Lossless remainder of q= not claimed by any filter (round-trips verbatim at token level). */
  freeText: string;
  /** Lossless remainder of tbs= directives not claimed by the date filter (order preserved). */
  tbsExtra: string[];
}

/** Canonical empty state. The parser always returns a fully-populated shape (clean deep-equality). */
export function emptyState(): FilterState {
  return {
    exactPhrases: [],
    includeDomains: [],
    excludeDomains: [],
    excludeTerms: [],
    fileTypes: [],
    date: { mode: 'none' },
    pureMode: false,
    freeText: '',
    tbsExtra: [],
  };
}
