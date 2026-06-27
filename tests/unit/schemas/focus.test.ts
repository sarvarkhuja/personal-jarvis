import { describe, expect, it } from 'vitest';
import {
  EndFocusSessionSchema,
  StartFocusSessionSchema,
} from '@/lib/schemas/focus';

const validUuid = '00000000-0000-4000-8000-000000000001';

describe('StartFocusSessionSchema', () => {
  it('parses a minimal start input', () => {
    expect(StartFocusSessionSchema.parse({ planned_minutes: 25 })).toEqual({
      planned_minutes: 25,
    });
  });

  it('accepts intent + linked goal/habit', () => {
    const parsed = StartFocusSessionSchema.parse({
      planned_minutes: 25,
      intent: 'deep work',
      linked_goal_id: validUuid,
      linked_habit_id: null,
    });
    expect(parsed.intent).toBe('deep work');
    expect(parsed.linked_goal_id).toBe(validUuid);
    expect(parsed.linked_habit_id).toBeNull();
  });

  it('rejects out-of-range minutes', () => {
    expect(() => StartFocusSessionSchema.parse({ planned_minutes: 0 })).toThrow();
    expect(() =>
      StartFocusSessionSchema.parse({ planned_minutes: 181 }),
    ).toThrow();
    expect(() =>
      StartFocusSessionSchema.parse({ planned_minutes: 1.5 }),
    ).toThrow();
  });
});

describe('EndFocusSessionSchema', () => {
  it('requires id and completed', () => {
    expect(() => EndFocusSessionSchema.parse({ id: validUuid })).toThrow();
    expect(
      EndFocusSessionSchema.parse({ id: validUuid, completed: true }),
    ).toEqual({ id: validUuid, completed: true });
  });
});
