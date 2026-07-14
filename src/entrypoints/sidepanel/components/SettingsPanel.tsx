import { t } from '../../../i18n';
import type { Settings } from '../../../storage';

/** Settings view: manual overrides for theme and language, plus search defaults. */
export function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <main className="p-3">
      <header className="lq-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t('settings_title')}</h1>
        <button type="button" className="lq-btn lq-btn-sm" onClick={onClose}>
          ← {t('back')}
        </button>
      </header>

      <div className="lq-section">
        <div className="lq-set">
          <p className="lq-set-title">{t('setting_theme')}</p>
          <select
            className="lq-select"
            value={settings.theme}
            onChange={(e) => set('theme', e.target.value as Settings['theme'])}
          >
            <option value="system">{t('theme_system')}</option>
            <option value="light">{t('theme_light')}</option>
            <option value="dark">{t('theme_dark')}</option>
          </select>
        </div>

        <div className="lq-set">
          <p className="lq-set-title">{t('setting_language')}</p>
          <select
            className="lq-select"
            value={settings.locale}
            onChange={(e) => set('locale', e.target.value as Settings['locale'])}
          >
            <option value="system">{t('language_system')}</option>
            <option value="it">{t('language_it')}</option>
            <option value="en">{t('language_en')}</option>
          </select>
        </div>

        <div className="lq-set">
          <label className="lq-toggle">
            <input
              type="checkbox"
              className="lq-check"
              checked={settings.pureByDefault}
              onChange={(e) => set('pureByDefault', e.target.checked)}
            />
            <span>
              <span className="lq-label" style={{ marginBottom: 0 }}>
                {t('setting_pure_default')}
              </span>
              <span className="lq-desc">{t('setting_pure_default_desc')}</span>
            </span>
          </label>
        </div>

        <div className="lq-set">
          <label className="lq-toggle">
            <input
              type="checkbox"
              className="lq-check"
              checked={settings.applyInNewTab}
              onChange={(e) => set('applyInNewTab', e.target.checked)}
            />
            <span>
              <span className="lq-label" style={{ marginBottom: 0 }}>
                {t('setting_newtab')}
              </span>
              <span className="lq-desc">{t('setting_newtab_desc')}</span>
            </span>
          </label>
        </div>
      </div>
    </main>
  );
}
