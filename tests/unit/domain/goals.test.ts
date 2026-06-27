import { describe, expect, it } from 'vitest';
import { buildGoalTree, topGoalsNearestTarget } from '@/lib/domain/goals';

describe('buildGoalTree', () => {
  it('returns roots when there are no parents', () => {
    const tree = buildGoalTree([
      { id: 'a', parent_goal_id: null, title: 'A' },
      { id: 'b', parent_goal_id: null, title: 'B' },
    ]);
    expect(tree).toHaveLength(2);
    expect(tree[0].children).toEqual([]);
    expect(tree[1].children).toEqual([]);
  });

  it('nests children under parents', () => {
    const tree = buildGoalTree([
      { id: 'root', parent_goal_id: null, title: 'Root' },
      { id: 'child1', parent_goal_id: 'root', title: 'C1' },
      { id: 'child2', parent_goal_id: 'root', title: 'C2' },
      { id: 'grand', parent_goal_id: 'child1', title: 'G' },
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('root');
    expect(tree[0].children.map((c) => c.id)).toEqual(['child1', 'child2']);
    expect(tree[0].children[0].children.map((c) => c.id)).toEqual(['grand']);
  });

  it('promotes orphans (parent not in input) to roots', () => {
    const tree = buildGoalTree([
      // parent 'missing' is not in the input set (e.g. status-filtered out)
      { id: 'orphan', parent_goal_id: 'missing', title: 'Orphan' },
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('orphan');
  });

  it('preserves sibling order from input', () => {
    const tree = buildGoalTree([
      { id: 'r', parent_goal_id: null, title: 'R' },
      { id: 'b', parent_goal_id: 'r', title: 'B' },
      { id: 'a', parent_goal_id: 'r', title: 'A' },
    ]);
    expect(tree[0].children.map((c) => c.id)).toEqual(['b', 'a']);
  });
});

describe('topGoalsNearestTarget', () => {
  const goals = [
    { id: '1', status: 'active', target_date: '2026-12-31' },
    { id: '2', status: 'active', target_date: '2026-05-01' },
    { id: '3', status: 'active', target_date: null },
    { id: '4', status: 'active', target_date: '2026-04-26' }, // today
    { id: '5', status: 'done', target_date: '2026-04-27' },
  ];

  it('orders by date proximity to today, with null last', () => {
    const top = topGoalsNearestTarget(goals, 4, '2026-04-26');
    expect(top.map((g) => g.id)).toEqual(['4', '2', '1', '3']);
  });

  it('drops non-active goals', () => {
    const top = topGoalsNearestTarget(goals, 10, '2026-04-26');
    expect(top.find((g) => g.id === '5')).toBeUndefined();
  });

  it('returns at most n', () => {
    expect(topGoalsNearestTarget(goals, 2, '2026-04-26')).toHaveLength(2);
  });
});
