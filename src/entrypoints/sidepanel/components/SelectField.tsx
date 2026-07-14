/** A single-choice select with an "any" empty option (file type). */
export function SelectField({
  id,
  value,
  options,
  anyLabel,
  onChange,
}: {
  id?: string;
  value: string;
  options: { value: string; label: string }[];
  anyLabel: string;
  onChange: (v: string) => void;
}) {
  return (
    <select id={id} className="lq-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{anyLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
