import { groupHabitsByDayPart } from './day-part';
import {
  normalizeStatus,
  type GoalStatusValue,
  type NormalizedStatus,
} from './goal-display';

/**
 * Goal board: the merged Goals & Habits page groups habits under the goal they
 * serve. This module is pure (no React, no Supabase) so ordering and bucketing
 * rules are unit-testable. See docs/superpowers/specs/2026-11-04-goals-habits-merge-design.md.
 */

export type BoardGoal = {
  id: string;
  title: string;
  status: GoalStatusValue;
  target_date: string | null;
  parent_goal_id: string | null;
  created_at?: string;
};

/** Anything habit-shaped; the board only needs these two fields. */
export type BoardHabitInput = {
  id: string;
  goal_id: string | null;
  scheduled_time: string | null;
};

export type BoardCard<H> = {
  /** null only for the synthetic UNLINKED card. */
  goal: BoardGoal | null;
  status: NormalizedStatus | 'unlinked';
  /** true for paused/done/abandoned goals that still have habits, and for UNLINKED. */
  muted: boolean;
  /** Title of the parent goal when this is a sub-goal whose parent was loaded. */
  parentTitle: string | null;
  /** Habits in day-part order (morning → night → anytime), then input order. */
  habits: H[];
};

export type GoalBoard<H> = {
  /** Active goals (incl. those with zero habits), then muted cards, then UNLINKED (if any). */
  cards: BoardCard<H>[];
  /** Non-active goals with no habits — the collapsed "Finished & paused" section. */
  finished: BoardGoal[];
  /** Dated active goals, nearest first — ticks on the deadlines strip. */
  deadlines: BoardGoal[];
  /** Number of active goals (header count). */
  activeGoalCount: number;
};

/**
 * Ordering rules:
 * - Active cards: target_date ascending (overdue first naturally), undated last,
 *   ties by created_at ascending, then input order.
 * - Muted (non-active with habits) cards come after all active cards, same ordering.
 * - A synthetic UNLINKED card (goal: null, status 'unlinked', muted) collects habits
 *   whose goal_id is null or not among `goals`; it is last and omitted when empty.
 * - `finished`: non-active goals with zero habits, ordered by created_at ascending.
 * - Sub-goals are ordinary flat cards; parentTitle is filled when the parent is in `goals`.
 * - Within a card, habits are ordered by day-part via groupHabitsByDayPart(scheduled_time).
 */
export function buildGoalBoard<H extends BoardHabitInput>(
  goals: BoardGoal[],
  habits: H[],
): GoalBoard<H> {
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const habitsByGoal = new Map<string, H[]>();
  const unlinked: H[] = [];
  for (const h of habits) {
    if (h.goal_id !== null && goalById.has(h.goal_id)) {
      const list = habitsByGoal.get(h.goal_id);
      if (list) list.push(h);
      else habitsByGoal.set(h.goal_id, [h]);
    } else {
      unlinked.push(h);
    }
  }

  const active: BoardGoal[] = [];
  const muted: BoardGoal[] = [];
  const finished: BoardGoal[] = [];
  for (const g of goals) {
    if (normalizeStatus(g.status) === 'active') active.push(g);
    else if (habitsByGoal.has(g.id)) muted.push(g);
    else finished.push(g);
  }

  // Array.prototype.sort is stable, so equal keys keep input order.
  active.sort(byDeadline);
  muted.sort(byDeadline);
  finished.sort(byCreatedAt);

  const card = (g: BoardGoal): BoardCard<H> => {
    const status = normalizeStatus(g.status);
    const parent = g.parent_goal_id ? goalById.get(g.parent_goal_id) : undefined;
    return {
      goal: g,
      status,
      muted: status !== 'active',
      parentTitle: parent ? parent.title : null,
      habits: orderHabits(habitsByGoal.get(g.id) ?? []),
    };
  };

  const cards = [...active, ...muted].map(card);
  if (unlinked.length > 0) {
    cards.push({
      goal: null,
      status: 'unlinked',
      muted: true,
      parentTitle: null,
      habits: orderHabits(unlinked),
    });
  }

  return {
    cards,
    finished,
    deadlines: active.filter((g) => g.target_date !== null),
    activeGoalCount: active.length,
  };
}

function orderHabits<H extends BoardHabitInput>(habits: H[]): H[] {
  return groupHabitsByDayPart(habits, (h) => h.scheduled_time).flatMap(
    (section) => section.items,
  );
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** created_at ascending; a goal missing created_at ties (falls back to input order). */
function byCreatedAt(a: BoardGoal, b: BoardGoal): number {
  if (!a.created_at || !b.created_at) return 0;
  return compareStrings(a.created_at, b.created_at);
}

/** target_date ascending (YYYY-MM-DD compares lexically), undated last, then created_at. */
function byDeadline(a: BoardGoal, b: BoardGoal): number {
  if (a.target_date !== b.target_date) {
    if (a.target_date === null) return 1;
    if (b.target_date === null) return -1;
    return compareStrings(a.target_date, b.target_date);
  }
  return byCreatedAt(a, b);
}
