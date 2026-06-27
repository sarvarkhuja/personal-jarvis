import { expect, test } from '@playwright/test';
import { readE2EEnv } from '../helpers/env';
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  userClient,
} from '../helpers/users';

const env = readE2EEnv();

test.describe('RLS — events', () => {
  test.skip(
    env === null,
    'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run RLS tests.',
  );

  test("user B cannot read or modify user A's events", async () => {
    if (!env) return;
    const userA = await createTestUser(env, 'rls-events-a');
    const userB = await createTestUser(env, 'rls-events-b');
    try {
      const admin = adminClient(env);
      const { data: ev, error: insErr } = await admin
        .from('events')
        .insert({
          user_id: userA.id,
          title: 'Private — A',
          starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      expect(insErr).toBeNull();

      const sb = userClient(env);
      await sb.auth.signInWithPassword({
        email: userB.email,
        password: userB.password,
      });

      const { data: visible } = await sb
        .from('events')
        .select('id')
        .eq('id', ev!.id);
      expect(visible ?? []).toHaveLength(0);

      const { data: updated } = await sb
        .from('events')
        .update({ title: 'PWNED' })
        .eq('id', ev!.id)
        .select();
      expect(updated ?? []).toHaveLength(0);

      const { data: deleted } = await sb
        .from('events')
        .delete()
        .eq('id', ev!.id)
        .select();
      expect(deleted ?? []).toHaveLength(0);

      const { data: stillThere } = await admin
        .from('events')
        .select('title')
        .eq('id', ev!.id)
        .single();
      expect(stillThere?.title).toBe('Private — A');
    } finally {
      await deleteTestUser(env, userA.id).catch(() => {});
      await deleteTestUser(env, userB.id).catch(() => {});
    }
  });
});
