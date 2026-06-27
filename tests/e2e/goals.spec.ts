import { expect, test } from '@playwright/test';
import { readE2EEnv } from '../helpers/env';
import {
  adminClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/users';

const env = readE2EEnv();

test.describe('Goals — listing', () => {
  test.skip(
    env === null,
    'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run.',
  );

  test('a seeded goal shows up on /goals', async ({ page }) => {
    if (!env) return;
    const user = await createTestUser(env, 'goals-happy');
    try {
      const admin = adminClient(env);
      const { data: habit, error: habitErr } = await admin
        .from('habits')
        .insert({
          user_id: user.id,
          name: 'Read 30 min',
          kind: 'timer',
          frequency_json: { type: 'daily' },
          color: 'gray',
        })
        .select()
        .single();
      expect(habitErr).toBeNull();

      const { data: goal, error: goalErr } = await admin
        .from('goals')
        .insert({
          user_id: user.id,
          title: 'Read 12 books',
          linked_habit_id: habit!.id,
          status: 'active',
        })
        .select()
        .single();
      expect(goalErr).toBeNull();

      await page.goto('/login');
      await page.getByLabel(/email/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'));

      await page.goto('/goals');
      await expect(
        page.getByTestId(`goal-title-${goal!.id}`),
      ).toContainText('Read 12 books');
    } finally {
      await adminClient(env).from('goals').delete().eq('user_id', user.id);
      await adminClient(env).from('habits').delete().eq('user_id', user.id);
      await deleteTestUser(env, user.id).catch(() => {});
    }
  });
});
