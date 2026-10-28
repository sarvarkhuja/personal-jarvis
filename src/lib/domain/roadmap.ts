import { ROADMAP_WEEKS } from './roadmap-data';
import { ROADMAP_TOPICS } from './roadmap-topics';
import { toUserDate } from './timezone';
import { addDaysISO } from './habit-consistency';

export type Track = 'design' | 'go' | 'ai' | 'ml' | 'evidence';
export type NoteKind = 'learning' | 'question' | 'gotcha' | 'decision' | 'resource' | 'story';

export const TRACKS: readonly { key: Track; label: string }[] = [
  { key: 'design', label: 'DESIGN' },
  { key: 'go', label: 'GO' },
  { key: 'ai', label: 'AI PLATFORM' },
  { key: 'ml', label: 'ML RUNTIME' },
  { key: 'evidence', label: 'EVIDENCE' },
];

export const NOTE_KINDS: readonly { key: NoteKind; label: string }[] = [
  { key: 'learning', label: 'LEARNING' },
  { key: 'question', label: 'QUESTION' },
  { key: 'gotcha', label: 'GOTCHA' },
  { key: 'decision', label: 'DECISION' },
  { key: 'resource', label: 'RESOURCE' },
  { key: 'story', label: 'STORY' },
];

export const DESIGN_ITEM_TEXT = "Write this week's DESIGN.md / ADR before building";

const TOTAL_ITEMS = 140;
const WEEKS = 28;

export function monthOfWeek(week: number): number {
  return Math.ceil(week / 4);
}

export function itemText(week: number, track: Track): string {
  if (track === 'design') return DESIGN_ITEM_TEXT;
  const row = ROADMAP_WEEKS.find((w) => w.week === week);
  return row ? row[track] : '';
}

/** FNV-1a 32-bit, base36. Short, stable, non-crypto. */
export function itemHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export type ItemStatus = {
  week: number;
  track: Track;
  status: 'done' | 'skipped';
  item_hash: string;
  updated_at: string;
};

export function isRevised(s: ItemStatus): boolean {
  return itemHash(itemText(s.week, s.track)) !== s.item_hash;
}

/** First week with an unresolved item; null when all 140 are resolved. */
export function currentWeek(statuses: ItemStatus[]): number | null {
  const resolved = new Map<number, Set<Track>>();
  for (const s of statuses) {
    if (!resolved.has(s.week)) resolved.set(s.week, new Set());
    resolved.get(s.week)!.add(s.track);
  }
  for (let w = 1; w <= WEEKS; w++) {
    if ((resolved.get(w)?.size ?? 0) < TRACKS.length) return w;
  }
  return null;
}

export function weekTally(
  statuses: ItemStatus[],
  week: number,
): { done: number; skipped: number; open: number } {
  let done = 0;
  let skipped = 0;
  for (const s of statuses) {
    if (s.week !== week) continue;
    if (s.status === 'done') done++;
    else skipped++;
  }
  return { done, skipped, open: Math.max(0, TRACKS.length - done - skipped) };
}

export function overallTally(statuses: ItemStatus[]): {
  done: number;
  skipped: number;
  total: 140;
} {
  let done = 0;
  let skipped = 0;
  for (const s of statuses) {
    if (s.status === 'done') done++;
    else skipped++;
  }
  return { done, skipped, total: TOTAL_ITEMS };
}

export function paceSummary(
  statuses: ItemStatus[],
  today: string,
  tz: string,
): { perWeek: number; remaining: number; finishMonth: string } {
  const start = addDaysISO(today, -27);
  let recent = 0;
  for (const s of statuses) {
    const d = toUserDate(s.updated_at, tz);
    if (d >= start && d <= today) recent++;
  }
  const rate = Math.round((recent / 4) * 10) / 10;
  const perWeek = rate > 0 ? rate : 5;
  const remaining = TOTAL_ITEMS - statuses.length;
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
