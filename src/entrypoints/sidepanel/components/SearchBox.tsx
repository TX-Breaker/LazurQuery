import { t } from '../../../i18n';

/**
 * Generic, Google-like search box. It maps to the plain-text part of the query (freeText) —
 * no operators. The filter sections below refine it. Enter applies.
 */
export function SearchBox({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <input
      className="lq-search"
      type="search"
      placeholder={t('search_placeholder')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSubmit();
      }}
    />
  );
}
