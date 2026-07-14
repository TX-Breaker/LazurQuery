/**
 * Pure tokenization / serialization primitives shared by builder and parser.
 *
 * Centralizing token classification here is the one principled exception to "logic lives
 * only in the registry" (spec §3.2): the q= and tbs= strings are shared channels, so their
 * lossless classification must happen once, in a single pass, to avoid filters double-claiming
 * tokens. Adding a filter of an existing *shape* is still registry-only; a brand-new operator
 * shape touches these tokenizers.
 */
import type { DateFilter, QuickRange } from './types';

export interface QTokens {
  phrases: string[];
  includeDomains: string[];
  excludeDomains: string[];
  excludeTerms: string[];
  fileTypes: string[];
  /** Everything not claimed by a recognized operator. */
  rest: string[];
}

const QUICK_VALUES: ReadonlySet<string> = new Set<QuickRange>(['d', 'w', 'm', 'y']);

/** Single-pass, lossless tokenizer for a *decoded* q= string. */
export function tokenizeQ(raw: string): QTokens {
  const out: QTokens = {
    phrases: [],
    includeDomains: [],
    excludeDomains: [],
    excludeTerms: [],
    fileTypes: [],
    rest: [],
  };
  let s = raw;

  // 1a. Excluded quoted phrases -"..." (the builder emits these for multi-word excluded
  // terms). Must run before plain phrases or the quotes get claimed and the '-' dangles.
  s = s.replace(/-"([^"]*)"/g, (_match, body: string) => {
    if (body) out.excludeTerms.push(body);
    return ' ';
  });

  // 1b. Quoted phrases are atomic: extract first, never tokenize their contents.
  s = s.replace(/"([^"]*)"/g, (_match, body: string) => {
    if (body) out.phrases.push(body);
    return ' ';
  });

  // 2. Canonical include-domain OR-group: (site:a OR site:b ...). `|` accepted for wild URLs.
  s = s.replace(
    /\(\s*site:\S+(?:\s+(?:OR|\|)\s+site:\S+)*\s*\)/gi,
    (group: string) => {
      const inner = group.slice(1, -1);
      for (const part of inner.split(/\s+(?:OR|\|)\s+/i)) {
        const domain = part.trim().replace(/^site:/i, '');
        if (domain) out.includeDomains.push(domain);
      }
      return ' ';
    },
  );

  // 3. Whitespace-split the remainder and classify by prefix.
  for (const token of s.split(/\s+/)) {
    if (!token) continue;
    const lower = token.toLowerCase();
    if (lower.startsWith('-site:')) {
      const d = token.slice(6);
      if (d) out.excludeDomains.push(d);
    } else if (lower.startsWith('site:')) {
      const d = token.slice(5);
      if (d) out.includeDomains.push(d);
    } else if (lower.startsWith('filetype:')) {
      const f = token.slice(9);
      if (f) out.fileTypes.push(f);
    } else if (lower.startsWith('ext:')) {
      const f = token.slice(4);
      if (f) out.fileTypes.push(f);
    } else if (token.startsWith('-') && token.length > 1) {
      out.excludeTerms.push(token.slice(1));
    } else {
      out.rest.push(token);
    }
  }

  return out;
}

export interface ParsedTbs {
  date: DateFilter;
  /** Unknown tbs directives, preserved verbatim and in order. */
  extra: string[];
}

/** Lossless tbs= parser: pulls cdr/qdr date directives, preserves everything else. */
export function parseTbs(raw: string): ParsedTbs {
  if (!raw) return { date: { mode: 'none' }, extra: [] };

  const extra: string[] = [];
  let hasCdr = false;
  let rawMin: string | undefined;
  let rawMax: string | undefined;
  let quick: QuickRange | undefined;

  for (const directive of raw.split(',')) {
    const idx = directive.indexOf(':');
    const key = (idx >= 0 ? directive.slice(0, idx) : directive).toLowerCase();
    const value = idx >= 0 ? directive.slice(idx + 1) : '';
    switch (key) {
      case 'cdr':
        hasCdr = true;
        break;
      case 'cd_min':
        rawMin = value;
        break;
      case 'cd_max':
        rawMax = value;
        break;
      case 'qdr':
        if (QUICK_VALUES.has(value)) quick = value as QuickRange;
        else if (directive) extra.push(directive);
        break;
      default:
        if (directive) extra.push(directive);
    }
  }

  const min = rawMin ? usToIso(rawMin) : undefined;
  const max = rawMax ? usToIso(rawMax) : undefined;

  if (hasCdr && min && max) {
    // A stray qdr alongside a custom range can't be represented; preserve it losslessly.
    if (quick) extra.unshift(`qdr:${quick}`);
    return { date: { mode: 'custom', min, max }, extra };
  }
  if (quick) {
    if (hasCdr) extra.push('cdr:1');
    if (rawMin) extra.push(`cd_min:${rawMin}`);
    if (rawMax) extra.push(`cd_max:${rawMax}`);
    return { date: { mode: 'quick', value: quick }, extra };
  }
  // No usable date directive: keep any dangling cdr/cd_* verbatim.
  if (hasCdr) extra.push('cdr:1');
  if (rawMin) extra.push(`cd_min:${rawMin}`);
  if (rawMax) extra.push(`cd_max:${rawMax}`);
  return { date: { mode: 'none' }, extra };
}

// --- date conversion: ISO yyyy-mm-dd <-> Google's US m/d/yyyy ---

/** `1/1/2010` -> `2010-01-01`; returns undefined for malformed input. */
export function usToIso(us: string): string | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(us.trim());
  if (!m) return undefined;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/** `2010-01-01` -> `1/1/2010` (Google's unpadded US form); echoes input if malformed. */
export function isoToUs(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  const [, yyyy, mm, dd] = m;
  return `${Number(mm)}/${Number(dd)}/${yyyy}`;
}
