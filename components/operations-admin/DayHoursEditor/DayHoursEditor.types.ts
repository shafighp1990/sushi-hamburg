import type { DayHours } from '@/lib/operations';
import type { Language } from '@/lib/catalog';
export type DayHoursEditorProps = {
  dayKey: number | string;
  hours: DayHours;
  label: string;
  lang: Language;
  onChange: (key: number | string, value: DayHours) => void;
};
