// Pure helpers for the /pills 7-day checkbox grid. No I/O.

export type PillDay = {
  date: string; // YYYY-MM-DD
  isoWeekday: number; // 1=Mon .. 7=Sun
  label: string; // 2-letter weekday, e.g. "Mo"
  isToday: boolean;
};

export type GridCell = { date: string; checked: boolean };
export type GridRow = { id: string; name: string; cells: GridCell[] };

// Index by ISO weekday 1..7 (index 0 unused).
const WEEKDAY_LABELS = ['', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Shift a YYYY-MM-DD by whole days using noon-UTC math (DST-safe). */
function shiftDate(date: string, deltaDays: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d + deltaDays, 12);
  const nd = new Date(t);
  const yyyy = nd.getUTCFullYear();
  const mm = String(nd.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(nd.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** ISO weekday (1=Mon..7=Sun) for a YYYY-MM-DD string. */
function isoWeekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return dow === 0 ? 7 : dow;
}

/** The last `count` days ending at `today` (today last/rightmost). */
export function buildPillWeek(today: string, count = 7): PillDay[] {
  const days: PillDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = shiftDate(today, -i);
    const isoWeekday = isoWeekdayOf(date);
    days.push({
      date,
      isoWeekday,
      label: WEEKDAY_LABELS[isoWeekday],
      isToday: i === 0,
    });
  }
  return days;
}

/** One row per medication, each with a checked/unchecked cell per week day. */
export function medicationGridRows(
  meds: { id: string; name: string }[],
  logs: { medication_id: string; log_date: string }[],
  week: PillDay[],
): GridRow[] {
  const logged = new Set(logs.map((l) => `${l.medication_id}|${l.log_date}`));
  return meds.map((m) => ({
    id: m.id,
    name: m.name,
    cells: week.map((d) => ({
      date: d.date,
      checked: logged.has(`${m.id}|${d.date}`),
    })),
  }));
}
