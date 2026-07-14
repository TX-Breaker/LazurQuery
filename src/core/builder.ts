/**
 * buildUrl(state, baseUrl) -> string. Pure function (spec §3.11).
 *
 * Mutate, don't replace (spec corollary of "URL is the source of truth"): the base URL's
 * params are preserved. We *own* three channels — q, tbs and udm=14 — and regenerate them
 * fully from state; everything else (hl, gl, num, unknown params) is left untouched.
 *
 * This relies on state being a complete representation of the channels it owns: freeText
 * captures the unmanaged part of q, tbsExtra the unmanaged tbs directives. So q is rebuilt
 * from scratch (never merged token-wise with the base q — that would duplicate).
 */
import type { FilterState } from './types';
import { REGISTRY, type BuildCtx } from './registry';

export function buildUrl(state: FilterState, baseUrl: string): string {
  const url = new URL(baseUrl);
  const params = url.searchParams;

  // Clear the channels we fully regenerate; preserve the rest.
  params.delete('q');
  params.delete('tbs');
  if (params.get('udm') === '14') params.delete('udm');

  const ctx: BuildCtx = { q: [], tbs: [], params };

  for (const filter of REGISTRY) {
    if (!filter.enabled) continue;
    // Dispatch boundary: each def is individually type-safe on its own id.
    filter.apply(state[filter.id] as never, ctx);
  }

  // Lossless remainders (not user-facing filters, so handled outside the registry loop).
  if (state.freeText.trim()) ctx.q.push(state.freeText.trim());
  ctx.tbs.push(...state.tbsExtra);

  const q = ctx.q.join(' ').trim();
  if (q) params.set('q', q);
  const tbs = ctx.tbs.join(',');
  if (tbs) params.set('tbs', tbs);

  return serializeUrl(url);
}

/**
 * URLSearchParams.toString() over-encodes for human eyes. Google accepts the operator
 * punctuation unencoded, so we relax exactly the readable, query-legal characters. Spaces
 * stay `+` and quotes stay %22 (both decode cleanly on parse). Exported so the UI preview
 * can render cleaned URLs with the same readable serialization.
 */
export function serializeUrl(url: URL): string {
  const qs = url.searchParams
    .toString()
    .replace(/%3A/gi, ':')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2C/gi, ',')
    .replace(/%2F/gi, '/');
  const base = `${url.origin}${url.pathname}`;
  return (qs ? `${base}?${qs}` : base) + url.hash;
}
