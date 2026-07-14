import { useEffect, useState } from 'react';
import type { DateFilter, QuickRange } from '../../../core/types';
import { t } from '../../../i18n';

type UiMode = 'none' | QuickRange | 'custom';

const toUiMode = (v: DateFilter): UiMode =>
  v.mode === 'none' ? 'none' : v.mode === 'quick' ? v.value : 'custom';

/**
 * Normalize a typed value to ISO yyyy-mm-dd. Accepts a bare year (2013), a year-month
 * (2013-05) or a full date. `edge` fills the missing parts with the start or end of the period,
 * so "2013" → 2013-01-01 (from) / 2013-12-31 (to). This fixes year-only ranges.
 */
function normalize(raw: string, edge: 'start' | 'end'): string {
  const s = raw.trim();
  if (/^\d{4}$/.test(s)) return edge === 'start' ? `${s}-01-01` : `${s}-12-31`;
  const ym = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (ym) {
    const month = ym[2].padStart(2, '0');
    const day =
      edge === 'start'
        ? '01'
        : String(new Date(Number(ym[1]), Number(ym[2]), 0).getDate()).padStart(2, '0');
    return `${ym[1]}-${month}-${day}`;
  }
  const full = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (full) return `${full[1]}-${full[2].padStart(2, '0')}-${full[3].padStart(2, '0')}`;
  return '';
}

const emit = (mode: UiMode, min: string, max: string): DateFilter => {
  if (mode === 'custom') {
    const mn = normalize(min, 'start');
    const mx = normalize(max, 'end');
    return mn && mx ? { mode: 'custom', min: mn, max: mx } : { mode: 'none' };
  }
  if (mode === 'none') return { mode: 'none' };
  return { mode: 'quick', value: mode };
};

const dateEquals = (a: DateFilter, b: DateFilter): boolean => {
  if (a.mode !== b.mode) return false;
  if (a.mode === 'quick' && b.mode === 'quick') return a.value === b.value;
  if (a.mode === 'custom' && b.mode === 'custom') return a.min === b.min && a.max === b.max;
  return true;
};

const OPTIONS: { value: UiMode; key: string }[] = [
  { value: 'none', key: 'date_any' },
  { value: 'd', key: 'date_d' },
  { value: 'w', key: 'date_w' },
  { value: 'm', key: 'date_m' },
  { value: 'y', key: 'date_y' },
  { value: 'custom', key: 'date_custom' },
];

export function DateRangeField({
  id,
  value,
  onChange,
  onSubmit,
}: {
  id?: string;
  value: DateFilter;
  onChange: (d: DateFilter) => void;
  onSubmit?: () => void;
}) {
  const [mode, setMode] = useState<UiMode>(() => toUiMode(value));
  const [min, setMin] = useState(value.mode === 'custom' ? value.min : '');
  const [max, setMax] = useState(value.mode === 'custom' ? value.max : '');

  // Re-sync from the outside only when the external value diverges from what we emit, so a
  // half-typed custom range isn't wiped.
  useEffect(() => {
    if (!dateEquals(emit(mode, min, max), value)) {
      setMode(toUiMode(value));
      setMin(value.mode === 'custom' ? value.min : '');
      setMax(value.mode === 'custom' ? value.max : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (m: UiMode, mn: string, mx: string) => {
    setMode(m);
    setMin(mn);
    setMax(mx);
    onChange(emit(m, mn, mx));
  };

  return (
    <div>
      <select
        id={id}
        className="lq-select"
        value={mode}
        onChange={(e) => update(e.target.value as UiMode, min, max)}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.key)}
          </option>
        ))}
      </select>

      {mode === 'custom' && (
        <div style={{ marginTop: 8 }}>
          <div className="lq-grid-2">
            <label>
              <span className="lq-desc">{t('date_from')}</span>
              <input
                className="lq-input"
                inputMode="numeric"
                placeholder="2013"
                value={min}
                onChange={(e) => update('custom', e.target.value, max)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmit?.();
                }}
              />
            </label>
            <label>
              <span className="lq-desc">{t('date_to')}</span>
              <input
                className="lq-input"
                inputMode="numeric"
                placeholder="2014"
                value={max}
                onChange={(e) => update('custom', min, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmit?.();
                }}
              />
            </label>
          </div>
          <p className="lq-desc">{t('date_custom_hint')}</p>
        </div>
      )}
    </div>
  );
}
