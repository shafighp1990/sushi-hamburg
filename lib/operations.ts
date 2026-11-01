import { isRecord } from './value-guards';
import type { Language } from './catalog';
export const providers = ['stripe', 'paypal', 'revolut', 'sumup'] as const;
export type Provider = (typeof providers)[number];
export const providerNames: Record<string, string> = {
  stripe: 'Stripe · Card',
  paypal: 'PayPal',
  revolut: 'Revolut',
  sumup: 'SumUp',
  cash_on_delivery: 'Cash on delivery',
};
export type DayHours = {
  open: boolean;
  start: string;
  cutoff: string;
  deliveryStart: string;
  deliveryEnd: string;
};
export type Schedule = {
  weekly: DayHours[];
  exceptions: Record<string, DayHours>;
};
export const defaultSchedule: Schedule = {
  weekly: Array.from({ length: 7 }, (_, i) => ({
    open: [0, 4, 5, 6].includes(i),
    start: '09:00',
    cutoff: '13:00',
    deliveryStart: '14:00',
    deliveryEnd: '21:00',
  })),
  exceptions: {},
};
export const defaultOperations = {
  schedule: defaultSchedule,
  paymentEnabled: {
    cash_on_delivery: true,
    stripe: true,
    paypal: true,
    revolut: true,
    sumup: true,
  },
  issuer: { name: '', address: '', email: '', taxId: '' },
  newsletter: { newProducts: false },
};
export function berlinClock(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export const minutes = (v: string) =>
  Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
export const clock = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export function hoursOn(schedule: Schedule, date: string) {
  return (
    schedule.exceptions[date] ||
    schedule.weekly[new Date(date + 'T12:00:00Z').getUTCDay()]
  );
}
export function deliveryOptions(schedule: Schedule, now = new Date()) {
  const local = berlinClock(now),
    result: { date: string; from: string; to: string; times: string[] }[] = [];
  for (let i = 0; i < 29; i++) {
    const d = new Date(local.date + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10),
      h = hoursOn(schedule, date);
    if (!h?.open) continue;
    if (i === 0 && local.time >= h.cutoff) continue;
    const start = Math.max(
      minutes(h.deliveryStart),
      (i === 0
        ? Math.max(minutes(local.time), minutes(h.start))
        : minutes(h.start)) + 300,
    );
    const from = Math.ceil(start / 30) * 30,
      end = minutes(h.deliveryEnd),
      times = [];
    for (let t = from; t <= end; t += 30) times.push(clock(t));
    if (times.length)
      result.push({ date, from: times[0], to: h.deliveryEnd, times });
  }
  return result;
}
export function validSlot(
  schedule: Schedule,
  date: string,
  time: string,
  now = new Date(),
) {
  return deliveryOptions(schedule, now).some(
    (d) => d.date === date && d.times.includes(time),
  );
}
export function acceptingNow(schedule: Schedule, now = new Date()) {
  const c = berlinClock(now),
    h = hoursOn(schedule, c.date);
  return !!h?.open && c.time >= h.start && c.time < h.cutoff;
}
export function validateSchedule(s: unknown): s is Schedule {
  if (
    !isRecord(s) ||
    !Array.isArray(s.weekly) ||
    s.weekly.length !== 7 ||
    !isRecord(s.exceptions) ||
    Object.keys(s.exceptions).length > 120
  )
    return false;
  const day = (h: unknown): h is DayHours => {
    if (!isRecord(h) || typeof h.open !== 'boolean') return false;
    const values = ['start', 'cutoff', 'deliveryStart', 'deliveryEnd'] as const;
    if (
      !values.every(
        (k) =>
          typeof h[k] === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h[k]),
      )
    )
      return false;
    const { start, cutoff, deliveryStart, deliveryEnd } = h;
    return (
      typeof start === 'string' &&
      typeof cutoff === 'string' &&
      typeof deliveryStart === 'string' &&
      typeof deliveryEnd === 'string' &&
      start < cutoff &&
      deliveryStart <= deliveryEnd &&
      minutes(start) + 300 <= minutes(deliveryEnd)
    );
  };
  return (
    s.weekly.every(day) &&
    Object.entries(s.exceptions).every(
      ([d, h]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        !isNaN(Date.parse(d)) &&
        new Date(d).toISOString().slice(0, 10) === d &&
        day(h),
    )
  );
}
export function localDate(date: string, lang: Language) {
  return new Intl.DateTimeFormat(
    lang === 'uk'
      ? 'uk-UA'
      : lang === 'fa'
        ? 'fa-IR-u-ca-gregory'
        : lang === 'de'
          ? 'de-DE'
          : 'en-GB',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Berlin',
    },
  ).format(new Date(date + 'T12:00:00Z'));
}
