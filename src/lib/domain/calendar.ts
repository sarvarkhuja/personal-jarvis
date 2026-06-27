/**
 * Pure calendar-grid math. No I/O. Returns a 6×7 grid of YYYY-MM-DD strings
 * starting on Monday for the month containing `anchor`.
 *
 * Always returns 42 cells; days from the previous/next month fill leading and
 * trailing positions so the grid is rectangular.
 */
export function monthGrid(anchor: string): string[][] {
  const [y, m] = anchor.split('-').map(Number);
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const isoDow = ((firstOfMonth.getUTCDay() + 6) % 7) + 1; // Mon=1..Sun=7
  // Start the grid on the Monday on/before the 1st.
  const start = new Date(firstOfMonth);
  start.setUTCDate(start.getUTCDate() - (isoDow - 1));

  const rows: string[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: string[] = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + r * 7 + c);
      row.push(toISO(d));
    }
    rows.push(row);
  }
  return rows;
}

export function previousMonth(anchor: string): string {
  const [y, m] = anchor.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return monthAnchor(d);
}

export function nextMonth(anchor: string): string {
  const [y, m] = anchor.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return monthAnchor(d);
}

export function monthAnchor(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

export function isInMonth(date: string, anchor: string): boolean {
  return date.slice(0, 7) === anchor.slice(0, 7);
}

export function monthLabel(anchor: string): string {
  const [y, m] = anchor.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function toISO(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Group events by their local YYYY-MM-DD bucket, using the supplied
 * resolver to decide what "local date" means for each event.
 */
export function groupByLocalDate<T>(
  events: T[],
  toLocalDate: (e: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const e of events) {
    const k = toLocalDate(e);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  return map;
}
