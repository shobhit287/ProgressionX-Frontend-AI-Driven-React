const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "Mon, Mar 22" */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = DAY_NAMES_SHORT[d.getDay()];
  const month = MONTH_NAMES_SHORT[d.getMonth()];
  const date = d.getDate();
  return `${day}, ${month} ${date}`;
}

/** 2730 → "45m 30s", 90 → "1m 30s", 45 → "45s" */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

/** 75.5 → "75.5 kg" */
export function formatWeight(kg: number): string {
  const display = Number.isInteger(kg) ? kg.toString() : kg.toFixed(1);
  return `${display} kg`;
}

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const DAY_NAMES_FULL = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** Returns lowercase day name like "monday" */
export function getDayName(date: Date): string {
  return DAY_NAMES_FULL[date.getDay()];
}
