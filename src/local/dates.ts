// Date helpers for the local services. The backend bucketed sessions by
// `cast(started_at, Date)` in the server's timezone; here we bucket by the
// device's local calendar day, which is what the user actually means.

import type { DayName } from '@/db/db';

const DAY_NAMES: DayName[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

/** Python-style weekday: Monday = 0 … Sunday = 6. */
export function pyWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function dayNameOf(d: Date): DayName {
  return DAY_NAMES[d.getDay()];
}

export function dayNameToWeekday(day: string): number | undefined {
  const idx = DAY_NAMES.indexOf(day.toLowerCase() as DayName);
  if (idx === -1) return undefined;
  return (idx + 6) % 7;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 'YYYY-MM-DD' for a Date, in local time. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local calendar day of an ISO timestamp. */
export function dateKeyOf(iso: string): string {
  return toDateKey(new Date(iso));
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Parse 'YYYY-MM-DD' as local midnight. Also tolerates full ISO strings. */
export function parseDateKey(key: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(key);
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Monday of the week containing `d`, at local midnight. */
export function mondayOf(d: Date): Date {
  return startOfDay(addDays(d, -pyWeekday(d)));
}

export function secondsBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000);
}

/** Inclusive date-key range check against an ISO timestamp. */
export function inDateRange(
  iso: string,
  fromKey?: string | null,
  toKey?: string | null,
): boolean {
  const key = dateKeyOf(iso);
  if (fromKey && key < fromKey.slice(0, 10)) return false;
  if (toKey && key > toKey.slice(0, 10)) return false;
  return true;
}

export function formatShortDate(iso: string): string {
  // e.g. "Mon, Apr 06" — mirrors strftime("%a, %b %d")
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: '2-digit',
  });
}

export function formatIsoDateWithDay(iso: string): string {
  // e.g. "2026-04-06 (Mon)" — mirrors strftime("%Y-%m-%d (%a)")
  const d = new Date(iso);
  return `${toDateKey(d)} (${d.toLocaleDateString('en-US', { weekday: 'short' })})`;
}
