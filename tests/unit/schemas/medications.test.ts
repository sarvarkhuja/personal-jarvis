import { describe, expect, it } from 'vitest';
import {
  CreateMedicationSchema,
  LogDoseSchema,
  MedicationScheduleSchema,
  RefillSchema,
} from '@/lib/schemas/medications';

const validUuid = '00000000-0000-4000-8000-000000000001';

describe('MedicationScheduleSchema', () => {
  it('accepts a daily schedule', () => {
    const parsed = MedicationScheduleSchema.parse({
      times: ['08:00', '20:00'],
      days: 'daily',
    });
    expect(parsed.days).toBe('daily');
  });

  it('accepts a specific-day schedule', () => {
    expect(
      MedicationScheduleSchema.parse({ times: ['08:00'], days: [1, 3, 5] }),
    ).toEqual({ times: ['08:00'], days: [1, 3, 5] });
  });

  it('rejects empty times', () => {
    expect(() =>
      MedicationScheduleSchema.parse({ times: [], days: 'daily' }),
    ).toThrow();
  });

  it('rejects malformed times', () => {
    expect(() =>
      MedicationScheduleSchema.parse({ times: ['8 AM'], days: 'daily' }),
    ).toThrow();
  });

  it('rejects out-of-range weekdays', () => {
    expect(() =>
      MedicationScheduleSchema.parse({ times: ['08:00'], days: [0] }),
    ).toThrow();
    expect(() =>
      MedicationScheduleSchema.parse({ times: ['08:00'], days: [8] }),
    ).toThrow();
  });
});

describe('CreateMedicationSchema', () => {
  it('parses a minimal medication (name only)', () => {
    const parsed = CreateMedicationSchema.parse({ name: 'Vitamin D' });
    expect(parsed.name).toBe('Vitamin D');
  });

  it('rejects empty name', () => {
    expect(() =>
      CreateMedicationSchema.parse({ name: '' }),
    ).toThrow();
  });
});

describe('LogDoseSchema / RefillSchema', () => {
  it('LogDoseSchema accepts only the medication id', () => {
    const parsed = LogDoseSchema.parse({ medication_id: validUuid });
    expect(parsed.medication_id).toBe(validUuid);
  });

  it('RefillSchema rejects negative supply', () => {
    expect(() =>
      RefillSchema.parse({ id: validUuid, supply_count: -1 }),
    ).toThrow();
  });
});
