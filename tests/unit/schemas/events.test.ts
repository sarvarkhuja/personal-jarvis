import { describe, expect, it } from 'vitest';
import {
  CreateEventSchema,
  DeleteEventSchema,
  UpdateEventSchema,
} from '@/lib/schemas/events';

const validUuid = '00000000-0000-4000-8000-000000000001';

describe('CreateEventSchema', () => {
  it('accepts a minimal event with only required fields', () => {
    const parsed = CreateEventSchema.parse({
      title: 'Dentist',
      starts_at: '2026-05-01T09:00:00.000Z',
    });
    expect(parsed.kind).toBe('event');
    expect(parsed.title).toBe('Dentist');
  });

  it('accepts kind=appointment / milestone', () => {
    expect(
      CreateEventSchema.parse({
        title: 'Dentist',
        starts_at: '2026-05-01T09:00:00.000Z',
        kind: 'appointment',
      }).kind,
    ).toBe('appointment');
  });

  it('rejects ends_at before starts_at', () => {
    expect(() =>
      CreateEventSchema.parse({
        title: 'Bad',
        starts_at: '2026-05-01T10:00:00.000Z',
        ends_at: '2026-05-01T09:59:00.000Z',
      }),
    ).toThrow();
  });

  it('accepts ends_at == starts_at (zero-length)', () => {
    expect(
      CreateEventSchema.parse({
        title: 'Tap',
        starts_at: '2026-05-01T10:00:00.000Z',
        ends_at: '2026-05-01T10:00:00.000Z',
      }).ends_at,
    ).toBe('2026-05-01T10:00:00.000Z');
  });

  it('rejects empty title', () => {
    expect(() =>
      CreateEventSchema.parse({
        title: '',
        starts_at: '2026-05-01T10:00:00.000Z',
      }),
    ).toThrow();
  });

  it('rejects non-ISO starts_at', () => {
    expect(() =>
      CreateEventSchema.parse({ title: 'X', starts_at: '2026-05-01 10:00' }),
    ).toThrow();
  });
});

describe('UpdateEventSchema / DeleteEventSchema', () => {
  it('UpdateEventSchema requires id and validates ends_at when both supplied', () => {
    expect(() =>
      UpdateEventSchema.parse({
        id: validUuid,
        starts_at: '2026-05-01T10:00:00.000Z',
        ends_at: '2026-05-01T09:00:00.000Z',
      }),
    ).toThrow();
  });

  it('DeleteEventSchema requires uuid', () => {
    expect(() => DeleteEventSchema.parse({ id: 'not-a-uuid' })).toThrow();
  });
});
