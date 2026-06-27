import { daysBetween } from './goals';

export type GoalStatusValue =
  | 'active'
  | 'done'
  | 'abandoned'
  | 'completed'
  | 'paused';

/** 'completed' is a legacy synonym for 'done' — collapse the two everywhere. */
export type NormalizedStatus = 'active' | 'done' | 'abandoned' | 'paused';

export function normalizeStatus(status: GoalStatusValue): NormalizedStatus {
  return status === 'completed' ? 'done' : status;
}

/** Semantic colour roles. Components map these to token classes. */
export type Tone = 'accent' | 'success' | 'muted' | 'primary';

export interface Countdown {
  label: string;
  tone: Tone;
  /** Days from today to target (negative = overdue). null when not applicable. */
  days: number | null;
}

/**
 * The single source of truth for a goal's time/status chip — used by both the
 * hero countdown and every card so the language never diverges. Red (accent)
 * is reserved for the one urgent state: overdue or due today.
 */
export function countdownFor(
  target_date: string | null,
  today: string,
  status: GoalStatusValue,
): Countdown {
  const s = normalizeStatus(status);
  if (s === 'done') return { label: 'DONE', tone: 'success', days: null };
  if (s === 'abandoned') return { label: 'DROPPED', tone: 'muted', days: null };
  if (s === 'paused') return { label: 'PAUSED', tone: 'muted', days: null };

  if (!target_date) return { label: 'NO DEADLINE', tone: 'muted', days: null };

  const days = daysBetween(today, target_date);
  if (days < 0) return { label: `OVERDUE ${-days}D`, tone: 'accent', days };
  if (days === 0) return { label: 'DUE TODAY', tone: 'accent', days };
  return { label: `${days}D LEFT`, tone: 'primary', days };
}

/** Token text-colour class per tone. Centralised so cards and hero agree. */
export const TONE_TEXT: Record<Tone, string> = {
  accent: 'text-accent',
  success: 'text-success',
  muted: 'text-text-disabled',
  primary: 'text-text-primary',
};
