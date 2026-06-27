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

/** Whole-day difference b − a for date-only ISO strings (UTC midnight). */
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export type BodyWeightSummary = {
  latest: number | null;
  latestDate: string | null;
  target: number | null;
  deltaToTarget: number | null;
  netDelta: number | null;
  towardTarget: 'toward' | 'away' | 'flat' | null;
  count: number;
  spark: { x: number; y: number }[];
  targetY: number | null;
};

/**
 * Latest weigh-in, distance to target, net change over the window, and a
 * pre-normalized sparkline (x/y in 0..100) for a compact SVG. Mirrors the
 * proven axis math in WeightTrendCard: x spans [windowStart, today] (widened
 * left if an older point slips in), y spans the weight range plus the target,
 * padded 12% so the line breathes. `today` is a user-local YYYY-MM-DD; all math
 * is pure and SSR-stable.
 */
export function bodyWeightSummary(
  metrics: { date: string; weight_kg: number | null }[],
  targetWeight: number | null,
  today: string,
  days: number,
): BodyWeightSummary {
  const pts = metrics
    .filter((m): m is { date: string; weight_kg: number } => m.weight_kg != null)
    .map((m) => ({ date: m.date, weight: Number(m.weight_kg) }))
    .sort((a, b) => a.date.localeCompare(b.date)); // oldest -> newest

  const target = targetWeight;
  const count = pts.length;

  if (count === 0) {
    return {
      latest: null,
      latestDate: null,
      target,
      deltaToTarget: null,
      netDelta: null,
      towardTarget: null,
      count: 0,
      spark: [],
      targetY: null,
    };
  }

  const earliest = pts[0];
  const latest = pts[pts.length - 1];
  const netDelta = count >= 2 ? latest.weight - earliest.weight : null;
  const deltaToTarget = target != null ? latest.weight - target : null;

  let towardTarget: BodyWeightSummary['towardTarget'] = null;
  if (target != null && count >= 2) {
    const before = Math.abs(earliest.weight - target);
    const after = Math.abs(latest.weight - target);
    towardTarget = after < before ? 'toward' : after > before ? 'away' : 'flat';
  }

  // x-axis spans [windowStart, today]; widen left if an older point slips in.
  const windowStart = addDaysISO(today, -(days - 1));
  const spanStart = earliest.date < windowStart ? earliest.date : windowStart;
  const spanDays = Math.max(1, dayDiff(spanStart, today));
  const xOf = (date: string) => (dayDiff(spanStart, date) / spanDays) * 100;

  // y-axis spans the weight range (plus target), padded so the line breathes.
  const weights = pts.map((p) => p.weight);
  const valuesForRange = target != null ? [...weights, target] : weights;
  let lo = Math.min(...valuesForRange);
  let hi = Math.max(...valuesForRange);
  if (hi === lo) {
    hi = lo + 1;
    lo = lo - 1;
  }
  const pad = (hi - lo) * 0.12;
  const yBot = lo - pad;
  const yTop = hi + pad;
  const yOf = (w: number) => 100 - ((w - yBot) / (yTop - yBot)) * 100;

  const spark = pts.map((p) => ({ x: xOf(p.date), y: yOf(p.weight) }));
  const targetY = target != null ? yOf(target) : null;

  return {
    latest: latest.weight,
    latestDate: latest.date,
    target,
    deltaToTarget,
    netDelta,
    towardTarget,
    count,
    spark,
    targetY,
  };
}
