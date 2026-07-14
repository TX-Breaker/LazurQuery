import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { t } from '../../../i18n';
import type { FilterState } from '../../../core/types';
import type { Preset } from '../../../core/presets';
import {
  listPresets,
  savePreset,
  deletePreset,
  exportPresetsJson,
  importPresetsJson,
  PRESETS_KEY,
} from '../../../storage';
import { browser } from 'wxt/browser';

/**
 * Save / load / delete / export / import named presets (spec §3.10 / Fase 4). Rendered inside
 * a collapsible section by App, so no section wrapper/title here.
 */
export function PresetBar({
  current,
  onLoad,
}: {
  current: FilterState;
  onLoad: (state: FilterState) => void;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState('');
  const [importStatus, setImportStatus] = useState<'ok' | 'err' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listPresets().then(setPresets);
    // Cross-surface propagation: a preset saved in the detached window shows up here too.
    const onChanged = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && PRESETS_KEY in changes) void listPresets().then(setPresets);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPresets(await savePreset({ name: trimmed, state: current }));
    setName('');
  };

  const remove = async (presetName: string) => setPresets(await deletePreset(presetName));

  const exportJson = async () => {
    const json = await exportPresetsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'lazurquery-presets.json';
    a.click();
    URL.revokeObjectURL(href);
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setPresets(await importPresetsJson(await file.text()));
        setImportStatus('ok');
      } catch {
        setImportStatus('err');
      }
      setTimeout(() => setImportStatus(null), 4000);
    }
    e.target.value = '';
  };

  return (
    <div>
      <div className="lq-row">
        <input
          className="lq-input"
          placeholder={t('preset_name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
          }}
        />
        <button type="button" className="lq-btn lq-btn-sm" onClick={save} disabled={!name.trim()}>
          {t('preset_save')}
        </button>
      </div>

      {presets.length === 0 ? (
        <p className="lq-desc">{t('preset_empty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
          {presets.map((p) => (
            <li className="lq-row" key={p.name} style={{ justifyContent: 'space-between' }}>
              <button type="button" className="lq-link" onClick={() => onLoad(p.state)}>
                {p.name}
              </button>
              <button
                type="button"
                className="lq-iconbtn"
                aria-label={t('preset_delete')}
                onClick={() => remove(p.name)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="lq-row" style={{ marginTop: 8 }}>
        <button type="button" className="lq-btn lq-btn-sm" onClick={exportJson}>
          {t('preset_export')}
        </button>
        <button type="button" className="lq-btn lq-btn-sm" onClick={() => fileRef.current?.click()}>
          {t('preset_import')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onImportFile}
        />
      </div>

      {importStatus && (
        <p
          className={importStatus === 'err' ? 'lq-warn' : 'lq-desc'}
          style={{ marginTop: 8 }}
          role="status"
        >
          {t(importStatus === 'ok' ? 'preset_import_ok' : 'preset_import_err')}
        </p>
      )}
    </div>
  );
}
