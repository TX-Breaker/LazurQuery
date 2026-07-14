/**
 * parseUrl(url) -> FilterState. Pure function (spec §3.11).
 *
 * Tolerant and lossless: recognized filters are extracted; everything else survives in
 * freeText / tbsExtra so build(parse(u)) loses no data. Always returns a fully-populated
 * shape (via emptyState) for clean deep-equality in tests.
 */
import { emptyState, type FilterState } from './types';
import { tokenizeQ, parseTbs } from './codec';
import { REGISTRY, type ReadCtx } from './registry';

export function parseUrl(rawUrl: string): FilterState {
  const url = new URL(rawUrl);
  const params = url.searchParams;

  const qt = tokenizeQ(params.get('q') ?? '');
  const { date, extra } = parseTbs(params.get('tbs') ?? '');

  const ctx: ReadCtx = { qt, date, params };
  const state = emptyState();

  for (const filter of REGISTRY) {
    if (!filter.enabled) continue;
    (state as Record<keyof FilterState, unknown>)[filter.id] = filter.read(ctx);
  }

  // Lossless remainders, kept outside the registry loop (mirror of builder.ts).
  state.freeText = qt.rest.join(' ');
  state.tbsExtra = extra;

  return state;
}
