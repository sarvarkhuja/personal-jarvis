import { NOTE_KINDS, type NoteKind, type Track } from './roadmap';

export type RoadmapNote = {
  id: string;
  week: number;
  track: Track | null;
  kind: NoteKind;
  confidence: 1 | 2 | 3;
  body: string;
  topics: string[];
  created_at: string;
  updated_at: string;
};

export type LibraryParams = {
  topic?: string;
  kind?: NoteKind;
  conf?: 1 | 2 | 3;
  q?: string;
  group: 'topic' | 'kind' | 'confidence' | 'none';
  sort: 'weakest' | 'newest' | 'oldest';
};

const GROUPS: LibraryParams['group'][] = ['topic', 'kind', 'confidence', 'none'];
const SORTS: LibraryParams['sort'][] = ['weakest', 'newest', 'oldest'];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseLibraryParams(sp: Record<string, string | string[] | undefined>): LibraryParams {
  const kind = first(sp.kind);
  const conf = first(sp.conf);
  const group = first(sp.group);
  const sort = first(sp.sort);
  const topic = first(sp.topic)?.trim();
  const q = first(sp.q)?.trim();

  const out: LibraryParams = {
    group: GROUPS.find((g) => g === group) ?? 'topic',
    sort: SORTS.find((s) => s === sort) ?? 'weakest',
  };
  if (topic) out.topic = topic;
  const k = NOTE_KINDS.find((n) => n.key === kind);
  if (k) out.kind = k.key;
  if (conf === '1' || conf === '2' || conf === '3') out.conf = Number(conf) as 1 | 2 | 3;
  if (q) out.q = q;
  return out;
}

export function filterNotes(notes: RoadmapNote[], p: LibraryParams): RoadmapNote[] {
  const q = p.q?.toLowerCase();
  return notes.filter((n) => {
    if (p.topic && !n.topics.includes(p.topic)) return false;
    if (p.kind && n.kind !== p.kind) return false;
    if (p.conf && n.confidence !== p.conf) return false;
    if (q && !n.body.toLowerCase().includes(q) && !n.topics.some((t) => t.toLowerCase().includes(q))) {
      return false;
    }
    return true;
  });
}

export function sortNotes(notes: RoadmapNote[], sort: LibraryParams['sort']): RoadmapNote[] {
  const byCreated = (a: RoadmapNote, b: RoadmapNote) => a.created_at.localeCompare(b.created_at);
  const copy = [...notes];
  if (sort === 'newest') return copy.sort((a, b) => byCreated(b, a));
  if (sort === 'oldest') return copy.sort(byCreated);
  return copy.sort((a, b) => a.confidence - b.confidence || byCreated(a, b));
}

type Group = { key: string; label: string; notes: RoadmapNote[] };

export function groupNotes(notes: RoadmapNote[], group: LibraryParams['group']): Group[] {
  if (group === 'none') return [{ key: 'all', label: 'ALL', notes }];

  const map = new Map<string, Group>();
  const add = (key: string, label: string, n: RoadmapNote) => {
    const g = map.get(key);
    if (g) g.notes.push(n);
    else map.set(key, { key, label, notes: [n] });
  };

  for (const n of notes) {
    if (group === 'topic') {
      if (n.topics.length === 0) add('—', 'NO TOPIC', n);
      for (const t of n.topics) add(t, t.toUpperCase(), n);
    } else if (group === 'kind') {
      add(n.kind, NOTE_KINDS.find((k) => k.key === n.kind)?.label ?? n.kind.toUpperCase(), n);
    } else {
      add(String(n.confidence), `CONFIDENCE ${n.confidence}`, n);
    }
  }

  const groups = [...map.values()];
  // Array.prototype.sort is stable, so ties keep first-seen order.
  return groups.sort((a, b) => b.notes.length - a.notes.length);
}
