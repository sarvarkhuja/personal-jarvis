import { isHabitDueOn, type FrequencyJson } from './schedule';

/** ISO weekday (1=Mon … 7=Sun) → short ALL-CAPS label. Index 0 unused. */
const ISO_DAY_ABBR = ['', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

/**
 * Step a `YYYY-MM-DD` string by `n` calendar days, UTC-safe.
 *
 * We never round-trip through `new Date(iso)` (which parses as local midnight and
 * drifts a day west of UTC). `Date.UTC` keeps the calendar date exact regardless
 * of the runner's timezone.
 */
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "27 JUN" from a `YYYY-MM-DD` string, UTC-safe (no `toLocaleDateString` drift). */
export function formatDayLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

/** Human label for a schedule, in the Space Mono ALL-CAPS idiom. */
export function frequencyLabel(freq: FrequencyJson): string {
  switch (freq.type) {
    case 'daily':
      return 'DAILY';
    case 'weekly':
      return [...freq.days]
        .sort((a, b) => a - b)
        .map((d) => ISO_DAY_ABBR[d])
        .join(' · ');
    case 'x_per_week':
      return `${freq.count}× / WK`;
  }
}

/** One calendar day in a single habit's recent rhythm. */
export type DayCell = {
  date: string; // YYYY-MM-DD
  due: boolean;
  done: boolean;
};

/**
 * A single habit's recent rhythm: one cell per calendar day over the last
 * `days` days, oldest → newest (today is the last cell).
 */
export function buildHabitStrip(
  logDates: Iterable<string>,
  frequency: FrequencyJson,
  today: string,
  days: number,
): DayCell[] {
  const logs = new Set(logDates);
  const cells: DayCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    cells.push({
      date,
      due: isHabitDueOn(frequency, date),
      done: logs.has(date),
    });
  }
  return cells;
}

/** One calendar day in the portfolio-wide consistency field. */
export type ConsistencyDay = {
  date: string;
  due: number; // habits due this day
  done: number; // due habits completed this day
  ratio: number; // done / due, 0 when nothing was due
  isToday: boolean;
};

export type HabitForModel = {
  id: string;
  name: string;
  frequency: FrequencyJson;
  logDates: string[];
  currentStreak: number;
};

export type ConsistencyModel = {
  days: ConsistencyDay[];
  dueToday: number;
  doneToday: number;
  totalHabits: number;
  perfectDays: number; // days with due>0 and done===due, in window
  activeDays: number; // days with due>0, in window
  overallRate: number; // Σdone / Σdue across the window, 0..1
  best: { value: number; name: string } | null; // longest *active* streak + its habit
};

/**
 * Aggregate every habit into a single consistency field over the last
 * `windowDays` days: how much of each day's "due" set actually got done.
 */
export function buildConsistencyModel(
  habits: HabitForModel[],
  today: string,
  windowDays: number,
): ConsistencyModel {
  const logSets = habits.map((h) => new Set(h.logDates));

  const days: ConsistencyDay[] = [];
  let perfectDays = 0;
  let activeDays = 0;
  let dueSum = 0;
  let doneSum = 0;

  for (let i = windowDays - 1; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    let due = 0;
    let done = 0;
    for (let h = 0; h < habits.length; h++) {
      if (!isHabitDueOn(habits[h].frequency, date)) continue;
      due += 1;
      if (logSets[h].has(date)) done += 1;
    }
    if (due > 0) {
      activeDays += 1;
      if (done === due) perfectDays += 1;
    }
    dueSum += due;
    doneSum += done;
    days.push({ date, due, done, ratio: due === 0 ? 0 : done / due, isToday: date === today });
  }

  const todayCell = days[days.length - 1];
  const best = habits.reduce<{ value: number; name: string } | null>((acc, h) => {
    if (h.currentStreak <= 0) return acc;
    if (!acc || h.currentStreak > acc.value) {
      return { value: h.currentStreak, name: h.name };
    }
    return acc;
  }, null);

  return {
    days,
    dueToday: todayCell?.due ?? 0,
    doneToday: todayCell?.done ?? 0,
    totalHabits: habits.length,
    perfectDays,
    activeDays,
    overallRate: dueSum === 0 ? 0 : doneSum / dueSum,
    best,
  };
}
