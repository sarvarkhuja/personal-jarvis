export type Track = 'go' | 'ai' | 'ml';
export interface Resource {
  id: string;
  title: string;
  url: string;
  type: string;
  origin: string;
}
export interface LearningMaterial {
  resourceId: string;
  track: Track;
  required: boolean;
  focus: string;
}
export interface KnowledgeItem {
  id: string;
  track: Track;
  objective: string;
  selfCheck: string;
}
export interface Exercise {
  id: string;
  track: Track;
  priority: 'core' | 'optional';
  estimatedHours: number;
  task: string;
  verification: string;
  artifact: string;
}
export interface Week {
  week: number;
  month: number;
  go: string;
  ai: string;
  ml: string;
  evidence: string;
  capstone: number | null;
  title: string;
  goal: string;
  capstoneId: number;
  learningMaterials: LearningMaterial[];
  knowledgeChecklist: KnowledgeItem[];
  exercises: Exercise[];
  integratedBuild: { estimatedHours: number; task: string; verification: string[]; artifact: string };
  definitionOfDone: string[];
  optionalStretch: { priority: string; estimatedAdditionalHours: string; task: string };
  sourceGuideSections: string[];
  weeklyCoreHours: number;
}
export interface Capstone {
  n: number;
  title: string;
  description: string;
  weeks: number[];
  definitionOfDone: string[];
  deferredFeatures: { feature: string; week: number }[];
  exitWeek: number;
  relatedExerciseIds: string[];
}
export interface RoadmapData {
  schemaVersion: string;
  meta: { title: string; targetRole: string; weeks: number; coreHoursPerWeek: number; coreHoursTotal: number };
  workflow: {
    weeklySessions: { day: string; hours: number; focus: string }[];
    weeklyGate: string[];
    principles: string[];
  };
  weeks: Week[];
  capstones: Capstone[];
  resourceCatalog: Record<string, Resource>;
}
export type NoteKind = 'LEARNING' | 'QUESTION' | 'GOTCHA' | 'DECISION' | 'RESOURCE' | 'STORY';
export interface Note {
  id: string;
  week: number;
  kind: NoteKind;
  body: string;
  createdAt: string;
}
export interface ProgressData {
  completed: Record<string, boolean>;
  notes: Note[];
  currentWeek: number;
  startedAt: string | null;
}
export type View = 'week' | 'library' | 'capstones';
export const TRACKS: Record<Track, { label: string; short: string; color: string }> = {
  go: { label: 'GO / SYSTEMS', short: 'GO', color: 'mint' },
  ai: { label: 'AI PLATFORM', short: 'AI', color: 'blue' },
  ml: { label: 'ML RUNTIME', short: 'ML', color: 'amber' },
};
