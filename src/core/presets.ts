/**
 * Preset model + pure (de)serialization and defensive validation (spec §3.10 / Fase 4).
 *
 * A preset is a named FilterState. Import is hostile-input tolerant: anything malformed is
 * coerced to a safe value (never throws on field shape), and only structurally invalid JSON
 * or a missing presets array is rejected. Pure — no chrome, no DOM — so it is unit-tested.
 */
import { emptyState, type DateFilter, type FilterState } from './types';

export interface Preset {
  name: string;
  state: FilterState;
}

export const PRESETS_FILE_VERSION = 1 as const;

export interface PresetsFile {
  version: typeof PRESETS_FILE_VERSION;
  presets: Preset[];
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string');
}

function coerceDate(x: unknown): DateFilter {
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if (o.mode === 'quick' && (o.value === 'd' || o.value === 'w' || o.value === 'm' || o.value === 'y')) {
      return { mode: 'quick', value: o.value };
    }
    if (o.mode === 'custom' && typeof o.min === 'string' && typeof o.max === 'string') {
      return { mode: 'custom', min: o.min, max: o.max };
    }
  }
  return { mode: 'none' };
}

/** Coerce arbitrary input into a valid FilterState (defensive, for imported/stored data). */
export function normalizeState(x: unknown): FilterState {
  const base = emptyState();
  if (!x || typeof x !== 'object') return base;
  const o = x as Record<string, unknown>;
  return {
    exactPhrases: isStringArray(o.exactPhrases) ? o.exactPhrases : base.exactPhrases,
    includeDomains: isStringArray(o.includeDomains) ? o.includeDomains : base.includeDomains,
    excludeDomains: isStringArray(o.excludeDomains) ? o.excludeDomains : base.excludeDomains,
    excludeTerms: isStringArray(o.excludeTerms) ? o.excludeTerms : base.excludeTerms,
    fileTypes: isStringArray(o.fileTypes) ? o.fileTypes : base.fileTypes,
    date: coerceDate(o.date),
    pureMode: typeof o.pureMode === 'boolean' ? o.pureMode : base.pureMode,
    freeText: typeof o.freeText === 'string' ? o.freeText : base.freeText,
    tbsExtra: isStringArray(o.tbsExtra) ? o.tbsExtra : base.tbsExtra,
  };
}

export function normalizePreset(x: unknown): Preset | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) return null;
  return { name, state: normalizeState(o.state) };
}

export function serializePresets(presets: Preset[]): string {
  const file: PresetsFile = { version: PRESETS_FILE_VERSION, presets };
  return JSON.stringify(file, null, 2);
}

/**
 * Parse + validate an imported presets file. Accepts either the full
 * `{ version, presets: [...] }` shape or a bare array of presets. Throws only on JSON that
 * cannot be parsed or that has no presets array; individual bad presets are dropped.
 */
export function parsePresetsFile(text: string): Preset[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('invalid-json');
  }
  const rawList = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? (data as Record<string, unknown>).presets
      : undefined;
  if (!Array.isArray(rawList)) throw new Error('invalid-format');

  const presets: Preset[] = [];
  for (const item of rawList) {
    const preset = normalizePreset(item);
    if (preset) presets.push(preset);
  }
  return presets;
}
