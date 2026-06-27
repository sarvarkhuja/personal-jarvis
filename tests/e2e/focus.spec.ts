import { expect, test } from '@playwright/test';
import { readE2EEnv } from '../helpers/env';
import {
  adminClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/users';

const env = readE2EEnv();

test.describe('Focus — happy path', () => {
  test.skip(
    env === null,
    'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run.',
  );

  test('start a session linked to a timer habit; on completion, session row + habit log written', async ({
    page,
  }) => {
    if (!env) return;
    const user = await createTestUser(env, 'focus-happy');
    try {
      const admin = adminClient(env);

      // Every habit must belong to a goal (habits.goal_id is NOT NULL), so seed
      // a goal first and attach the timer habit to it.
      const { data: goal, error: goalErr } = await admin
        .from('goals')
        .insert({
          user_id: user.id,
          title: 'Read 12 books',
          status: 'active',
        })
        .select()
        .single();
      expect(goalErr).toBeNull();

      // Seed a timer habit linked to that goal.
      const { data: habit, error: habitErr } = await admin
        .from('habits')
        .insert({
          user_id: user.id,
          name: 'Read 30 min',
          kind: 'timer',
          frequency_json: { type: 'daily' },
          color: 'gray',
          goal_id: goal!.id,
        })
        .select()
        .single();
      expect(habitErr).toBeNull();

      // Sign in.
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'));

      // Override the timer to 1s for the session under test by injecting the
      // env value into window before any module loads.
      await page.addInitScript(() => {
        (window as unknown as { __TEST_FOCUS_SECONDS?: number }).__TEST_FOCUS_SECONDS = 1;
      });
      await page.goto('/focus');

      // Pick the timer habit from the dropdown.
      await page.getByTestId('focus-habit').selectOption(habit!.id);
      await page.getByTestId('focus-minutes').fill('1');
      await page.getByTestId('focus-start').click();

      // Wait for completion: timer auto-finalizes when remaining ≤ 0.
      await expect(page.getByTestId('focus-elapsed')).toHaveCount(0, {
        timeout: 5000,
      });

      // Verify a focus_sessions row was written and is completed.
      const { data: sessions } = await admin
        .from('focus_sessions')
        .select('id, completed, planned_minutes, linked_habit_id')
        .eq('user_id', user.id);
      expect(sessions ?? []).toHaveLength(1);
      expect(sessions![0].completed).toBe(true);
      expect(sessions![0].linked_habit_id).toBe(habit!.id);

      // And the linked habit got a habit_log.
      const { data: logs } = await admin
        .from('habit_logs')
        .select('id, habit_id, value, note')
        .eq('user_id', user.id)
        .eq('habit_id', habit!.id);
      expect(logs ?? []).toHaveLength(1);
    } finally {
      await adminClient(env).from('focus_sessions').delete().eq('user_id', user.id);
      await adminClient(env).from('habits').delete().eq('user_id', user.id);
      await adminClient(env).from('goals').delete().eq('user_id', user.id);
      await deleteTestUser(env, user.id).catch(() => {});
    }
  });
});
