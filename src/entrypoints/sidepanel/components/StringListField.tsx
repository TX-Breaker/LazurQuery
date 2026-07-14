import { t } from '../../../i18n';
import { SiteChips } from './SiteChips';

/** A dynamic list of text inputs (domains, excluded terms, exact phrases). */
export function StringListField({
  values,
  placeholder,
  addLabel,
  ariaLabel,
  onChange,
  onSubmit,
  siteChips,
}: {
  values: string[];
  placeholder: string;
  addLabel: string;
  /** Accessible name for each input (the visual label is not htmlFor-associable to a list). */
  ariaLabel: string;
  onChange: (next: string[]) => void;
  /** Enter in any input applies the search (consistent with the top search box). */
  onSubmit?: () => void;
  siteChips?: boolean;
}) {
  const setAt = (i: number, v: string) => {
    const next = values.slice();
    next[i] = v;
    onChange(next);
  };
  const removeAt = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, '']);

  return (
    <div>
      {siteChips && <SiteChips values={values} onChange={onChange} />}

      {values.map((value, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="lq-row" key={i}>
          <input
            className="lq-input"
            value={value}
            placeholder={placeholder}
            aria-label={ariaLabel}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit?.();
            }}
          />
          <button
            type="button"
            className="lq-iconbtn"
            aria-label={t('remove_item')}
            onClick={() => removeAt(i)}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="lq-link" onClick={add}>
        + {addLabel}
      </button>
    </div>
  );
}
