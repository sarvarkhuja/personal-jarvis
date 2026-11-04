import { describe, expect, it } from 'vitest';
import { buildGoalBoard, type BoardGoal } from '../goal-board';

function goal(over: Partial<BoardGoal> & { id: string }): BoardGoal {
  return {
    title: over.id.toUpperCase(),
    status: 'active',
    target_date: null,
    parent_goal_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

type H = { id: string; goal_id: string | null; scheduled_time: string | null };
const habit = (id: string, goal_id: string | null, scheduled_time: string | null = null): H => ({
  id,
  goal_id,
  scheduled_time,
});

const cardIds = (cards: { goal: BoardGoal | null }[]) => cards.map((c) => c.goal?.id ?? 'UNLINKED');

describe('buildGoalBoard', () => {
  it('returns an empty board for no input', () => {
    const board = buildGoalBoard([], []);
    expect(board).toEqual({ cards: [], finished: [], deadlines: [], activeGoalCount: 0 });
  });

  it('orders active cards by target_date, undated last, created_at tiebreak, then input order', () => {
    const goals = [
      goal({ id: 'undated-late', created_at: '2026-03-01T00:00:00Z' }),
      goal({ id: 'dec', target_date: '2026-12-01' }),
      goal({ id: 'overdue', target_date: '2026-10-01' }),
      goal({ id: 'undated-early', created_at: '2026-02-01T00:00:00Z' }),
      goal({ id: 'nov-b', target_date: '2026-11-20', created_at: '2026-05-02T00:00:00Z' }),
      goal({ id: 'nov-a', target_date: '2026-11-20', created_at: '2026-05-01T00:00:00Z' }),
      goal({ id: 'nov-c', target_date: '2026-11-20', created_at: '2026-05-02T00:00:00Z' }),
    ];
    const board = buildGoalBoard(goals, []);
    expect(cardIds(board.cards)).toEqual([
      'overdue',
      'nov-a',
      'nov-b',
      'nov-c',
      'dec',
      'undated-early',
      'undated-late',
    ]);
  });

  it('gives an active goal with zero habits a non-muted card', () => {
    const board = buildGoalBoard([goal({ id: 'g' })], []);
    expect(board.cards).toHaveLength(1);
    expect(board.cards[0]).toMatchObject({ status: 'active', muted: false, habits: [] });
    expect(board.finished).toEqual([]);
  });

  it('puts non-active goals with habits in muted cards after all active cards', () => {
    const goals = [
      goal({ id: 'paused', status: 'paused', target_date: '2026-01-01' }),
      goal({ id: 'done', status: 'done', target_date: '2026-02-01' }),
      goal({ id: 'legacy', status: 'completed', target_date: '2026-03-01' }),
      goal({ id: 'dropped', status: 'abandoned' }),
      goal({ id: 'active-late', target_date: '2027-06-01' }),
      goal({ id: 'active-undated' }),
    ];
    const habits = [
      habit('h1', 'paused'),
      habit('h2', 'done'),
      habit('h3', 'legacy'),
      habit('h4', 'dropped'),
    ];
    const board = buildGoalBoard(goals, habits);
    expect(cardIds(board.cards)).toEqual([
      'active-late',
      'active-undated',
      'paused',
      'done',
      'legacy',
      'dropped',
    ]);
    expect(board.cards.map((c) => [c.status, c.muted])).toEqual([
      ['active', false],
      ['active', false],
      ['paused', true],
      ['done', true],
      ['done', true],
      ['abandoned', true],
    ]);
    expect(board.finished).toEqual([]);
  });

  it('sends non-active goals without habits to finished, ordered by created_at', () => {
    const goals = [
      goal({ id: 'b', status: 'paused', created_at: '2026-04-01T00:00:00Z' }),
      goal({ id: 'a', status: 'completed', created_at: '2026-02-01T00:00:00Z' }),
      goal({ id: 'c', status: 'abandoned', created_at: '2026-03-01T00:00:00Z' }),
      goal({ id: 'live' }),
    ];
    const board = buildGoalBoard(goals, []);
    expect(board.finished.map((g) => g.id)).toEqual(['a', 'c', 'b']);
    expect(cardIds(board.cards)).toEqual(['live']);
  });

  it('collects habits with null or unknown goal_id into a trailing UNLINKED card', () => {
    const goals = [goal({ id: 'g' }), goal({ id: 'p', status: 'paused' })];
    const habits = [
      habit('orphan', 'missing'),
      habit('loose', null),
      habit('ok', 'g'),
      habit('p1', 'p'),
    ];
    const board = buildGoalBoard(goals, habits);
    expect(cardIds(board.cards)).toEqual(['g', 'p', 'UNLINKED']);
    const unlinked = board.cards[2];
    expect(unlinked).toMatchObject({ goal: null, status: 'unlinked', muted: true, parentTitle: null });
    expect(unlinked.habits.map((h) => h.id)).toEqual(['orphan', 'loose']);
  });

  it('omits the UNLINKED card when every habit is linked', () => {
    const board = buildGoalBoard([goal({ id: 'g' })], [habit('h', 'g')]);
    expect(cardIds(board.cards)).toEqual(['g']);
  });

  it('fills parentTitle for sub-goals whose parent is loaded, null otherwise', () => {
    const goals = [
      goal({ id: 'parent', title: 'Run a marathon', target_date: '2027-01-01' }),
      goal({ id: 'child', parent_goal_id: 'parent', target_date: '2026-12-01' }),
      goal({ id: 'stray', parent_goal_id: 'gone' }),
    ];
    const board = buildGoalBoard(goals, []);
    // Sub-goals are flat cards sorted by their own deadline.
    expect(cardIds(board.cards)).toEqual(['child', 'parent', 'stray']);
    expect(board.cards.map((c) => c.parentTitle)).toEqual(['Run a marathon', null, null]);
  });

  it('lists only dated active goals as deadlines, nearest first', () => {
    const goals = [
      goal({ id: 'late', target_date: '2027-05-01' }),
      goal({ id: 'undated' }),
      goal({ id: 'paused', status: 'paused', target_date: '2026-11-10' }),
      goal({ id: 'soon', target_date: '2026-11-08' }),
      goal({ id: 'done', status: 'done', target_date: '2026-11-05' }),
      goal({ id: 'sub', parent_goal_id: 'late', target_date: '2026-12-01' }),
    ];
    const board = buildGoalBoard(goals, [habit('h', 'paused')]);
    expect(board.deadlines.map((g) => g.id)).toEqual(['soon', 'sub', 'late']);
  });

  it('counts active goals only', () => {
    const goals = [
      goal({ id: 'a' }),
      goal({ id: 'b', target_date: '2026-12-01' }),
      goal({ id: 'c', status: 'paused' }),
      goal({ id: 'd', status: 'completed' }),
    ];
    expect(buildGoalBoard(goals, []).activeGoalCount).toBe(2);
  });

  it('orders habits within a card by day-part, then input order', () => {
    const habits = [
      habit('anytime-1', 'g', null),
      habit('night', 'g', '23:00'),
      habit('evening', 'g', '19:00'),
      habit('morning-late', 'g', '09:00:00'),
      habit('anytime-2', 'g', null),
      habit('morning-early', 'g', '06:30'),
      habit('afternoon', 'g', '14:00'),
      habit('elsewhere', 'other', '05:00'),
    ];
    const board = buildGoalBoard([goal({ id: 'g' }), goal({ id: 'other' })], habits);
    const g = board.cards.find((c) => c.goal?.id === 'g')!;
    expect(g.habits.map((h) => h.id)).toEqual([
      'morning-early',
      'morning-late',
      'afternoon',
      'evening',
      'night',
      'anytime-1',
      'anytime-2',
    ]);
  });

  it('preserves extra habit fields (generic H)', () => {
    const habits = [{ id: 'h', goal_id: 'g', scheduled_time: null, name: 'Read' }];
    const board = buildGoalBoard([goal({ id: 'g' })], habits);
    expect(board.cards[0].habits[0].name).toBe('Read');
  });
});
