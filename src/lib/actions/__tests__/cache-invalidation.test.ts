// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addExpense, deleteExpense } from '@/actions/expenses';
import { deleteAccount, setTheme } from '../account';
import { deleteGoal, setGoalStatus } from '../goals';
import { createHabit, deleteHabit, logHabit } from '../habits';
import { deleteMedication, toggleMedicationCompletion } from '../medications';
import { startFocusSession, endFocusSession } from '../focus';
import { unlogSalah, updateSalahSettings } from '../salah';
import { TASHKENT_DEFAULT } from '@/lib/domain/salah';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  requireUserId: vi.fn(),
  tryGetUserId: vi.fn(),
  invalidateUserData: vi.fn(),
  invalidateAllUserData: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock('@/lib/supabase/action', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { deleteUser: mocks.deleteUser } } }),
}));
vi.mock('@/lib/auth/server-user', () => ({
  requireUserId: mocks.requireUserId,
  tryGetUserId: mocks.tryGetUserId,
}));
vi.mock('@/lib/data/invalidate', () => ({
  invalidateUserData: mocks.invalidateUserData,
  invalidateAllUserData: mocks.invalidateAllUserData,
}));

type Result = { data: unknown; error: { message: string } | null };
const ok = (data: unknown = null): Result => ({ data, error: null });
const failure = (): Result => ({ data: null, error: { message: 'Database rejected mutation' } });

function query(result: Result | Promise<Result>) {
  const promise = Promise.resolve(result);
  const chain = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), upsert: vi.fn(),
    delete: vi.fn(), eq: vi.fn(), limit: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(),
    then: promise.then.bind(promise),
  };
  for (const method of [chain.select, chain.insert, chain.update, chain.upsert, chain.delete, chain.eq, chain.limit, chain.single, chain.maybeSingle]) {
    method.mockReturnValue(chain);
  }
  return chain;
}

const userId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const habitId = '33333333-3333-4333-8333-333333333333';
const queues = new Map<string, ReturnType<typeof query>[]>();

function enqueue(table: string, ...results: Array<Result | Promise<Result>>) {
  const queries = results.map(query);
  queues.set(table, [...(queues.get(table) ?? []), ...queries]);
  return queries;
}

describe('mutation cache freshness', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queues.clear();
    mocks.requireUserId.mockResolvedValue(userId);
    mocks.tryGetUserId.mockResolvedValue(userId);
    mocks.createClient.mockResolvedValue({ from: mocks.from, rpc: mocks.rpc, auth: { getUser: mocks.getUser, signOut: mocks.signOut } });
    mocks.from.mockImplementation((table: string) => {
      const next = queues.get(table)?.shift();
      if (!next) throw new Error(`Unexpected query of ${table}`);
      return next;
    });
    mocks.rpc.mockResolvedValue(ok());
    mocks.deleteUser.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('uses verified identity and expires only expense data after a successful insert', async () => {
    const [write] = enqueue('expenses', ok());
    const form = new FormData();
    form.set('amount', '12 000');
    form.set('category', 'food');
    form.set('date', '2026-10-26');

    await addExpense(form);

    expect(write.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, amount: 12000 }));
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'expenses');
  });

  it('keeps existing unauthenticated behavior without creating a database client', async () => {
    mocks.tryGetUserId.mockResolvedValue(null);

    await expect(deleteExpense(itemId)).resolves.toEqual({ error: 'Not authenticated' });
    await expect(logHabit({ habit_id: habitId, value: 1 })).rejects.toThrow('UNAUTHENTICATED');
    await expect(unlogSalah({ prayer: 'fajr', log_date: '2026-10-26' })).rejects.toThrow('UNAUTHENTICATED');

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.invalidateUserData).not.toHaveBeenCalled();
  });

  it('does not expire caches when an expense mutation fails', async () => {
    enqueue('expenses', failure());

    await expect(deleteExpense(itemId)).resolves.toEqual({ error: 'Database rejected mutation' });

    expect(mocks.invalidateUserData).not.toHaveBeenCalled();
  });

  it('retains the RLS-scoped parent-goal check before creating a habit', async () => {
    enqueue('goals', ok());

    await expect(createHabit({ name: 'Read', goal_id: itemId, kind: 'check', frequency: { type: 'daily' }, color: 'gray' })).rejects.toThrow('GOAL_NOT_FOUND');

    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('goals');
    expect(mocks.invalidateUserData).not.toHaveBeenCalled();
  });

  it('expires dependent datasets when deleting a goal with cascading habits', async () => {
    const [write] = enqueue('goals', ok());

    await deleteGoal({ id: itemId });

    expect(write.eq).toHaveBeenCalledWith('user_id', userId);
    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'goals', 'habits', 'habit_logs', 'events', 'focus_sessions');
  });

  it('expires linked goal/session data and cascaded logs when deleting a habit', async () => {
    enqueue('habits', ok());

    await deleteHabit({ id: habitId });

    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'habits', 'habit_logs', 'goals', 'focus_sessions');
  });

  it('keeps medication-list caches reusable when only a completion changes', async () => {
    await toggleMedicationCompletion({ medication_id: itemId, date: '2026-10-26' });

    expect(mocks.rpc).toHaveBeenCalledWith('toggle_medication_completion', { p_user_id: userId, p_medication_id: itemId, p_date: '2026-10-26' });
    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'medication_logs');
  });

  it('expires medication logs together with a deleted medication', async () => {
    enqueue('medications', ok());

    await deleteMedication({ id: itemId });

    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'medications', 'medication_logs');
  });

  it('does not expire caches when a goal update fails', async () => {
    enqueue('goals', failure());

    await expect(setGoalStatus({ id: itemId, status: 'done' })).rejects.toThrow('Database rejected mutation');

    expect(mocks.invalidateUserData).not.toHaveBeenCalled();
  });

  it('loads independent habit metadata concurrently and uses the user-local log date', async () => {
    let resolveProfile!: (result: Result) => void;
    const profile = new Promise<Result>((resolve) => { resolveProfile = resolve; });
    enqueue('profiles', profile);
    enqueue('habits', ok({ kind: 'counter' }));
    const [write] = enqueue('habit_logs', ok({ id: itemId }));

    const pending = logHabit({ habit_id: habitId, value: 2, logged_at: '2026-10-25T20:00:00Z' });
    await vi.waitFor(() => expect(mocks.from).toHaveBeenCalledWith('habits'));
    expect(write.insert).not.toHaveBeenCalled();
    resolveProfile(ok({ timezone: 'Asia/Tashkent' }));
    await pending;

    expect(write.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, habit_id: habitId, log_date: '2026-10-26', value: 2 }));
    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'habit_logs');
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('preserves check-habit duplicate prevention without writing another log', async () => {
    enqueue('profiles', ok({ timezone: 'UTC' }));
    enqueue('habits', ok({ kind: 'check' }));
    const [read] = enqueue('habit_logs', ok({ id: itemId }));

    await expect(logHabit({ habit_id: habitId, value: 1 })).resolves.toEqual({ id: itemId });

    expect(read.insert).not.toHaveBeenCalled();
    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'habit_logs');
  });

  it('does not invalidate after a rejected habit-log insert', async () => {
    enqueue('profiles', ok({ timezone: 'UTC' }));
    enqueue('habits', ok({ kind: 'timer' }));
    enqueue('habit_logs', failure());

    await expect(logHabit({ habit_id: habitId, value: 60 })).rejects.toMatchObject({ message: 'Database rejected mutation' });

    expect(mocks.invalidateUserData).not.toHaveBeenCalled();
  });

  it('expires the committed focus session even if the follow-up habit log fails', async () => {
    enqueue('focus_sessions', ok({ id: itemId, planned_minutes: 25, linked_habit_id: habitId, ended_at: null }), ok());
    enqueue('habits', ok({ kind: 'timer' }));
    enqueue('profiles', ok({ timezone: 'Asia/Tashkent' }));
    const [write] = enqueue('habit_logs', failure());

    await expect(endFocusSession({ id: itemId, completed: true })).rejects.toThrow('endFocusSession habit log failed');

    expect(write.insert).toHaveBeenCalledWith(expect.objectContaining({ habit_id: habitId, value: 1500 }));
    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'focus_sessions', 'habit_logs');
  });

  it('does not invalidate or log a habit when the focus-session update fails', async () => {
    enqueue('focus_sessions', ok({ id: itemId, planned_minutes: 25, linked_habit_id: habitId, ended_at: null }), failure());

    await expect(endFocusSession({ id: itemId, completed: true })).rejects.toThrow('Database rejected mutation');

    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['focus_sessions', 'focus_sessions']);
    expect(mocks.invalidateUserData).not.toHaveBeenCalled();
  });

  it('loads focus habit kind and timezone concurrently before logging the completed duration', async () => {
    let resolveHabit!: (result: Result) => void;
    enqueue('focus_sessions', ok({ id: itemId, planned_minutes: 25, linked_habit_id: habitId, ended_at: null }), ok());
    enqueue('habits', new Promise<Result>((resolve) => { resolveHabit = resolve; }));
    enqueue('profiles', ok({ timezone: 'Asia/Tashkent' }));
    const [write] = enqueue('habit_logs', ok());

    const pending = endFocusSession({ id: itemId, completed: true });
    await vi.waitFor(() => expect(mocks.from).toHaveBeenCalledWith('profiles'));
    expect(write.insert).not.toHaveBeenCalled();
    resolveHabit(ok({ kind: 'timer' }));
    await expect(pending).resolves.toMatchObject({ id: itemId, completed: true });

    expect(write.insert).toHaveBeenCalledWith(expect.objectContaining({ habit_id: habitId, value: 1500 }));
  });

  it('leaves an already-ended focus session unchanged', async () => {
    const ended = { id: itemId, planned_minutes: 25, linked_habit_id: habitId, ended_at: '2026-10-26T12:00:00Z' };
    const [read] = enqueue('focus_sessions', ok(ended));

    await expect(endFocusSession({ id: itemId, completed: true })).resolves.toEqual(ended);

    expect(read.update).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledOnce();
    expect(mocks.invalidateUserData).not.toHaveBeenCalled();
  });

  it('expires only sessions when starting focus', async () => {
    enqueue('focus_sessions', ok({ id: itemId }));

    await startFocusSession({ planned_minutes: 25 });

    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'focus_sessions');
  });

  it('expires profile data after a successful theme change', async () => {
    enqueue('profiles', ok());

    await setTheme({ theme: 'dark' });

    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'profiles');
  });

  it('expires only Salah settings when calculation preferences change', async () => {
    enqueue('salah_settings', ok());
    const cfg = TASHKENT_DEFAULT;

    await updateSalahSettings({
      city: 'Tashkent', latitude: cfg.latitude, longitude: cfg.longitude,
      timezone: cfg.timezone, fajr_angle: cfg.fajrAngle, isha_angle: cfg.ishaAngle,
      isha_interval: cfg.ishaInterval, madhab: cfg.madhab,
      offset_fajr: cfg.offsets.fajr, offset_dhuhr: cfg.offsets.dhuhr,
      offset_asr: cfg.offsets.asr, offset_maghrib: cfg.offsets.maghrib,
      offset_isha: cfg.offsets.isha, late_after_fraction: cfg.lateAfterFraction,
    });

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.invalidateUserData).toHaveBeenCalledExactlyOnceWith(userId, 'salah_settings');
  });

  it('waits for local session-cookie cleanup before expiring a deleted account cache', async () => {
    let resolveSignOut!: (result: { error: null }) => void;
    mocks.signOut.mockReturnValue(new Promise<{ error: null }>((resolve) => { resolveSignOut = resolve; }));

    const pending = deleteAccount();
    await vi.waitFor(() => expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' }));

    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith(userId);
    expect(mocks.invalidateAllUserData).not.toHaveBeenCalled();
    resolveSignOut({ error: null });
    await pending;

    expect(mocks.invalidateAllUserData).toHaveBeenCalledExactlyOnceWith(userId);
  });

  it('does not sign out or expire caches when account deletion fails', async () => {
    mocks.deleteUser.mockResolvedValue({ error: { message: 'Deletion rejected' } });

    await expect(deleteAccount()).rejects.toThrow('Deletion rejected');

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.invalidateAllUserData).not.toHaveBeenCalled();
  });

  it('expires committed account deletion even if local session cleanup fails', async () => {
    mocks.signOut.mockResolvedValue({ error: { message: 'Session cleanup rejected' } });

    await expect(deleteAccount()).rejects.toThrow('deleteAccount session cleanup failed');

    expect(mocks.invalidateAllUserData).toHaveBeenCalledExactlyOnceWith(userId);
  });
});
