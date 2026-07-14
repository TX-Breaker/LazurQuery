import type { FilterDef } from '../../../core/registry';
import type { DateFilter, FilterState } from '../../../core/types';
import { t } from '../../../i18n';
import { CONTROLS } from '../fields';
import { StringListField } from './StringListField';
import { SelectField } from './SelectField';
import { DateRangeField } from './DateRangeField';
import { ToggleField } from './ToggleField';

/** Renders one registry filter using its UI control descriptor. */
export function FilterField({
  def,
  state,
  onPatch,
  onSubmit,
}: {
  def: FilterDef;
  state: FilterState;
  onPatch: (patch: Partial<FilterState>) => void;
  /** Enter in any text input applies the search. */
  onSubmit?: () => void;
}) {
  const control = CONTROLS[def.id];
  if (!control) return null;
  const label = t(def.labelKey);
  const controlId = `lq-f-${def.id}`;

  switch (control.kind) {
    case 'list':
      return (
        <div className="lq-field" role="group" aria-label={label}>
          <span className="lq-label">{label}</span>
          <StringListField
            values={state[def.id] as string[]}
            placeholder={t(control.placeholderKey)}
            addLabel={t(control.addKey)}
            ariaLabel={label}
            siteChips={control.sites}
            onChange={(next) => onPatch({ [def.id]: next } as Partial<FilterState>)}
            onSubmit={onSubmit}
          />
        </div>
      );

    case 'select':
      return (
        <div className="lq-field">
          <label className="lq-label" htmlFor={controlId}>
            {label}
          </label>
          <SelectField
            id={controlId}
            value={state.fileTypes[0] ?? ''}
            anyLabel={t(control.anyKey)}
            options={control.options.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            onChange={(v) => onPatch({ fileTypes: v ? [v] : [] })}
          />
        </div>
      );

    case 'date':
      return (
        <div className="lq-field">
          <label className="lq-label" htmlFor={controlId}>
            {label}
          </label>
          <DateRangeField
            id={controlId}
            value={state.date}
            onChange={(d: DateFilter) => onPatch({ date: d })}
            onSubmit={onSubmit}
          />
        </div>
      );

    case 'toggle':
      return (
        <div className="lq-field">
          <ToggleField
            label={label}
            desc={t(control.descKey)}
            checked={state.pureMode}
            onChange={(v) => onPatch({ pureMode: v })}
          />
        </div>
      );
  }

  return null;
}
