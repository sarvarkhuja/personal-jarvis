import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateTag } from 'next/cache';
import { invalidateAllUserData, invalidateUserData } from './invalidate';

vi.mock('next/cache', () => ({ updateTag: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

describe('user dataset invalidation', () => {
  it('expires only affected owner datasets and deduplicates tags', () => {
    invalidateUserData('owner-a', 'habit_logs', 'habit_logs', 'focus_sessions');
    expect(vi.mocked(updateTag).mock.calls).toEqual([
      ['jarvis:user:owner-a:habit_logs'], ['jarvis:user:owner-a:focus_sessions'],
    ]);
  });

  it('expires every dataset for a deleted account', () => {
    invalidateAllUserData('owner-a');
    expect(updateTag).toHaveBeenCalledExactlyOnceWith('jarvis:user:owner-a');
  });
});
