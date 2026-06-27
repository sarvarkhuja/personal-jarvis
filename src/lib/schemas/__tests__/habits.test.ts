import { describe, expect, it } from 'vitest';
import { CreateHabitSchema, UpdateHabitSchema } from '../habits';

const base = {
  name: 'Focus block',
  goal_id: '123e4567-e89b-12d3-a456-426614174000',
  kind: 'timer' as const,
};

describe('CreateHabitSchema scheduled_time', () => {
  it('accepts a timer habit with a valid HH:MM time', () => {
    const parsed = CreateHabitSchema.parse({ ...base, scheduled_time: '07:30' });
    expect(parsed.scheduled_time).toBe('07:30');
  });

  it('accepts a timer habit with no time', () => {
    const parsed = CreateHabitSchema.parse(base);
    expect(parsed.scheduled_time ?? null).toBeNull();
  });

  it('rejects a non-timer habit that carries a time', () => {
    const result = CreateHabitSchema.safeParse({ ...base, kind: 'check', scheduled_time: '07:30' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'scheduled_time')).toBe(true);
    }
  });

  it('UpdateHabitSchema accepts a partial with only id + scheduled_time', () => {
    const parsed = UpdateHabitSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      scheduled_time: '09:00',
    });
    expect(parsed.scheduled_time).toBe('09:00');
  });

  it('rejects a malformed time', () => {
    expect(() =>
      CreateHabitSchema.parse({ ...base, scheduled_time: '7:5' }),
    ).toThrow();
  });

  it('no longer accepts an emoji field in the output type', () => {
    const parsed = CreateHabitSchema.parse(base) as Record<string, unknown>;
    expect('emoji' in parsed).toBe(false);
  });
});
