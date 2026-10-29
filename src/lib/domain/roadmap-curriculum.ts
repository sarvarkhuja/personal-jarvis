import 'server-only';
import raw from '@/data/roadmap.json';

export type CurriculumTrack = 'go' | 'ai' | 'ml';
export type KnowledgeLevel = 'foundation' | 'intermediate' | 'senior';

export type Resource = { id: string; title: string; url: string; type: string };
export type LearningMaterial = { resourceId: string; track: CurriculumTrack; required: boolean; focus: string };
export type KnowledgeItem = {
  id: string;
  track: CurriculumTrack;
  level: KnowledgeLevel;
  requiredForWeek: boolean;
  objective: string;
  selfCheck: string;
  masteryRule: string;
};
export type Exercise = {
  id: string;
  track: CurriculumTrack;
  priority: 'core' | 'optional';
  estimatedHours: number;
  task: string;
  verification: string;
  artifact: string;
};
export type Week = {
  week: number;
  month: number;
  title: string;
  goal: string;
  capstoneId: number;
  weeklyCoreHours: number;
  learningMaterials: LearningMaterial[];
  knowledgeChecklist: KnowledgeItem[];
  exercises: Exercise[];
  integratedBuild: { estimatedHours: number; task: string; verification: string[]; artifact: string };
  definitionOfDone: string[];
  optionalStretch: { estimatedAdditionalHours: string; task: string };
  sourceGuideSections: string[];
};
export type Capstone = {
  n: number;
  title: string;
  description: string;
  weeks: number[];
  exitWeek: number;
  definitionOfDone: string[];
  deferredFeatures: { feature: string; week: number }[];
};
export type FoundationItem = {
  id: string;
  domain: string;
  areaTitle: string;
  recommendedByWeek: number;
  requiredForCoreReadiness: boolean;
  objective: string;
  selfCheck: string;
};
export type Curriculum = {
  meta: { title: string; targetRole: string; weeks: number; coreHoursPerWeek: number; coreHoursTotal: number };
  workflow: { weeklySessions: { day: string; hours: number; focus: string }[] };
  resourceCatalog: Record<string, Resource>;
  weeks: Week[];
  capstones: Capstone[];
  coreFoundationChecklist: FoundationItem[];
};

export const CURRICULUM = raw as unknown as Curriculum;
export const WEEKS = CURRICULUM.weeks;
export const CAPSTONES = CURRICULUM.capstones;
export const FOUNDATIONS = CURRICULUM.coreFoundationChecklist;

export const MONTH_NAMES = [
  'Foundations', 'Distributed systems', 'Platform engineering', 'Retrieval & evals',
  'Inference systems', 'Agent workflows', 'Production hardening',
] as const;

// Progress keys: one row in roadmap_progress per completed key.
export const knowKey = (id: string) => `know:${id}`;
export const exKey = (id: string) => `ex:${id}`;
export const buildKey = (week: number) => `build:${week}`;
export const gateKey = (week: number, i: number) => `gate:${week}:${i}`;
export const capKey = (n: number, i: number) => `cap:${n}:${i}`;
export const foundKey = (id: string) => `found:${id}`;

export function weekKnowledgeKeys(w: Week): string[] {
  return w.knowledgeChecklist.map((k) => knowKey(k.id));
}
export function weekPracticeKeys(w: Week): string[] {
  return [...w.exercises.map((e) => exKey(e.id)), buildKey(w.week), ...w.definitionOfDone.map((_, i) => gateKey(w.week, i))];
}
export function weekKeys(w: Week): string[] {
  return [...weekKnowledgeKeys(w), ...weekPracticeKeys(w)];
}
export function capstoneKeys(c: Capstone): string[] {
  return c.definitionOfDone.map((_, i) => capKey(c.n, i));
}

/** Every key the app may persist; the server action rejects anything else. */
export const VALID_KEYS: ReadonlySet<string> = new Set([
  ...WEEKS.flatMap(weekKeys),
  ...CAPSTONES.flatMap(capstoneKeys),
  ...FOUNDATIONS.map((f) => foundKey(f.id)),
]);

/** Core = everything except the optional senior-stretch concepts. */
export function weekCoreKeys(w: Week): string[] {
  return [
    ...w.knowledgeChecklist.filter((k) => k.requiredForWeek).map((k) => knowKey(k.id)),
    ...weekPracticeKeys(w),
  ];
}
export function weekCoreKnowledgeKeys(w: Week): string[] {
  return w.knowledgeChecklist.filter((k) => k.requiredForWeek).map((k) => knowKey(k.id));
}
export function weekStretchKeys(w: Week): string[] {
  return w.knowledgeChecklist.filter((k) => !k.requiredForWeek).map((k) => knowKey(k.id));
}

/** Per-week core key lists for the progress strip: small enough to ship to the client. */
export function weekKeyLists(): string[][] {
  return WEEKS.map(weekCoreKeys);
}
export const STRETCH_KEYS: string[] = WEEKS.flatMap(weekStretchKeys);

export type NextUp = { key: string; week: number; tab: 'concepts' | 'practice'; kicker: string; text: string };

const plain = (s: string) => {
  const t = s.replace(/[*`]/g, '').replace(/^(FOUNDATION|MID-LEVEL|SENIOR STRETCH) · /, '');
  return t.length > 150 ? `${t.slice(0, 149).trimEnd()}…` : t;
};

/** Every core checkpoint in learning order: concepts, exercises, build, then the gates. */
function* coreInOrder(): Generator<NextUp> {
  for (const w of WEEKS) {
    for (const k of w.knowledgeChecklist) {
      if (k.requiredForWeek) yield { key: knowKey(k.id), week: w.week, tab: 'concepts', kicker: 'Concept', text: plain(k.objective) };
    }
    for (const e of w.exercises) yield { key: exKey(e.id), week: w.week, tab: 'practice', kicker: 'Exercise', text: plain(e.task) };
    yield { key: buildKey(w.week), week: w.week, tab: 'practice', kicker: 'Weekly build', text: plain(w.integratedBuild.task) };
    for (let i = 0; i < w.definitionOfDone.length; i++) {
      yield { key: gateKey(w.week, i), week: w.week, tab: 'practice', kicker: 'Definition of done', text: plain(w.definitionOfDone[i]) };
    }
  }
}

/** The next few undone core checkpoints. The client skips ones ticked since, so it never lags the counts. */
export function nextUpList(done: ReadonlySet<string>, limit = 8): NextUp[] {
  const out: NextUp[] = [];
  for (const item of coreInOrder()) {
    if (done.has(item.key)) continue;
    out.push(item);
    if (out.length === limit) break;
  }
  return out;
}

export function nextUp(done: ReadonlySet<string>): NextUp | null {
  return nextUpList(done, 1)[0] ?? null;
}
