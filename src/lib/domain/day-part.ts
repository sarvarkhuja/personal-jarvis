export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';

export const DAY_PART_ORDER: DayPart[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
  'anytime',
];

export const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: 'MORNING',
  afternoon: 'AFTERNOON',
  evening: 'EVENING',
  night: 'NIGHT',
  anytime: 'ANYTIME',
};

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Normalize a stored time to "HH:MM". Postgres TIME serializes as "HH:MM:SS"
 * via PostgREST; the UI and schema use "HH:MM", so trim any seconds. Returns
 * '' for null/empty.
 */
export function hhmm(time: string | null): string {
  return (time ?? '').slice(0, 5);
}

/** Bucket an "HH:MM" (or null) into a day-part. Night wraps midnight. */
export function dayPartOf(time: string | null): DayPart {
  if (!time) return 'anytime';
  const mins = toMinutes(time);
  if (mins >= 300 && mins < 720) return 'morning'; // 05:00–11:59
  if (mins >= 720 && mins < 1020) return 'afternoon'; // 12:00–16:59
  if (mins >= 1020 && mins < 1320) return 'evening'; // 17:00–21:59
  return 'night'; // 22:00–04:59 (includes the after-midnight wrap)
}

/** Sort key so Night reads 22:00 → 23:00 → 00:00 → 04:00. */
function nightKey(time: string): number {
  const mins = toMinutes(time);
  return mins < 300 ? mins + 1440 : mins;
}

/**
 * Group items into ordered, non-empty day-part sections. Within a timed
 * section, sort by time ascending (Night uses the midnight-wrap key). The
 * Anytime section preserves input order and always sorts last.
 */
export function groupHabitsByDayPart<T>(
  items: T[],
  getTime: (item: T) => string | null,
): Array<{ part: DayPart; label: string; items: T[] }> {
  const buckets = new Map<DayPart, T[]>();
  for (const part of DAY_PART_ORDER) buckets.set(part, []);
  for (const item of items) {
    buckets.get(dayPartOf(getTime(item)))!.push(item);
  }

  const sections: Array<{ part: DayPart; label: string; items: T[] }> = [];
  for (const part of DAY_PART_ORDER) {
    const group = buckets.get(part)!;
    if (group.length === 0) continue;
    let ordered = group;
    if (part !== 'anytime') {
      const keyFor = part === 'night' ? nightKey : toMinutes;
      ordered = [...group].sort(
        (a, b) => keyFor(getTime(a)!) - keyFor(getTime(b)!),
      );
    }
    sections.push({ part, label: DAY_PART_LABEL[part], items: ordered });
  }
  return sections;
}
