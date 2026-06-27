import { expect, test } from '@playwright/test';
import { readE2EEnv } from '../helpers/env';
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  userClient,
} from '../helpers/users';

const env = readE2EEnv();

test.describe('RLS — habits', () => {
  test.skip(
    env === null,
    'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run RLS tests.',
  );

  test("user B cannot read or modify user A's habits", async () => {
    if (!env) return;
    const userA = await createTestUser(env, 'rls-a');
    const userB = await createTestUser(env, 'rls-b');
    try {
      // Seed a habit owned by user A using admin client (bypasses RLS).
      const admin = adminClient(env);
      const { data: habit, error: insertErr } = await admin
        .from('habits')
        .insert({
          user_id: userA.id,
          name: 'Private — user A',
          kind: 'check',
          frequency_json: { type: 'daily' },
          color: 'gray',
        })
        .select()
        .single();
      expect(insertErr).toBeNull();
      expect(habit).toBeTruthy();

      // Sign in as user B.
      const sb = userClient(env);
      const { error: signinErr } = await sb.auth.signInWithPassword({
        email: userB.email,
        password: userB.password,
      });
      expect(signinErr).toBeNull();

      // Selecting all habits as B should NOT include A's row.
      const { data: visible } = await sb
        .from('habits')
        .select('id, name')
        .eq('id', habit!.id);
      expect(visible ?? []).toHaveLength(0);

      // Updating A's habit by id should affect zero rows.
      const { data: updated } = await sb
        .from('habits')
        .update({ name: 'PWNED' })
        .eq('id', habit!.id)
        .select();
      expect(updated ?? []).toHaveLength(0);

      // Deleting A's habit should affect zero rows.
      const { data: deleted } = await sb
        .from('habits')
        .delete()
        .eq('id', habit!.id)
        .select();
      expect(deleted ?? []).toHaveLength(0);

      // The habit still exists when read with admin.
      const { data: stillThere } = await admin
        .from('habits')
        .select('id, name')
        .eq('id', habit!.id)
        .single();
      expect(stillThere?.name).toBe('Private — user A');
    } finally {
      await deleteTestUser(env, userA.id).catch(() => {});
      await deleteTestUser(env, userB.id).catch(() => {});
    }
  });

  test("user B cannot insert a habit_log against user A's habit", async () => {
    if (!env) return;
    const userA = await createTestUser(env, 'rls-a2');
    const userB = await createTestUser(env, 'rls-b2');
    try {
      const admin = adminClient(env);
      const { data: habit } = await admin
        .from('habits')
        .insert({
          user_id: userA.id,
          name: 'A only',
          kind: 'check',
          frequency_json: { type: 'daily' },
          color: 'gray',
        })
        .select()
        .single();

      const sb = userClient(env);
      await sb.auth.signInWithPassword({
        email: userB.email,
        password: userB.password,
      });

      const { error: insertErr } = await sb.from('habit_logs').insert({
        user_id: userA.id, // attempt to forge user A's id
        habit_id: habit!.id,
        log_date: new Date().toISOString().slice(0, 10),
        value: 1,
      });
      // RLS should block: WITH CHECK fails on auth.uid() != user_id.
      expect(insertErr).not.toBeNull();
    } finally {
      await deleteTestUser(env, userA.id).catch(() => {});
      await deleteTestUser(env, userB.id).catch(() => {});
    }
  });
});
