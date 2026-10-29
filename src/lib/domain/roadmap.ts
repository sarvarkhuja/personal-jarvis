import { ROADMAP_TOPICS } from './roadmap-topics';
import { toUserDate } from './timezone';
import { addDaysISO } from './habit-consistency';

export type Track = 'go' | 'ai' | 'ml';
export type NoteKind = 'learning' | 'question' | 'gotcha' | 'decision' | 'resource' | 'story';

export const TRACKS: readonly { key: Track; label: string }[] = [
  { key: 'go', label: 'GO / SYSTEMS' },
  { key: 'ai', label: 'AI PLATFORM' },
  { key: 'ml', label: 'ML RUNTIME' },
];

export const NOTE_KINDS: readonly { key: NoteKind; label: string }[] = [
  { key: 'learning', label: 'LEARNING' },
  { key: 'question', label: 'QUESTION' },
  { key: 'gotcha', label: 'GOTCHA' },
  { key: 'decision', label: 'DECISION' },
  { key: 'resource', label: 'RESOURCE' },
  { key: 'story', label: 'STORY' },
];

export function monthOfWeek(week: number): number {
  return Math.ceil(week / 4);
}

export type ProgressRow = { key: string; done_at: string };

export function countDone(keys: readonly string[], done: ReadonlySet<string>): number {
  let n = 0;
  for (const k of keys) if (done.has(k)) n++;
  return n;
}

/** First week with an unfinished checkpoint; null when all are done. */
export function currentWeek(weekKeys: readonly (readonly string[])[], done: ReadonlySet<string>): number | null {
  for (let i = 0; i < weekKeys.length; i++) {
    if (countDone(weekKeys[i], done) < weekKeys[i].length) return i + 1;
  }
  return null;
}

export function paceSummary(
  rows: readonly ProgressRow[],
  total: number,
  today: string,
  tz: string,
): { perWeek: number; remaining: number; finishMonth: string } {
  const start = addDaysISO(today, -27);
  let recent = 0;
  for (const r of rows) {
    const d = toUserDate(r.done_at, tz);
    if (d >= start && d <= today) recent++;
  }
  // Fall back to the planned load (24 checkpoints a week) until there is history.
  const rate = Math.round((recent / 4) * 10) / 10;
  const perWeek = rate > 0 ? rate : 24;
  const remaining = Math.max(0, total - rows.length);
  const days = Math.ceil((remaining / perWeek) * 7);
  return { perWeek, remaining, finishMonth: addDaysISO(today, days).slice(0, 7) };
}

/** 14 entries, oldest first, ending today. */
export function activityDots(timestamps: string[], today: string, tz: string): boolean[] {
  const days = new Set(timestamps.map((t) => toUserDate(t, tz)));
  return Array.from({ length: 14 }, (_, i) => days.has(addDaysISO(today, i - 13)));
}

export function normalizeTopic(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export function suggestTopics(week: number): string[] {
  return ROADMAP_TOPICS.filter((t) => t.weeks.includes(week)).map((t) => t.slug);
}

export function knownTopics(notes: { topics: string[] }[]): { slug: string; count: number }[] {
  const counts = new Map<string, number>(ROADMAP_TOPICS.map((t) => [t.slug, 0]));
  for (const n of notes) for (const t of n.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || (a.slug < b.slug ? -1 : 1));
}
