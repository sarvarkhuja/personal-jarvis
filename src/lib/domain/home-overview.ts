import { aggregateExpensesByMonth } from '@/lib/utils/dashboard-utils';
import { addDaysISO } from '@/lib/domain/habit-consistency';

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

/** Previous `YYYY-MM` key, handling the January → previous-December rollover. */
function prevMonthKey(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** Last `n` `YYYY-MM` keys ending at the month of `ym`, ascending. Pure string math, SSR-stable. */
function lastNMonthKeysFrom(ym: string, n: number): string[] {
  const [y, m] = ym.split('-').map(Number);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    let mm = m - i;
    let yy = y;
    while (mm <= 0) {
      mm += 12;
      yy -= 1;
    }
    keys.push(`${yy}-${String(mm).padStart(2, '0')}`);
  }
  return keys;
}

export type MonthSpendSummary = {
  thisMonthTotal: number;
  prevMonthTotal: number;
  delta: number;
  monthLabel: string;
  trend: { key: string; total: number; isCurrent: boolean }[];
};

/**
 * Current-month spend, the signed delta vs last month, and a 6-month
 * ascending trend. `today` is a user-local YYYY-MM-DD; all month keys are
 * derived from it by string math so the result is SSR-stable (no timezone drift).
 */
export function monthSpendSummary(
  expenses: { date: string; amount: number }[],
  today: string,
): MonthSpendSummary {
  const monthly = aggregateExpensesByMonth(expenses);
  const thisMonth = today.slice(0, 7);
  const prev = prevMonthKey(thisMonth);
  const thisMonthTotal = monthly[thisMonth] ?? 0;
  const prevMonthTotal = monthly[prev] ?? 0;
  const trend = lastNMonthKeysFrom(thisMonth, 6).map((key) => ({
    key,
    total: monthly[key] ?? 0,
    isCurrent: key === thisMonth,
  }));
  return {
    thisMonthTotal,
    prevMonthTotal,
    delta: thisMonthTotal - prevMonthTotal,
    monthLabel: MONTHS[Number(thisMonth.slice(5, 7)) - 1],
    trend,
  };
}

export type PillDayCell = {
  date: string;
  taken: number;
  total: number;
  isToday: boolean;
};

export type PillWeekAdherence = {
  takenToday: number;
  total: number;
  week: PillDayCell[];
};

/**
 * Pills taken today vs total active meds, plus a 7-day adherence window
 * ending today (today is the last cell). `logs` may contain duplicate
 * med+date rows; a Set keyed `${id}|${date}` makes counting idempotent.
 */
export function pillWeekAdherence(
  meds: { id: string }[],
  logs: { medication_id: string; log_date: string }[],
  today: string,
): PillWeekAdherence {
  const total = meds.length;
  const taken = new Set(logs.map((l) => `${l.medication_id}|${l.log_date}`));
  const week: PillDayCell[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    const count = meds.filter((m) => taken.has(`${m.id}|${date}`)).length;
    week.push({ date, taken: count, total, isToday: date === today });
  }
  return { takenToday: week[week.length - 1].taken, total, week };
}

/** Minutes as "Nm" under an hour, "Hh" on the hour, else "Hh Mm". */
export function formatMinutes(min: number): string {
  const total = Math.max(0, Math.round(min));
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
