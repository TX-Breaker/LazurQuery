/** A labeled checkbox with a description (used by the experimental pure-mode toggle). */
export function ToggleField({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="lq-toggle">
      <input
        type="checkbox"
        className="lq-check"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="lq-label" style={{ marginBottom: 0 }}>
          {label}
        </span>
        <span className="lq-desc">{desc}</span>
      </span>
    </label>
  );
}
