// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoadmapNote, deleteRoadmapNote, setProgress, updateRoadmapNote } from '../roadmap';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  requireUserId: vi.fn(),
  invalidateUserData: vi.fn(),
}));

vi.mock('@/lib/supabase/action', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/auth/server-user', () => ({ requireUserId: mocks.requireUserId }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/data/invalidate', () => ({ invalidateUserData: mocks.invalidateUserData }));

type Result = { data: unknown; error: { message: string } | null };
const ok = (data: unknown = null): Result => ({ data, error: null });

function query(result: Result) {
  const promise = Promise.resolve(result);
  const chain = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), upsert: vi.fn(),
    delete: vi.fn(), eq: vi.fn(), single: vi.fn(),
    then: promise.then.bind(promise),
  };
  for (const m of [chain.select, chain.insert, chain.update, chain.upsert, chain.delete, chain.eq, chain.single]) {
    m.mockReturnValue(chain);
  }
  return chain;
}

const userId = '11111111-1111-4111-8111-111111111111';
const noteId = '22222222-2222-4222-8222-222222222222';

describe('roadmap actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireUserId.mockResolvedValue(userId);
    mocks.createClient.mockResolvedValue({ from: mocks.from });
  });

  it('setProgress upserts a known key and invalidates', async () => {
    const q = query(ok());
    mocks.from.mockReturnValue(q);
    expect(await setProgress('ex:w01-go', true)).toEqual({ success: true });
    expect(mocks.from).toHaveBeenCalledWith('roadmap_progress');
    expect(q.upsert).toHaveBeenCalledWith(
      { user_id: userId, key: 'ex:w01-go' },
      { onConflict: 'user_id,key', ignoreDuplicates: true },
    );
    expect(mocks.invalidateUserData).toHaveBeenCalledWith(userId, 'roadmap_progress');
  });

  it('setProgress with done=false deletes scoped to the user', async () => {
    const q = query(ok());
    mocks.from.mockReturnValue(q);
    expect(await setProgress('build:3', false)).toEqual({ success: true });
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith('user_id', userId);
    expect(q.eq).toHaveBeenCalledWith('key', 'build:3');
    expect(mocks.invalidateUserData).toHaveBeenCalledWith(userId, 'roadmap_progress');
  });

  it('setProgress rejects keys outside the curriculum without touching the DB', async () => {
    expect('error' in (await setProgress('ex:nope', true))).toBe(true);
    expect('error' in (await setProgress('build:29', true))).toBe(true);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('createRoadmapNote with an invalid body returns an error and never touches the DB', async () => {
    const r = await createRoadmapNote({ week: 3, kind: 'learning', confidence: 2, body: '   ', topics: [] });
    expect('error' in r).toBe(true);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('createRoadmapNote returns the new id and invalidates', async () => {
    const q = query(ok({ id: noteId }));
    mocks.from.mockReturnValue(q);
    const r = await createRoadmapNote({ week: 3, kind: 'learning', confidence: 2, body: 'Channels block', topics: ['Go'] });
    expect(r).toEqual({ success: true, id: noteId });
    expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, topics: ['go'] }));
    expect(mocks.invalidateUserData).toHaveBeenCalledWith(userId, 'roadmap_notes');
  });

  it('updateRoadmapNote sets updated_at and scopes to the user', async () => {
    const q = query(ok({ id: noteId }));
    mocks.from.mockReturnValue(q);
    expect(await updateRoadmapNote({ id: noteId, body: 'new' })).toEqual({ success: true });
    const patch = q.update.mock.calls[0][0];
    expect(patch.body).toBe('new');
    expect(typeof patch.updated_at).toBe('string');
    expect(patch).not.toHaveProperty('id');
    expect(q.eq).toHaveBeenCalledWith('id', noteId);
    expect(q.eq).toHaveBeenCalledWith('user_id', userId);
    expect(mocks.invalidateUserData).toHaveBeenCalledWith(userId, 'roadmap_notes');
  });

  it('deleteRoadmapNote scopes to the user', async () => {
    const q = query(ok({ id: noteId }));
    mocks.from.mockReturnValue(q);
    expect(await deleteRoadmapNote(noteId)).toEqual({ success: true });
    expect(q.eq).toHaveBeenCalledWith('user_id', userId);
    expect(mocks.invalidateUserData).toHaveBeenCalledWith(userId, 'roadmap_notes');
  });
});
