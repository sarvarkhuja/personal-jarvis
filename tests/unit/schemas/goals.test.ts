import { describe, expect, it } from 'vitest';
import {
  CreateGoalSchema,
  LinkGoalToHabitSchema,
  SetGoalStatusSchema,
  UpdateGoalSchema,
} from '@/lib/schemas/goals';

const validUuid = '00000000-0000-4000-8000-000000000001';
const validUuid2 = '00000000-0000-4000-8000-000000000002';

describe('CreateGoalSchema', () => {
  it('parses a minimal goal', () => {
    const parsed = CreateGoalSchema.parse({ title: 'Read 12 books' });
    expect(parsed.title).toBe('Read 12 books');
  });

  it('accepts a target_date in YYYY-MM-DD form', () => {
    const parsed = CreateGoalSchema.parse({
      title: 'Read 12 books',
      target_date: '2026-12-31',
    });
    expect(parsed.target_date).toBe('2026-12-31');
  });

  it('rejects malformed target_date', () => {
    expect(() =>
      CreateGoalSchema.parse({ title: 'X', target_date: '2026/12/31' }),
    ).toThrow();
    expect(() =>
      CreateGoalSchema.parse({ title: 'X', target_date: 'tomorrow' }),
    ).toThrow();
  });

  it('rejects empty title', () => {
    expect(() => CreateGoalSchema.parse({ title: '' })).toThrow();
  });
});

describe('UpdateGoalSchema', () => {
  it('requires id', () => {
    expect(() => UpdateGoalSchema.parse({ title: 'X' })).toThrow();
  });

  it('allows partial updates', () => {
    const parsed = UpdateGoalSchema.parse({ id: validUuid, title: 'New' });
    expect(parsed.title).toBe('New');
    expect(parsed.description).toBeUndefined();
  });
});

describe('SetGoalStatusSchema / LinkGoalToHabitSchema', () => {
  it('SetGoalStatus accepts done', () => {
    expect(
      SetGoalStatusSchema.parse({ id: validUuid, status: 'done' }),
    ).toEqual({ id: validUuid, status: 'done' });
  });

  it('SetGoalStatus rejects unknown status', () => {
    expect(() =>
      SetGoalStatusSchema.parse({ id: validUuid, status: 'bogus' }),
    ).toThrow();
  });

  it('LinkGoalToHabit allows null to unlink', () => {
    const parsed = LinkGoalToHabitSchema.parse({
      goal_id: validUuid,
      habit_id: null,
    });
    expect(parsed.habit_id).toBeNull();
  });

  it('LinkGoalToHabit accepts a uuid to link', () => {
    expect(
      LinkGoalToHabitSchema.parse({ goal_id: validUuid, habit_id: validUuid2 }),
    ).toEqual({ goal_id: validUuid, habit_id: validUuid2 });
  });
});
