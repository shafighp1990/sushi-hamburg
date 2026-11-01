import type { Language } from "@/lib/catalog";
const berlinInputFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function arrivalInput(timestamp: number | null | undefined) {
  return timestamp == null ? "" : berlinInputFormat.format(timestamp).replace(" ", "T");
}
export function parseArrival(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wallTime = Date.parse(value + ":00Z");
  if (!Number.isFinite(wallTime)) return null;
  let timestamp = wallTime;
  for (let index = 0; index < 3; index++) {
    const localAsUtc = Date.parse(arrivalInput(timestamp) + ":00Z");
    timestamp = wallTime - (localAsUtc - timestamp);
  }
  // Spring-clock gaps have no corresponding Hamburg instant.
  return arrivalInput(timestamp) === value ? timestamp : null;
}
export function formatArrival(timestamp: number, lang: Language) {
  return new Intl.DateTimeFormat(lang, { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(timestamp);
}
