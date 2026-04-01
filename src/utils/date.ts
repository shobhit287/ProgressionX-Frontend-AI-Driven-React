type DayEnum = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const DAY_MAP: DayEnum[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Returns current day as DayEnum, e.g. "monday" */
export function getCurrentDay(): DayEnum {
  return DAY_MAP[new Date().getDay()];
}

/** Check whether a date string represents today */
export function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Returns start (Monday 00:00) and end (Sunday 23:59) of the current week */
export function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const jsDay = now.getDay(); // 0=Sun
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;

  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
