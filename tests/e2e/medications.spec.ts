import { expect, test } from '@playwright/test';
import { readE2EEnv } from '../helpers/env';
import {
  adminClient,
  createTestUser,
  deleteTestUser,
} from '../helpers/users';

const env = readE2EEnv();

test.describe('Medications (pills) — happy path', () => {
  test.skip(
    env === null,
    'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run.',
  );

  test('add a pill, check off today on the grid, see it persist and show on /today', async ({
    page,
  }) => {
    if (!env) return;
    const user = await createTestUser(env, 'pills-happy');
    try {
      // Sign in via the app's login flow.
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'));

      // Create a pill — name only.
      await page.goto('/pills');
      await page.getByTestId('add-medication-trigger').click();
      await page.getByTestId('med-name').fill('Vitamin D');
      await page.getByTestId('medication-submit').click();

      // The new row appears; capture its id from the data-testid.
      const row = page.getByTestId(/medication-row-/);
      await expect(row.first()).toBeVisible();
      const medId = (await row.first().getAttribute('data-testid'))!.replace(
        'medication-row-',
        '',
      );

      // Today's column. A fresh user has no profile timezone, so the page
      // falls back to UTC — today is the UTC calendar date.
      const today = new Date().toISOString().slice(0, 10);
      const todayCell = page.getByTestId(`cell-${medId}-${today}`);
      await expect(todayCell).toHaveAttribute('aria-pressed', 'false');

      // Toggle today on; the cell flips to pressed after revalidation.
      await todayCell.click();
      await expect(todayCell).toHaveAttribute('aria-pressed', 'true');

      // Persists across a reload.
      await page.reload();
      await expect(page.getByTestId(`cell-${medId}-${today}`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      // Shows as done on /today.
      await page.goto('/today');
      await expect(page.getByTestId(`dose-${medId}`)).toContainText(/done/i);

      // Toggle off again from the grid.
      await page.goto('/pills');
      await page.getByTestId(`cell-${medId}-${today}`).click();
      await expect(page.getByTestId(`cell-${medId}-${today}`)).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    } finally {
      // Cleanup: deleting the medication cascades to its medication_logs.
      await adminClient(env).from('medications').delete().eq('user_id', user.id);
      await deleteTestUser(env, user.id).catch(() => {});
    }
  });
});
