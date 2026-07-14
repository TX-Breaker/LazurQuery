import { describe, it, expect } from 'vitest';
import {
  normalizeState,
  normalizePreset,
  serializePresets,
  parsePresetsFile,
  type Preset,
} from './presets';
import { emptyState } from './types';

describe('normalizeState (defensive coercion)', () => {
  it('returns empty state for junk', () => {
    expect(normalizeState(null)).toEqual(emptyState());
    expect(normalizeState(42)).toEqual(emptyState());
    expect(normalizeState('nope')).toEqual(emptyState());
  });

  it('keeps valid arrays and drops malformed fields', () => {
    const s = normalizeState({
      includeDomains: ['a.com', 'b.com'],
      excludeTerms: 'not-an-array',
      pureMode: 'yes',
      freeText: 123,
      date: { mode: 'quick', value: 'w' },
    });
    expect(s.includeDomains).toEqual(['a.com', 'b.com']);
    expect(s.excludeTerms).toEqual([]);
    expect(s.pureMode).toBe(false);
    expect(s.freeText).toBe('');
    expect(s.date).toEqual({ mode: 'quick', value: 'w' });
  });

  it('rejects an invalid quick value and a half-custom range', () => {
    expect(normalizeState({ date: { mode: 'quick', value: 'zzz' } }).date).toEqual({ mode: 'none' });
    expect(normalizeState({ date: { mode: 'custom', min: '2020-01-01' } }).date).toEqual({ mode: 'none' });
  });
});

describe('normalizePreset', () => {
  it('requires a non-empty name', () => {
    expect(normalizePreset({ state: {} })).toBeNull();
    expect(normalizePreset({ name: '   ' })).toBeNull();
    expect(normalizePreset('x')).toBeNull();
  });

  it('trims the name and normalizes the state', () => {
    const p = normalizePreset({ name: '  Academic  ', state: { fileTypes: ['pdf'] } });
    expect(p?.name).toBe('Academic');
    expect(p?.state.fileTypes).toEqual(['pdf']);
  });
});

describe('serialize / parse round-trip', () => {
  const presets: Preset[] = [
    { name: 'Nostalgia', state: { ...emptyState(), date: { mode: 'custom', min: '2000-01-01', max: '2005-12-31' } } },
    { name: 'Academic', state: { ...emptyState(), fileTypes: ['pdf'], includeDomains: ['nasa.gov'] } },
  ];

  it('round-trips through JSON', () => {
    expect(parsePresetsFile(serializePresets(presets))).toEqual(presets);
  });

  it('accepts a bare array of presets', () => {
    expect(parsePresetsFile(JSON.stringify(presets))).toEqual(presets);
  });

  it('drops malformed presets but keeps the good ones', () => {
    const text = JSON.stringify({ version: 1, presets: [{ name: 'ok' }, { nope: true }, 5] });
    const out = parsePresetsFile(text);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('ok');
  });

  it('throws on non-JSON and on a missing presets array', () => {
    expect(() => parsePresetsFile('{not json')).toThrow('invalid-json');
    expect(() => parsePresetsFile(JSON.stringify({ version: 1 }))).toThrow('invalid-format');
  });
});
