import { describe, expect, it } from 'vitest';
import { ToggleMedicationSchema, CreateMedicationSchema } from '../medications';

describe('ToggleMedicationSchema', () => {
  it('accepts a uuid medication_id and YYYY-MM-DD date', () => {
    const r = ToggleMedicationSchema.parse({
      medication_id: '11111111-1111-4111-8111-111111111111',
      date: '2026-06-27',
    });
    expect(r.date).toBe('2026-06-27');
  });

  it('rejects a malformed date', () => {
    expect(() =>
      ToggleMedicationSchema.parse({
        medication_id: '11111111-1111-4111-8111-111111111111',
        date: '6/27/2026',
      }),
    ).toThrow();
  });

  it('rejects a non-uuid medication_id', () => {
    expect(() =>
      ToggleMedicationSchema.parse({ medication_id: 'nope', date: '2026-06-27' }),
    ).toThrow();
  });
});

describe('CreateMedicationSchema', () => {
  it('requires only a name and strips extra keys', () => {
    const r = CreateMedicationSchema.parse({ name: 'Vitamin D', dosage: '1000IU' } as never);
    expect(r).toEqual({ name: 'Vitamin D' });
  });
});
