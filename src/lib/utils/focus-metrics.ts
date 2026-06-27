// Pure, SSR-stable derivations for the /focus archive widgets.
// Everything is computed from a list of normalised sessions + a user-local
// `today` (YYYY-MM-DD). No Date.now(), no wall-clock reads — so the same input
// always yields the same output (safe to run on the server and in tests).

export interface FocusSessionLite {
  id: string;
  /** user-local YYYY-MM-DD the session started on */
  localDate: string;
  startedAtMs: number;
  /** focused minutes: planned for completed sessions, elapsed for aborted, 0 while live */
  durationMin: number;
  plannedMinutes: number;
  completed: boolean;
  /** ended_at is set (the session is no longer running) */
  ended: boolean;
  intent: string | null;
  goalLabel: string | null;
}

export type LogState = 'COMPLETE' | 'ABORT' | 'LIVE';

export interface FocusMetrics {
  today: {
    focusedMin: number;
    sessions: number;
    kept: number;
    endedCount: number;
    longestMin: number;
  };
  week: {
    bars: { label: string; min: number; isToday: boolean }[];
    avgMin: number;
    totalMin: number;
  };
  streak: {
    count: number;
    last14: { date: string; active: boolean }[];
  };
  rhythm: {
    cells: { date: string; min: number; tier: 0 | 1 | 2 | 3 | 4; future: boolean }[];
  };
  completion: { kept: number; aborted: number; rate: number };
  where: { rows: { label: string; min: number; pct: number }[]; totalMin: number };
  log: { id: string; label: string; durationMin: number; state: LogState; date: string }[];
  totals: { totalSessions: number; totalMin: number };
}

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const UNTITLED = '— UNTITLED —';

/** Number of ruler ticks for a planned duration (one per minute, collapsing to
 *  one per 2 min past 90 so the row never overflows). Clamped to [1, 90]. */
export function focusTickCount(plannedMinutes: number): number {
  const m = Math.max(1, Math.min(180, Math.floor(plannedMinutes)));
  return m <= 90 ? m : Math.ceil(m / 2);
}

/** YYYY-MM-DD shifted by `n` days. Uses UTC noon to dodge DST edges. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + n, 12));
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 0 = Monday … 6 = Sunday for a YYYY-MM-DD. */
function mondayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0 = Sun
  return (wd + 6) % 7;
}

function minutesToTier(min: number): 0 | 1 | 2 | 3 | 4 {
  if (min <= 0) return 0;
  if (min <= 20) return 1;
  if (min <= 45) return 2;
  if (min <= 90) return 3;
  return 4;
}

function sessionLabel(s: FocusSessionLite): string {
  if (s.goalLabel) return s.goalLabel;
  const intent = s.intent?.trim();
  return intent ? intent : UNTITLED;
}

export function buildFocusMetrics(
  sessions: FocusSessionLite[],
  today: string,
): FocusMetrics {
  // Focused minutes per local day (completed sessions only — the "kept" work).
  const minutesByDate = new Map<string, number>();
  const completedDates = new Set<string>();
  for (const s of sessions) {
    if (!s.completed) continue;
    minutesByDate.set(s.localDate, (minutesByDate.get(s.localDate) ?? 0) + s.durationMin);
    completedDates.add(s.localDate);
  }
  const minOn = (date: string) => minutesByDate.get(date) ?? 0;

  // ── TODAY ────────────────────────────────────────────────────────────────
  const todays = sessions.filter((s) => s.localDate === today);
  const todayCompleted = todays.filter((s) => s.completed);
  const todayStats = {
    focusedMin: minOn(today),
    sessions: todays.length,
    kept: todayCompleted.length,
    endedCount: todays.filter((s) => s.ended).length,
    longestMin: todayCompleted.reduce((mx, s) => Math.max(mx, s.durationMin), 0),
  };

  // ── THIS WEEK (Mon–Sun) ────────────────────────────────────────────────────
  const monday = addDays(today, -mondayIndex(today));
  const bars = WEEKDAY_LABELS.map((label, i) => {
    const date = addDays(monday, i);
    return { label, min: minOn(date), isToday: date === today };
  });
  const weekTotal = bars.reduce((sum, b) => sum + b.min, 0);
  const week = { bars, avgMin: weekTotal / 7, totalMin: weekTotal };

  // ── STREAK + last 14 days ──────────────────────────────────────────────────
  let count = 0;
  let cursor = completedDates.has(today) ? today : addDays(today, -1);
  while (completedDates.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i - 13);
    return { date, active: completedDates.has(date) };
  });
  const streak = { count, last14 };

  // ── RHYTHM (5 weeks × 7, Mon-start, ending this Sunday) ─────────────────────
  const gridStart = addDays(monday, -28);
  const cells = Array.from({ length: 35 }, (_, i) => {
    const date = addDays(gridStart, i);
    const future = date > today;
    const min = minOn(date);
    return { date, min, tier: future ? (0 as const) : minutesToTier(min), future };
  });
  const rhythm = { cells };

  // ── COMPLETION (kept vs aborted across the window) ──────────────────────────
  const ended = sessions.filter((s) => s.ended);
  const keptCount = ended.filter((s) => s.completed).length;
  const abortedCount = ended.length - keptCount;
  const completion = {
    kept: keptCount,
    aborted: abortedCount,
    rate: ended.length ? keptCount / ended.length : 0,
  };

  // ── WHERE IT GOES (focused minutes by goal / intent) ────────────────────────
  const byLabel = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completed || s.durationMin <= 0) continue;
    const label = sessionLabel(s);
    byLabel.set(label, (byLabel.get(label) ?? 0) + s.durationMin);
  }
  const whereTotal = [...byLabel.values()].reduce((sum, v) => sum + v, 0);
  const where = {
    totalMin: whereTotal,
    rows: [...byLabel.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, min]) => ({
        label,
        min,
        pct: whereTotal > 0 ? (min / whereTotal) * 100 : 0,
      })),
  };

  // ── LOG (recent sessions, newest first) ─────────────────────────────────────
  const log = [...sessions]
    .sort((a, b) => b.startedAtMs - a.startedAtMs)
    .slice(0, 18)
    .map((s) => ({
      id: s.id,
      label: sessionLabel(s),
      durationMin: s.durationMin,
      state: (s.completed ? 'COMPLETE' : s.ended ? 'ABORT' : 'LIVE') as LogState,
      date: s.localDate,
    }));

  return {
    today: todayStats,
    week,
    streak,
    rhythm,
    completion,
    where,
    log,
    totals: {
      totalSessions: sessions.length,
      totalMin: sessions.reduce((sum, s) => sum + (s.completed ? s.durationMin : 0), 0),
    },
  };
}
