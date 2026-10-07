import { addDaysISO } from './habit-consistency';
import { SELF_IMAGE_PILLARS, type SelfImageItem, type SelfImageItemInput, type SelfImageMonths, type SelfImagePillar } from '@/lib/schemas/self-images';

export const FUTURE_HORIZONS = [2, 7, 15] as const;

export const HORIZON_IDENTITY: Record<SelfImageMonths, { phase: string; identity: string }> = {
  2: { phase: 'Foundation', identity: 'I don’t negotiate with myself.' },
  7: { phase: 'Standard', identity: 'Consistency is who I am.' },
  15: { phase: 'Identity', identity: 'I am who I once had to force myself to be.' },
};

type Protocol = Record<SelfImagePillar, string[]>;

/** The strict default self-image, loaded per horizon on request. */
export const STRICT_PROTOCOL: Record<SelfImageMonths, Protocol> = {
  2: {
    discipline: [
      'I wake at the same time every day, weekends included.',
      'I plan tomorrow before sleep and start the day with the hardest task.',
      'No phone for the first hour after Fajr or the last hour before sleep.',
      'A missed day never becomes two. I restart the next morning, no drama.',
    ],
    ml: [
      'I do 90 focused minutes of ML every weekday, logged as a focus session.',
      'I finish Python, NumPy and pandas fundamentals plus a linear algebra and probability refresh.',
      'I ship one small project: a baseline model trained, evaluated and written up.',
    ],
    physique: [
      'I train 4 times a week and log every lift.',
      'I hit my protein target daily and walk 8,000+ steps.',
      'I sleep 7+ hours with lights out at a fixed time.',
    ],
    salah: [
      'I pray all five prayers on time and log each one honestly.',
      'I wake for Fajr. The day starts there, not at the alarm after it.',
      'I sit for dhikr after every prayer instead of rushing off.',
    ],
    work: [
      'I do a 2-hour deep-work block before any messages or feeds.',
      'I define one outcome each morning and close it before the day ends.',
    ],
  },
  7: {
    discipline: [
      'I hold 90%+ habit consistency over every 30-day window.',
      'I run a weekly review every Sunday: what I kept, what I broke, what changes.',
      'Outside work, my screen time stays under one hour a day.',
    ],
    ml: [
      'I have shipped 3 end-to-end ML projects with clean repos and honest write-ups.',
      'I can implement and train a neural network from scratch in PyTorch.',
      'I read and reproduce one paper every month.',
    ],
    physique: [
      'Every big-5 lift is measurably up from my baseline, logged weekly.',
      'I track body composition monthly and adjust food and training with data, not feelings.',
      'Busy weeks still get 3 sessions minimum. No exceptions.',
    ],
    salah: [
      'Five prayers on time, with Fajr and Isha in jamaat as my default.',
      'I read Qur’an daily, even if it is one page.',
      'My calendar is built around prayer times, not the other way around.',
    ],
    work: [
      'I deliver something useful every week and protect deep work daily.',
      'I finish what I start before opening something new.',
    ],
  },
  15: {
    discipline: [
      'My routine survives travel, illness and bad days. Discipline is automatic.',
      'I review my long-term direction monthly and cut what does not serve it.',
    ],
    ml: [
      'I work as an ML practitioner with a deployed, maintained product that real people use.',
      'I read papers weekly and publish what I learn.',
    ],
    physique: [
      'I am lean, strong and athletic, and I maintain it year-round.',
      'Training and recovery are fixed in my week, just like prayer.',
    ],
    salah: [
      'I guard all five prayers on time wherever I am.',
      'I pray with presence, not speed, and keep learning the meaning of what I recite.',
    ],
    work: [
      'I own meaningful projects end to end and am known for reliability.',
      'My work, health and deen grow together. None is sacrificed for the others.',
    ],
  },
};

export function protocolItems(months: SelfImageMonths): SelfImageItemInput[] {
  return SELF_IMAGE_PILLARS.flatMap(({ key }) => STRICT_PROTOCOL[months][key].map((body) => ({ months, pillar: key, body })));
}

/** Items for one horizon, grouped in pillar order; input order is kept within a pillar. */
export function groupSelfImage(items: SelfImageItem[], months: SelfImageMonths) {
  return SELF_IMAGE_PILLARS.map((pillar) => ({
    ...pillar,
    items: items.filter((item) => item.months === months && item.pillar === pillar.key),
  }));
}

/** Calendar months, clamped to month end; independent of the server timezone. */
export function horizonDate(start: string, months: number): string {
  const [year, month, day] = start.split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1 + months + 1, 0));
  end.setUTCDate(Math.min(day, end.getUTCDate()));
  return end.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
}

/** Horizons are fixed from the start date, so the countdown moves as days pass. */
export function buildRunway(start: string, today: string) {
  const ends = FUTURE_HORIZONS.map((months) => ({ months, end: horizonDate(start, months) }));
  const total = daysBetween(start, ends[ends.length - 1].end);
  const elapsed = Math.min(total, Math.max(0, daysBetween(start, today)));
  const spans = ends.map(({ months, end }) => {
    const length = daysBetween(start, end);
    return { months, end, length, remaining: Math.max(0, length - elapsed), reached: elapsed >= length };
  });
  return { start, total, elapsed, day: Math.min(total, elapsed + 1), weeks: Math.ceil(total / 7), spans };
}

export type Runway = ReturnType<typeof buildRunway>;

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
