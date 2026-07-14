import { useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { REGISTRY } from '../../core/registry';
import { buildUrl } from '../../core/builder';
import { parseUrl } from '../../core/parser';
import { emptyState, type FilterState } from '../../core/types';
import { isGoogleSerp } from '../../google-domains';
import { t, setLocale } from '../../i18n';
import { applyTheme } from '../../theme';
import {
  getSettings,
  setSettings as persistSettings,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  type Settings,
} from '../../storage';
import { CONTROLS } from './fields';
import { useGoogleSync } from './hooks/useGoogleSync';
import { FilterField } from './components/FilterField';
import { QueryPreview } from './components/QueryPreview';
import { PresetBar } from './components/PresetBar';
import { SearchBox } from './components/SearchBox';
import { SettingsPanel } from './components/SettingsPanel';

const DEFAULT_BASE = 'https://www.google.com/search';

const SECTIONS = [
  { id: 'base', titleKey: 'section_base' },
  { id: 'experimental', titleKey: 'section_experimental' },
] as const;

export function App() {
  const tab = useGoogleSync();
  const onGoogle = isGoogleSerp(tab.url);
  const [state, setState] = useState<FilterState>(emptyState());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [applied, setApplied] = useState(false);
  // Draft protection: while the user has unapplied edits (dirty), URL changes must never
  // silently overwrite their work — we offer an explicit "sync now" instead.
  const [dirty, setDirty] = useState(false);
  const [syncedUrl, setSyncedUrl] = useState('');
  const appliedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings once; watch storage so changes made in the other surface (detached window
  // vs docked sidebar) propagate live.
  useEffect(() => {
    const load = () =>
      getSettings().then((s) => {
        setLocale(s.locale);
        applyTheme(s.theme);
        setSettings(s);
      });
    void load();
    const onChanged = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && SETTINGS_KEY in changes) void load();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  // "Pure mode by default": seed the draft when there is no Google URL to sync from.
  useEffect(() => {
    if (!onGoogle && !dirty && settings.pureByDefault) {
      setState((s) => (s.pureMode ? s : { ...s, pureMode: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.pureByDefault, onGoogle]);

  // The URL is the source of truth: sync the draft from it — but only when the draft is
  // clean. syncedUrl guards against re-parsing the pre-navigation URL right after Apply.
  useEffect(() => {
    if (!onGoogle || dirty || tab.url === syncedUrl) return;
    setState(parseUrl(tab.url));
    setSyncedUrl(tab.url);
  }, [tab.url, onGoogle, dirty, syncedUrl]);

  const base = onGoogle ? tab.url : DEFAULT_BASE;
  const url = useMemo(() => buildUrl(state, base), [state, base]);
  const query = useMemo(() => new URL(url).searchParams.get('q') ?? '', [url]);

  // Contradiction guard: same domain both included and excluded produces a nonsense query.
  const conflicts = useMemo(() => {
    const norm = (d: string) => d.trim().toLowerCase().replace(/^www\./, '');
    const included = new Set(state.includeDomains.map(norm).filter(Boolean));
    return [...new Set(state.excludeDomains.map(norm))].filter((d) => d && included.has(d));
  }, [state.includeDomains, state.excludeDomains]);

  const markEdit = (p: Partial<FilterState>) => {
    setState((s) => ({ ...s, ...p }));
    setDirty(true);
  };
  const loadState = (s: FilterState) => {
    setState(s);
    setDirty(true);
  };
  const reset = () => {
    setState({ ...emptyState(), pureMode: settings.pureByDefault });
    setDirty(true);
  };
  const resync = () => {
    setState(parseUrl(tab.url));
    setSyncedUrl(tab.url);
    setDirty(false);
  };

  const apply = () => {
    if (settings.applyInNewTab) void browser.tabs.create({ url });
    else if (onGoogle && tab.id != null) void browser.tabs.update(tab.id, { url });
    else void browser.tabs.create({ url });
    // The draft is now "on its way to the URL": allow the incoming navigation to sync back.
    setDirty(false);
    setSyncedUrl(tab.url);
    setApplied(true);
    if (appliedTimer.current) clearTimeout(appliedTimer.current);
    appliedTimer.current = setTimeout(() => setApplied(false), 1800);
  };

  const updateSettings = (s: Settings) => {
    setLocale(s.locale);
    applyTheme(s.theme);
    setSettings(s);
    void persistSettings(s);
  };

  // Pop-out: open the same panel as a standalone window (movable to a second screen).
  const detached = new URLSearchParams(window.location.search).has('detached');
  const openWindow = () => {
    void browser.windows.create({
      url: `${browser.runtime.getURL('/sidepanel.html')}?detached=1`,
      type: 'popup',
      width: 440,
      height: 760,
    });
  };

  if (showSettings) {
    return (
      <SettingsPanel
        settings={settings}
        onChange={updateSettings}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  const showResyncBar = onGoogle && dirty && tab.url !== syncedUrl;

  return (
    <main className="p-3">
      <header className="lq-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t('app_title')}</h1>
        <div className="lq-row" style={{ gap: 6, margin: 0 }}>
          <button
            type="button"
            className="lq-iconbtn"
            aria-label={t('settings_open')}
            title={t('settings_open')}
            onClick={() => setShowSettings(true)}
          >
            ⚙
          </button>
          {!detached && (
            <button
              type="button"
              className="lq-iconbtn"
              aria-label={t('open_window')}
              title={t('open_window')}
              onClick={openWindow}
            >
              ⧉
            </button>
          )}
          <button
            type="button"
            className="lq-iconbtn"
            aria-label={t('reset_filters')}
            title={t('reset_filters')}
            onClick={reset}
          >
            ↺
          </button>
        </div>
      </header>

      {showResyncBar && (
        <div className="lq-warn lq-row" style={{ justifyContent: 'space-between' }} role="status">
          <span>{t('resync_msg')}</span>
          <button type="button" className="lq-btn lq-btn-sm" onClick={resync}>
            {t('resync_action')}
          </button>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <SearchBox
          value={state.freeText}
          onChange={(v) => markEdit({ freeText: v })}
          onSubmit={apply}
        />
      </div>

      {SECTIONS.map((sec) => {
        const defs = REGISTRY.filter((d) => d.enabled && d.section === sec.id && CONTROLS[d.id]);
        if (defs.length === 0) return null;
        return (
          <section className="lq-section" key={sec.id}>
            <p className="lq-section-title">{t(sec.titleKey)}</p>
            {sec.id === 'experimental' && <p className="lq-warn">{t('experimental_warning')}</p>}
            {defs.map((d) => (
              <FilterField key={d.id} def={d} state={state} onPatch={markEdit} onSubmit={apply} />
            ))}
          </section>
        );
      })}

      <div className="lq-section">
        <button
          type="button"
          className="lq-collapse"
          aria-expanded={showPresets}
          onClick={() => setShowPresets((v) => !v)}
        >
          <span>{t('presets_title')}</span>
          <span>{showPresets ? '▾' : '▸'}</span>
        </button>
        {showPresets && <PresetBar current={state} onLoad={loadState} />}
      </div>

      <div className="lq-section" style={{ position: 'sticky', bottom: 8 }}>
        {!onGoogle && <p className="lq-warn">{t('open_google_hint')}</p>}
        {conflicts.length > 0 && (
          <p className="lq-warn" role="alert">
            {t('conflict_domains')} {conflicts.join(', ')}
          </p>
        )}
        <QueryPreview url={url} query={query} />
        <button
          type="button"
          className="lq-btn lq-btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={apply}
        >
          {applied ? t('applied_ok') : t('apply')}
        </button>
      </div>
    </main>
  );
}
