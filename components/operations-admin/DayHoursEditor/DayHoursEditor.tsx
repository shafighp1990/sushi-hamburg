'use client';
import { Input } from '@/components/primitives/Input';
import { Label } from '@/components/primitives/Label';
import { ot } from '@/lib/operations-copy';
import { styles } from './DayHoursEditor.styles';
import type { DayHoursEditorProps } from './DayHoursEditor.types';
export function DayHoursEditor({
  dayKey,
  hours,
  label,
  lang,
  onChange,
}: DayHoursEditorProps) {
  return (
    <fieldset className={styles.root}>
      <legend>{label}</legend>
      <Label className={styles.toggle}>
        <Input
          type="checkbox"
          checked={hours.open}
          onChange={(e) =>
            onChange(dayKey, { ...hours, open: e.target.checked })
          }
        />
        {ot(lang, 'open')}
      </Label>
      {(['start', 'cutoff', 'deliveryStart', 'deliveryEnd'] as const).map(
        (field) => (
          <Label key={field}>
            {ot(lang, field)}
            <Input
              type="time"
              required
              disabled={!hours.open}
              value={hours[field]}
              onChange={(e) =>
                onChange(dayKey, { ...hours, [field]: e.target.value })
              }
            />
          </Label>
        ),
      )}
    </fieldset>
  );
}
