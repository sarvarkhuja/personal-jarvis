import { describe, expect, it } from 'vitest';
import { CreateRoadmapNoteSchema, ProgressInputSchema, UpdateRoadmapNoteSchema } from '@/lib/schemas/roadmap';

const base = { week: 3, kind: 'learning' as const, body: 'Channels block', topics: [] as string[] };

describe('CreateRoadmapNoteSchema', () => {
  it('normalizes, dedupes and drops empty topics', () => {
    const r = CreateRoadmapNoteSchema.parse({ ...base, topics: [' Go Concurrency', 'go-concurrency', '', 'Redis'] });
    expect(r.topics).toEqual(['go-concurrency', 'redis']);
  });

  it('caps topics at 8', () => {
    const topics = Array.from({ length: 9 }, (_, i) => `topic-${i}`);
    expect(CreateRoadmapNoteSchema.parse({ ...base, topics }).topics).toHaveLength(8);
  });

  it('rejects a whitespace-only body', () => {
    expect(CreateRoadmapNoteSchema.safeParse({ ...base, body: '   ' }).success).toBe(false);
  });

  it('defaults confidence to 2', () => {
    expect(CreateRoadmapNoteSchema.parse(base).confidence).toBe(2);
  });

  it('rejects week 29', () => {
    expect(CreateRoadmapNoteSchema.safeParse({ ...base, week: 29 }).success).toBe(false);
  });
});

describe('UpdateRoadmapNoteSchema', () => {
  it('does not inject a default confidence into a partial update', () => {
    const r = UpdateRoadmapNoteSchema.parse({ id: '22222222-2222-4222-8222-222222222222', body: 'x' });
    expect(r).not.toHaveProperty('confidence');
  });
  it('requires a uuid id and allows partial fields', () => {
    expect(UpdateRoadmapNoteSchema.safeParse({ id: '22222222-2222-4222-8222-222222222222', body: 'x' }).success).toBe(true);
    expect(UpdateRoadmapNoteSchema.safeParse({ body: 'x' }).success).toBe(false);
  });
});

describe('ProgressInputSchema', () => {
  it('accepts a key with a boolean', () => {
    expect(ProgressInputSchema.safeParse({ key: 'ex:w01-go', done: true }).success).toBe(true);
  });
  it('rejects a missing flag or an empty key', () => {
    expect(ProgressInputSchema.safeParse({ key: 'ex:w01-go' }).success).toBe(false);
    expect(ProgressInputSchema.safeParse({ key: '', done: true }).success).toBe(false);
  });
});
