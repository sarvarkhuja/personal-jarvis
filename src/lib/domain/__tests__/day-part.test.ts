import { describe, expect, it } from 'vitest';
import { dayPartOf, groupHabitsByDayPart, DAY_PART_ORDER } from '../day-part';

describe('dayPartOf', () => {
  it('buckets boundary times correctly', () => {
    expect(dayPartOf('05:00')).toBe('morning');
    expect(dayPartOf('11:59')).toBe('morning');
    expect(dayPartOf('12:00')).toBe('afternoon');
    expect(dayPartOf('16:59')).toBe('afternoon');
    expect(dayPartOf('17:00')).toBe('evening');
    expect(dayPartOf('21:59')).toBe('evening');
    expect(dayPartOf('22:00')).toBe('night');
    expect(dayPartOf('04:59')).toBe('night');
    expect(dayPartOf('00:00')).toBe('night');
    expect(dayPartOf('23:30')).toBe('night');
  });

  it('returns anytime for null', () => {
    expect(dayPartOf(null)).toBe('anytime');
  });
});

describe('groupHabitsByDayPart', () => {
  const get = (h: { id: string; t: string | null }) => h.t;

  it('orders sections canonically and drops empty ones', () => {
    const items = [
      { id: 'm', t: '07:00' },
      { id: 'e', t: '20:00' },
      { id: 'a', t: null },
    ];
    const sections = groupHabitsByDayPart(items, get);
    expect(sections.map((s) => s.part)).toEqual(['morning', 'evening', 'anytime']);
    // afternoon and night are empty -> absent
    expect(sections.find((s) => s.part === 'afternoon')).toBeUndefined();
  });

  it('sorts within a section by time ascending', () => {
    const items = [
      { id: 'b', t: '09:30' },
      { id: 'a', t: '06:00' },
      { id: 'c', t: '11:00' },
    ];
    const [morning] = groupHabitsByDayPart(items, get);
    expect(morning.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts the night section across the midnight wrap', () => {
    const items = [
      { id: 'late', t: '00:30' },
      { id: 'early-eve', t: '22:00' },
      { id: 'predawn', t: '04:00' },
      { id: 'mid', t: '23:00' },
    ];
    const [night] = groupHabitsByDayPart(items, get);
    expect(night.part).toBe('night');
    expect(night.items.map((i) => i.id)).toEqual(['early-eve', 'mid', 'late', 'predawn']);
  });

  it('keeps anytime last and preserves input order there', () => {
    const items = [
      { id: 'a1', t: null },
      { id: 'm', t: '08:00' },
      { id: 'a2', t: null },
    ];
    const sections = groupHabitsByDayPart(items, get);
    const anytime = sections[sections.length - 1];
    expect(anytime.part).toBe('anytime');
    expect(anytime.items.map((i) => i.id)).toEqual(['a1', 'a2']);
  });

  it('exposes a canonical order constant ending in anytime', () => {
    expect(DAY_PART_ORDER[DAY_PART_ORDER.length - 1]).toBe('anytime');
  });
});
