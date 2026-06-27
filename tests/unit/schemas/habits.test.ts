import { describe, expect, it } from 'vitest';
import {
  CreateHabitSchema,
  FrequencyJsonSchema,
  LogHabitSchema,
} from '@/lib/schemas/habits';

describe('FrequencyJsonSchema', () => {
  it('accepts daily', () => {
    expect(FrequencyJsonSchema.parse({ type: 'daily' })).toEqual({ type: 'daily' });
  });
  it('accepts weekly with valid ISO weekday days', () => {
    expect(
      FrequencyJsonSchema.parse({ type: 'weekly', days: [1, 3, 5] }),
    ).toEqual({ type: 'weekly', days: [1, 3, 5] });
  });
  it('rejects weekly with empty days', () => {
    expect(() =>
      FrequencyJsonSchema.parse({ type: 'weekly', days: [] }),
    ).toThrow();
  });
  it('rejects weekly with out-of-range day', () => {
    expect(() =>
      FrequencyJsonSchema.parse({ type: 'weekly', days: [0] }),
    ).toThrow();
    expect(() =>
      FrequencyJsonSchema.parse({ type: 'weekly', days: [8] }),
    ).toThrow();
  });
  it('accepts x_per_week', () => {
    expect(FrequencyJsonSchema.parse({ type: 'x_per_week', count: 3 })).toEqual({
      type: 'x_per_week',
      count: 3,
    });
  });
});

describe('CreateHabitSchema', () => {
  const VALID_GOAL_ID = '11111111-1111-4111-8111-111111111111';

  it('parses a minimal check habit when given a goal_id', () => {
    const parsed = CreateHabitSchema.parse({
      name: 'Drink water',
      kind: 'check',
      goal_id: VALID_GOAL_ID,
    });
    expect(parsed.name).toBe('Drink water');
    expect(parsed.kind).toBe('check');
    expect(parsed.goal_id).toBe(VALID_GOAL_ID);
    expect(parsed.frequency).toEqual({ type: 'daily' });
    expect(parsed.color).toBe('gray');
  });
  it('rejects unknown kinds', () => {
    expect(() =>
      CreateHabitSchema.parse({
        name: 'X',
        kind: 'something_else',
        goal_id: VALID_GOAL_ID,
      }),
    ).toThrow();
  });
  it('rejects empty name', () => {
    expect(() =>
      CreateHabitSchema.parse({ name: '', kind: 'check', goal_id: VALID_GOAL_ID }),
    ).toThrow();
  });
  it('rejects payload missing goal_id', () => {
    expect(() =>
      CreateHabitSchema.parse({ name: 'Drink water', kind: 'check' }),
    ).toThrow(/goal_id/);
  });
  it('rejects non-UUID goal_id', () => {
    expect(() =>
      CreateHabitSchema.parse({
        name: 'Drink water',
        kind: 'check',
        goal_id: 'not-a-uuid',
      }),
    ).toThrow();
  });
});

describe('LogHabitSchema', () => {
  it('defaults value to 1', () => {
    const parsed = LogHabitSchema.parse({
      habit_id: '00000000-0000-4000-8000-000000000001',
    });
    expect(parsed.value).toBe(1);
  });
  it('rejects non-positive values', () => {
    expect(() =>
      LogHabitSchema.parse({
        habit_id: '00000000-0000-4000-8000-000000000001',
        value: 0,
      }),
    ).toThrow();
  });
});
