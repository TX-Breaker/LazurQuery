/**
 * Local persistence (spec §3.10 / Fase 4). chrome.storage.local only — storage.sync is
 * forbidden (tight quotas). JSON (de)serialization + validation lives in core/presets (pure,
 * tested); this module is the thin chrome.storage adapter.
 */
import { browser } from 'wxt/browser';
import {
  normalizePreset,
  parsePresetsFile,
  serializePresets,
  type Preset,
} from '../core/presets';

/** Exported so UI surfaces can watch storage.onChanged for cross-window propagation. */
export const PRESETS_KEY = 'lq:presets';

export async function listPresets(): Promise<Preset[]> {
  const raw = await browser.storage.local.get(PRESETS_KEY);
  const stored = raw[PRESETS_KEY];
  if (!Array.isArray(stored)) return [];
  return stored
    .map(normalizePreset)
    .filter((p): p is Preset => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function savePreset(preset: Preset): Promise<Preset[]> {
  const presets = await listPresets();
  const idx = presets.findIndex((p) => p.name === preset.name);
  if (idx >= 0) presets[idx] = preset;
  else presets.push(preset);
  await browser.storage.local.set({ [PRESETS_KEY]: presets });
  return listPresets();
}

export async function deletePreset(name: string): Promise<Preset[]> {
  const presets = (await listPresets()).filter((p) => p.name !== name);
  await browser.storage.local.set({ [PRESETS_KEY]: presets });
  return presets;
}

export async function exportPresetsJson(): Promise<string> {
  return serializePresets(await listPresets());
}

/** Import presets, merging by name (incoming wins). Throws on invalid JSON/format. */
export async function importPresetsJson(text: string): Promise<Preset[]> {
  const incoming = parsePresetsFile(text);
  const byName = new Map<string, Preset>();
  for (const p of await listPresets()) byName.set(p.name, p);
  for (const p of incoming) byName.set(p.name, p);
  await browser.storage.local.set({ [PRESETS_KEY]: [...byName.values()] });
  return listPresets();
}

// --- Settings ---

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  locale: 'system' | 'it' | 'en';
  /** Start new searches with udm=14 on. */
  pureByDefault: boolean;
  /** Apply opens a new tab instead of navigating the current one. */
  applyInNewTab: boolean;
}

export const SETTINGS_KEY = 'lq:settings';
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  locale: 'system',
  pureByDefault: false,
  applyInNewTab: false,
};

export async function getSettings(): Promise<Settings> {
  const raw = await browser.storage.local.get(SETTINGS_KEY);
  const s = raw[SETTINGS_KEY];
  if (!s || typeof s !== 'object') return { ...DEFAULT_SETTINGS };
  const o = s as Record<string, unknown>;
  return {
    theme: o.theme === 'light' || o.theme === 'dark' ? o.theme : 'system',
    locale: o.locale === 'it' || o.locale === 'en' ? o.locale : 'system',
    pureByDefault: typeof o.pureByDefault === 'boolean' ? o.pureByDefault : false,
    applyInNewTab: typeof o.applyInNewTab === 'boolean' ? o.applyInNewTab : false,
  };
}

export async function setSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}
