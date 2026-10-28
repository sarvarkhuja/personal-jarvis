import { describe, expect, it } from 'vitest';
import {
  filterNotes,
  groupNotes,
  parseLibraryParams,
  sortNotes,
  type LibraryParams,
  type RoadmapNote,
} from '../roadmap-library';

function note(over: Partial<RoadmapNote>): RoadmapNote {
  return {
    id: 'n',
    week: 1,
    track: null,
    kind: 'learning',
    confidence: 2,
    body: 'body',
    topics: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

const base: LibraryParams = { group: 'topic', sort: 'weakest' };

describe('parseLibraryParams', () => {
  it('defaults', () => {
    expect(parseLibraryParams({})).toEqual({ group: 'topic', sort: 'weakest' });
  });
  it('drops invalid kind and conf', () => {
    expect(parseLibraryParams({ kind: 'zzz', conf: '9' })).toEqual({ group: 'topic', sort: 'weakest' });
  });
  it('keeps valid values and takes first of arrays', () => {
    expect(parseLibraryParams({ kind: ['gotcha', 'story'], conf: '1', topic: 'redis', group: 'kind', sort: 'newest' })).toEqual({
      kind: 'gotcha',
      conf: 1,
      topic: 'redis',
      group: 'kind',
      sort: 'newest',
    });
  });
  it('trims q and drops empty q', () => {
    expect(parseLibraryParams({ q: '  hi ' }).q).toBe('hi');
    expect(parseLibraryParams({ q: '   ' }).q).toBeUndefined();
  });
});

describe('filterNotes', () => {
  const a = note({ id: 'a', body: 'Use REDIS here' });
  const b = note({ id: 'b', topics: ['redis'] });
  const c = note({ id: 'c', kind: 'story', confidence: 1, topics: ['go'] });
  it('q matches body and topics case-insensitively', () => {
    expect(filterNotes([a, b, c], { ...base, q: 'redis' }).map((n) => n.id)).toEqual(['a', 'b']);
  });
  it('filters by topic, kind, conf', () => {
    expect(filterNotes([a, b, c], { ...base, topic: 'go' }).map((n) => n.id)).toEqual(['c']);
    expect(filterNotes([a, b, c], { ...base, kind: 'story' }).map((n) => n.id)).toEqual(['c']);
    expect(filterNotes([a, b, c], { ...base, conf: 1 }).map((n) => n.id)).toEqual(['c']);
  });
});

describe('sortNotes', () => {
  const a = note({ id: 'a', confidence: 3, created_at: '2026-01-01T00:00:00Z' });
  const b = note({ id: 'b', confidence: 1, created_at: '2026-01-03T00:00:00Z' });
  const c = note({ id: 'c', confidence: 1, created_at: '2026-01-02T00:00:00Z' });
  it('weakest: confidence asc then oldest first', () => {
    expect(sortNotes([a, b, c], 'weakest').map((n) => n.id)).toEqual(['c', 'b', 'a']);
  });
  it('newest and oldest', () => {
    expect(sortNotes([a, b, c], 'newest').map((n) => n.id)).toEqual(['b', 'c', 'a']);
    expect(sortNotes([a, b, c], 'oldest').map((n) => n.id)).toEqual(['a', 'c', 'b']);
  });
  it('does not mutate input', () => {
    const input = [a, b, c];
    sortNotes(input, 'weakest');
    expect(input.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('groupNotes', () => {
  const a = note({ id: 'a', topics: ['redis', 'go'] });
  const b = note({ id: 'b', topics: ['go'] });
  const c = note({ id: 'c' });
  it('topic: multi-topic note in both, no-topic bucket, size desc', () => {
    const g = groupNotes([a, b, c], 'topic');
    expect(g.map((x) => [x.key, x.label, x.notes.length])).toEqual([
      ['go', 'GO', 2],
      ['redis', 'REDIS', 1],
      ['—', 'NO TOPIC', 1],
    ]);
  });
  it('kind uses kind labels', () => {
    const g = groupNotes([note({ kind: 'gotcha' })], 'kind');
    expect(g[0].key).toBe('gotcha');
    expect(g[0].label).toBe('GOTCHA');
  });
  it('confidence', () => {
    const g = groupNotes([note({ confidence: 1 })], 'confidence');
    expect(g[0]).toMatchObject({ key: '1', label: 'CONFIDENCE 1' });
  });
  it('none', () => {
    const g = groupNotes([a, b], 'none');
    expect(g).toHaveLength(1);
    expect(g[0].key).toBe('all');
  });
});
