'use client';
import { DayHoursEditor } from '../../DayHoursEditor';
import { t } from '@/lib/shop-copy';
import { ot } from '@/lib/operations-copy';
import { Input } from '@/components/primitives/Input';
import { Heading } from '@/components/primitives/Heading';
import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { styles } from './OperationsAdminHours.styles';
import type { OperationsAdminHoursProps } from './OperationsAdminHours.types';

export function OperationsAdminHours({
  lang,
  draft,
  setDraft,
  date,
  setDate,
  busy,
  save,
  updateDay,
}: OperationsAdminHoursProps) {
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Text>{ot(lang, 'lead')} · Europe/Berlin</Text>
      {[1, 2, 3, 4, 5, 6, 0].map((i) => (
        <DayHoursEditor
          key={i}
          dayKey={i}
          hours={draft.schedule.weekly[i]}
          label={new Intl.DateTimeFormat(lang, {
            weekday: 'long',
            timeZone: 'Europe/Berlin',
          }).format(new Date(Date.UTC(2026, 9, 11 + i, 12)))}
          lang={lang}
          onChange={updateDay}
        />
      ))}
      <Heading as="h3">{ot(lang, 'exceptions')}</Heading>
      <div className={styles.div}>
        <Input
          aria-label={t(lang, 'date')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button
          type="button"
          className={styles.button}
          disabled={!date}
          onClick={() => {
            updateDay(date, {
              open: false,
              start: '09:00',
              cutoff: '13:00',
              deliveryStart: '14:00',
              deliveryEnd: '21:00',
            });
            setDate('');
          }}
        >
          {ot(lang, 'add')}
        </Button>
      </div>
      {Object.entries(draft.schedule.exceptions)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([d, h]) => (
          <div key={d}>
            {
              <DayHoursEditor
                key={d}
                dayKey={d}
                hours={h}
                label={d}
                lang={lang}
                onChange={updateDay}
              />
            }
            <Button
              type="button"
              className={styles.button2}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  schedule: {
                    ...s.schedule,
                    exceptions: Object.fromEntries(
                      Object.entries(s.schedule.exceptions).filter(
                        ([k]) => k !== d,
                      ),
                    ),
                  },
                }))
              }
            >
              {ot(lang, 'remove')}
            </Button>
          </div>
        ))}
      <Button disabled={busy} aria-busy={busy} className={styles.button3}>
        {t(lang, 'save')}
      </Button>
    </form>
  );
}
