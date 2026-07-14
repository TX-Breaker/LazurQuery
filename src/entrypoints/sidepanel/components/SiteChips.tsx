import { COMMON_SITES } from '../fields';
import { t } from '../../../i18n';

/** Quick-add toggles for common sites; click adds/removes the domain from the list. */
export function SiteChips({
  values,
  onChange,
}: {
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (domain: string) => {
    if (values.includes(domain)) onChange(values.filter((d) => d !== domain));
    else onChange([...values, domain]);
  };

  return (
    <div>
      <span className="lq-desc" style={{ display: 'block', marginBottom: 5 }}>
        {t('sites_quick')}
      </span>
      <div className="lq-chiprow">
        {COMMON_SITES.map((s) => {
          const active = values.includes(s.domain);
          return (
            <button
              key={s.domain}
              type="button"
              className={active ? 'lq-chip is-active' : 'lq-chip'}
              aria-pressed={active}
              onClick={() => toggle(s.domain)}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
