import { describe, expect, it } from 'vitest';
import { isHabitDueOn } from '@/lib/domain/schedule';

describe('isHabitDueOn — daily', () => {
  it('is always true', () => {
    expect(isHabitDueOn({ type: 'daily' }, '2026-04-25')).toBe(true);
    expect(isHabitDueOn({ type: 'daily' }, '2099-12-31')).toBe(true);
  });
});

describe('isHabitDueOn — weekly', () => {
  it('matches ISO weekday membership', () => {
    // 2026-04-25 is Saturday → ISO day 6.
    expect(isHabitDueOn({ type: 'weekly', days: [6] }, '2026-04-25')).toBe(true);
    expect(isHabitDueOn({ type: 'weekly', days: [1, 3, 5] }, '2026-04-25')).toBe(false);
  });

  it('handles week boundaries (Sun→Mon flip)', () => {
    // 2026-04-26 is Sunday → ISO 7.
    expect(isHabitDueOn({ type: 'weekly', days: [7] }, '2026-04-26')).toBe(true);
    // 2026-04-27 is Monday → ISO 1.
    expect(isHabitDueOn({ type: 'weekly', days: [1] }, '2026-04-27')).toBe(true);
    expect(isHabitDueOn({ type: 'weekly', days: [7] }, '2026-04-27')).toBe(false);
  });

  it('weekdays-only set rejects weekends', () => {
    const weekdays = { type: 'weekly' as const, days: [1, 2, 3, 4, 5] };
    expect(isHabitDueOn(weekdays, '2026-04-25')).toBe(false); // Sat
    expect(isHabitDueOn(weekdays, '2026-04-26')).toBe(false); // Sun
    expect(isHabitDueOn(weekdays, '2026-04-27')).toBe(true); // Mon
  });
});

describe('isHabitDueOn — x_per_week', () => {
  it('does not gate by day; widgets handle counting', () => {
    expect(isHabitDueOn({ type: 'x_per_week', count: 4 }, '2026-04-25')).toBe(true);
  });
});
