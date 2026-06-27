import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { isHabitDueOn, type FrequencyJson } from './schedule';

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  completionRate30d: number; // 0..1
};

/**
 * Compute current streak, longest streak, and 30-day completion rate.
 *
 * @param logDates    YYYY-MM-DD strings (will be deduplicated). Order doesn't matter.
 * @param frequency   The habit's schedule rule.
 * @param today       YYYY-MM-DD considered "today" in the user's timezone.
 *
 * Streak semantics: walk back from today; for each calendar day:
 *  - if the habit is not due that day, the streak is "kept" — skip the day.
 *  - if the habit is due and there's a log on that date, increment.
 *  - if the habit is due and there is no log, the streak ends.
 *
 * Today is allowed to be unlogged without breaking the streak (so the streak
 * stays valid through the day until you actually log it). The current streak
 * therefore measures consecutive *due-and-completed* days ending on the most
 * recent due day with a log on or before today.
 */
export function computeStreak(
  logDates: string[],
  frequency: FrequencyJson,
  today: string,
): StreakResult {
  const logs = new Set(logDates);
  const todayDate = parseISO(today);

  // ---- current streak ----
  let cursor = todayDate;
  let current = 0;
  let firstDueEncountered = false;
  for (let i = 0; i < 366 * 5; i++) {
    const iso = formatISO(cursor);
    const due = isHabitDueOn(frequency, iso);
    if (!due) {
      cursor = addDays(cursor, -1);
      continue;
    }
    const logged = logs.has(iso);
    if (!firstDueEncountered) {
      firstDueEncountered = true;
      // Today (or the most recent due day) being unlogged shouldn't reset the
      // streak yet — give the user grace until the day passes. So if this is
      // today and not logged, look back to the previous due day instead.
      if (!logged && iso === today) {
        cursor = addDays(cursor, -1);
        continue;
      }
    }
    if (logged) {
      current += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }

  // ---- longest streak (over all logged dates) ----
  // Build a sorted list of unique dates.
  const sorted = [...logs].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const iso of sorted) {
    if (prev === null) {
      run = 1;
    } else {
      const gap = differenceInCalendarDays(parseISO(iso), parseISO(prev));
      // Walk the gap; non-due days don't break the run.
      let broken = false;
      for (let g = 1; g < gap; g++) {
        const intermediate = formatISO(addDays(parseISO(prev), g));
        if (isHabitDueOn(frequency, intermediate) && !logs.has(intermediate)) {
          broken = true;
          break;
        }
      }
      run = broken ? 1 : run + 1;
    }
    if (run > longest) longest = run;
    prev = iso;
  }

  // ---- 30-day completion rate ----
  let dueDays30 = 0;
  let metDays30 = 0;
  for (let i = 0; i < 30; i++) {
    const iso = formatISO(addDays(todayDate, -i));
    if (!isHabitDueOn(frequency, iso)) continue;
    dueDays30 += 1;
    if (logs.has(iso)) metDays30 += 1;
  }
  const completionRate30d = dueDays30 === 0 ? 0 : metDays30 / dueDays30;

  return { currentStreak: current, longestStreak: longest, completionRate30d };
}

function formatISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
