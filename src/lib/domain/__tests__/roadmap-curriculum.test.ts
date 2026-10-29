// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { CAPSTONES, FOUNDATIONS, STRETCH_KEYS, VALID_KEYS, WEEKS, nextUp, weekKeyLists, weekCoreKeys } from '../roadmap-curriculum';

describe('roadmap curriculum', () => {
  it('has 28 weeks, 7 capstones and the audit list', () => {
    expect(WEEKS).toHaveLength(28);
    expect(CAPSTONES).toHaveLength(7);
    expect(FOUNDATIONS).toHaveLength(45);
  });
  it('every checkpoint key is unique and fits the database key shape', () => {
    const all = [...VALID_KEYS];
    expect(all.length).toBe(28 * 24 + CAPSTONES.reduce((n, c) => n + c.definitionOfDone.length, 0) + 45);
    for (const k of all) expect(k).toMatch(/^(know|ex|build|gate|cap|found):[A-Za-z0-9:_-]{1,64}$/);
  });
  it('progress lists hold the 21 core checkpoints; senior stretch is separate', () => {
    expect(weekKeyLists()[0]).toEqual(weekCoreKeys(WEEKS[0]));
    expect(weekKeyLists().every((k) => k.length === 21)).toBe(true);
    expect(STRETCH_KEYS).toHaveLength(84);
    expect(STRETCH_KEYS.every((k) => VALID_KEYS.has(k))).toBe(true);
  });
  it('next up walks concepts, then exercises, then moves to the next week', () => {
    expect(nextUp(new Set())).toMatchObject({ week: 1, tab: 'concepts', kicker: 'Concept' });
    const w1 = new Set(weekKeyLists()[0]);
    expect(nextUp(w1)).toMatchObject({ week: 2, tab: 'concepts' });
    const noEx = new Set([...w1].filter((k) => !k.startsWith('ex:')));
    expect(nextUp(noEx)).toMatchObject({ week: 1, tab: 'practice', kicker: 'Exercise' });
    expect(nextUp(new Set(weekKeyLists().flat()))).toBeNull();
  });
});
