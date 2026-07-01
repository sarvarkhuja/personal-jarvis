import { Coordinates, CalculationParameters, PrayerTimes, Madhab } from 'adhan';
import { addDaysISO } from '@/lib/domain/habit-consistency';
import { toUserDate } from '@/lib/domain/timezone';
import { formatInTimeZone } from 'date-fns-tz';

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = (typeof PRAYERS)[number];

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export type SalahStatus = 'on_time' | 'late' | 'qada';
export type JamaatKind = 'alone' | 'jamaat' | 'masjid';
export type SalahMadhab = 'hanafi' | 'shafi';

export type PrayerOffsets = {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};

export type SalahCalcConfig = {
  latitude: number;
  longitude: number;
  timezone: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaInterval: number;
  madhab: SalahMadhab;
  offsets: PrayerOffsets;
  lateAfterFraction: number; // 0..1; start of "late" as fraction of window
};

export const TASHKENT_DEFAULT: SalahCalcConfig = {
  latitude: 41.2995,
  longitude: 69.2401,
  timezone: 'Asia/Tashkent',
  fajrAngle: 15.5,
  ishaAngle: 15.5,
  ishaInterval: 0,
  madhab: 'hanafi',
  offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 3, isha: 0 },
  lateAfterFraction: 2 / 3,
};

/** adhan CalculationParameters for a config. User offsets go in `adjustments`. */
export function buildParams(cfg: SalahCalcConfig): CalculationParameters {
  const p = new CalculationParameters('Other', cfg.fajrAngle, cfg.ishaAngle);
  if (cfg.ishaInterval > 0) p.ishaInterval = cfg.ishaInterval;
  p.madhab = cfg.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  p.adjustments.fajr = cfg.offsets.fajr;
  p.adjustments.dhuhr = cfg.offsets.dhuhr;
  p.adjustments.asr = cfg.offsets.asr;
  p.adjustments.maghrib = cfg.offsets.maghrib;
  p.adjustments.isha = cfg.offsets.isha;
  return p;
}

/**
 * The five prayer START instants (absolute UTC) for a Tashkent-local calendar
 * day. adhan reads only Y/M/D from the Date via LOCAL getters, so constructing
 * `new Date(y, m-1, d)` round-trips correctly on any server timezone.
 */
export function prayerTimesForDay(
  localYmd: string,
  cfg: SalahCalcConfig,
): Record<PrayerName, Date> {
  const [y, m, d] = localYmd.split('-').map(Number);
  const coords = new Coordinates(cfg.latitude, cfg.longitude);
  const pt = new PrayerTimes(coords, new Date(y, m - 1, d), buildParams(cfg));
  return {
    fajr: pt.fajr,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

export type PrayerWindow = { start: Date; end: Date };

/** Per-prayer window [start, nextStart). Isha ends at tomorrow's Fajr. */
export function prayerWindowsForDay(
  localYmd: string,
  cfg: SalahCalcConfig,
): Record<PrayerName, PrayerWindow> {
  const t = prayerTimesForDay(localYmd, cfg);
  const tomorrow = prayerTimesForDay(addDaysISO(localYmd, 1), cfg);
  return {
    fajr: { start: t.fajr, end: t.dhuhr },
    dhuhr: { start: t.dhuhr, end: t.asr },
    asr: { start: t.asr, end: t.maghrib },
    maghrib: { start: t.maghrib, end: t.isha },
    isha: { start: t.isha, end: tomorrow.fajr },
  };
}

/**
 * on_time = first `lateAfterFraction` of the window; late = the tail; qada =
 * at/after end or before start (a log with no active window is a make-up).
 */
export function classifyLog(
  loggedAt: Date,
  w: PrayerWindow,
  lateAfterFraction: number,
): SalahStatus {
  const t = loggedAt.getTime();
  const s = w.start.getTime();
  const e = w.end.getTime();
  if (t < s || t >= e) return 'qada';
  const threshold = s + (e - s) * lateAfterFraction;
  return t >= threshold ? 'late' : 'on_time';
}

/** Suggested status for a fresh tap = classify "now" against the window. */
export function suggestStatus(
  now: Date,
  w: PrayerWindow,
  lateAfterFraction: number,
): SalahStatus {
  return classifyLog(now, w, lateAfterFraction);
}

/** A prayer is missed when no log exists and its window has fully passed. */
export function isMissed(now: Date, w: PrayerWindow, hasLog: boolean): boolean {
  return !hasLog && now.getTime() >= w.end.getTime();
}

export type LoggedPrayer = {
  prayer: PrayerName;
  status: SalahStatus;
  jamaat: JamaatKind | null;
};

export type PrayerCellState = 'prayed' | 'current' | 'upcoming' | 'missed';

export type PrayerCell = {
  name: PrayerName;
  label: string;
  start: Date;
  end: Date;
  state: PrayerCellState;
  status: SalahStatus | null;
  jamaat: JamaatKind | null;
};

export type NextPrayer = { name: PrayerName; at: Date; isTomorrow: boolean };

export type DayModel = {
  date: string;
  cells: PrayerCell[];
  next: NextPrayer | null;
};

/** Today's five prayers with per-prayer state, plus the next upcoming prayer. */
export function buildDayModel(
  now: Date,
  cfg: SalahCalcConfig,
  todaysLogs: LoggedPrayer[],
): DayModel {
  const date = toUserDate(now, cfg.timezone);
  const windows = prayerWindowsForDay(date, cfg);
  const isFriday = formatInTimeZone(windows.dhuhr.start, cfg.timezone, 'EEEE') === 'Friday';
  const t = now.getTime();

  const cells: PrayerCell[] = PRAYERS.map((name) => {
    const w = windows[name];
    const log = todaysLogs.find((l) => l.prayer === name) ?? null;
    let state: PrayerCellState;
    if (log) state = 'prayed';
    else if (t >= w.end.getTime()) state = 'missed';
    else if (t >= w.start.getTime()) state = 'current';
    else state = 'upcoming';
    const label = name === 'dhuhr' && isFriday ? "Jumu'ah" : PRAYER_LABELS[name];
    return {
      name,
      label,
      start: w.start,
      end: w.end,
      state,
      status: log?.status ?? null,
      jamaat: log?.jamaat ?? null,
    };
  });

  // Next = first prayer whose window has not started yet; else tomorrow's Fajr.
  let next: NextPrayer | null = null;
  for (const name of PRAYERS) {
    if (windows[name].start.getTime() > t) {
      next = { name, at: windows[name].start, isTomorrow: false };
      break;
    }
  }
  if (!next) {
    const tomorrowFajr = prayerTimesForDay(addDaysISO(date, 1), cfg).fajr;
    next = { name: 'fajr', at: tomorrowFajr, isTomorrow: true };
  }

  return { date, cells, next };
}

export type WeekCellStatus = SalahStatus | 'missed' | 'pending';
export type WeekDay = {
  date: string;
  isToday: boolean;
  prayers: { name: PrayerName; status: WeekCellStatus }[];
};

export type SalahConsistency = {
  streakCurrent: number;
  streakLongest: number;
  onTimeRate30d: number;
  jamaatRate30d: number;
  qadaCount30d: number;
  missedCount30d: number;
  totalLogged30d: number;
  week: WeekDay[];
};

function isPerfectDay(logsByDate: Map<string, LoggedPrayer[]>, date: string): boolean {
  const logs = logsByDate.get(date) ?? [];
  return PRAYERS.every((p) => logs.some((l) => l.prayer === p));
}

/** Streak/quality metrics over a trailing 30-day window ending at `today`. */
export function buildSalahConsistency(
  logsByDate: Map<string, LoggedPrayer[]>,
  today: string,
  now: Date,
  cfg: SalahCalcConfig,
): SalahConsistency {
  // Current streak: consecutive perfect days ending today (or yesterday if
  // today is not yet complete).
  let streakCurrent = 0;
  let cursor = isPerfectDay(logsByDate, today) ? today : addDaysISO(today, -1);
  while (isPerfectDay(logsByDate, cursor)) {
    streakCurrent++;
    cursor = addDaysISO(cursor, -1);
  }

  // Longest streak + 30-day quality metrics + missed derivation.
  let streakLongest = 0;
  let run = 0;
  let onTime = 0;
  let jamaat = 0;
  let qada = 0;
  let missed = 0;
  let totalLogged = 0;
  const t = now.getTime();

  for (let i = 29; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    if (isPerfectDay(logsByDate, date)) {
      run++;
      streakLongest = Math.max(streakLongest, run);
    } else {
      run = 0;
    }
    const logs = logsByDate.get(date) ?? [];
    const windows = prayerWindowsForDay(date, cfg);
    for (const name of PRAYERS) {
      const log = logs.find((l) => l.prayer === name);
      if (log) {
        totalLogged++;
        if (log.status === 'on_time') onTime++;
        if (log.status === 'qada') qada++;
        if (log.jamaat === 'jamaat' || log.jamaat === 'masjid') jamaat++;
      } else if (t >= windows[name].end.getTime()) {
        missed++;
      }
    }
  }

  // Trailing 7-day per-prayer grid (oldest → newest).
  const week: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    const logs = logsByDate.get(date) ?? [];
    const windows = prayerWindowsForDay(date, cfg);
    const prayers = PRAYERS.map((name) => {
      const log = logs.find((l) => l.prayer === name);
      let status: WeekCellStatus;
      if (log) status = log.status;
      else if (t >= windows[name].end.getTime()) status = 'missed';
      else status = 'pending';
      return { name, status };
    });
    week.push({ date, isToday: date === today, prayers });
  }

  return {
    streakCurrent,
    streakLongest,
    onTimeRate30d: totalLogged ? onTime / totalLogged : 0,
    jamaatRate30d: totalLogged ? jamaat / totalLogged : 0,
    qadaCount30d: qada,
    missedCount30d: missed,
    totalLogged30d: totalLogged,
    week,
  };
}

export type SalahDaySummary = {
  prayedCount: number;
  nextLabel: string | null;
  nextAt: string | null; // 'HH:mm' in cfg.timezone
  streakCurrent: number;
  onTimeRate7d: number;
};

/** Compact summary for the home glance. `today` is the user-local date. */
export function salahDaySummary(
  cfg: SalahCalcConfig,
  todaysLogs: LoggedPrayer[],
  logsByDate: Map<string, LoggedPrayer[]>,
  now: Date,
  today: string,
): SalahDaySummary {
  const model = buildDayModel(now, cfg, todaysLogs);
  const prayedCount = model.cells.filter((c) => c.state === 'prayed').length;

  let on = 0;
  let tot = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDaysISO(today, -i);
    const logs = logsByDate.get(date) ?? [];
    for (const p of PRAYERS) {
      const log = logs.find((l) => l.prayer === p);
      if (!log) continue;
      tot++;
      if (log.status === 'on_time') on++;
    }
  }

  const consistency = buildSalahConsistency(logsByDate, today, now, cfg);
  return {
    prayedCount,
    nextLabel: model.next ? PRAYER_LABELS[model.next.name] : null,
    nextAt: model.next ? formatInTimeZone(model.next.at, cfg.timezone, 'HH:mm') : null,
    streakCurrent: consistency.streakCurrent,
    onTimeRate7d: tot ? on / tot : 0,
  };
}
