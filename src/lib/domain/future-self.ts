import { addDaysISO } from './habit-consistency';

export const FUTURE_HORIZONS = [2, 7, 15] as const;

/** Calendar months, clamped to month end; independent of the server timezone. */
export function horizonDate(start: string, months: number): string {
  const [year, month, day] = start.split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1 + months + 1, 0));
  end.setUTCDate(Math.min(day, end.getUTCDate()));
  return end.toISOString().slice(0, 10);
}

export function attentionProjection(start: string, months: number, minutes: number, missedDaysPerWeek: number) {
  const end = horizonDate(start, months);
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
  const dailyMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  const missed = Number.isFinite(missedDaysPerWeek) ? Math.min(7, Math.max(0, missedDaysPerWeek)) : 0;
  const availableHours = days * dailyMinutes / 60;
  const lostHours = availableHours * missed / 7;
  return { end, days, availableHours, lostHours, keptHours: availableHours - lostHours };
}

type FocusEvidence = { localDate: string; durationMin: number; ended: boolean };

/** Last 14 finished days. Today is separate so an unfinished day is never a miss. */
export function buildAttentionEvidence(sessions: FocusEvidence[], today: string) {
  const minutesByDate = new Map<string, number>();
  for (const session of sessions) {
    if (!session.ended || !Number.isFinite(session.durationMin) || session.durationMin <= 0) continue;
    minutesByDate.set(session.localDate, (minutesByDate.get(session.localDate) ?? 0) + session.durationMin);
  }
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDaysISO(today, i - 14);
    return { date, minutes: minutesByDate.get(date) ?? 0 };
  });
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
  return {
    days,
    totalMinutes,
    activeDays: days.filter((day) => day.minutes > 0).length,
    dailyAverage: totalMinutes / 14,
    todayMinutes: minutesByDate.get(today) ?? 0,
  };
}

export type AttentionEvidence = ReturnType<typeof buildAttentionEvidence>;
