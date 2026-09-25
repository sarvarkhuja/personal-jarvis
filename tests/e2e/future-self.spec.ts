import { expect, test } from '@playwright/test';
import { readE2EEnv } from '../helpers/env';
import { createTestUser, deleteTestUser, userClient, type TestUser } from '../helpers/users';

const env = readE2EEnv();

test('future self: save, reload, owner isolation, responsive themes, and focus handoff', async ({ page }) => {
  test.skip(!env, 'Supabase test credentials required.');
  if (!env) return;
  test.setTimeout(120_000);
  const user = await createTestUser(env, 'future-self');
  let other: TestUser | undefined;
  try {
    other = await createTestUser(env, 'future-self-other');
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Your future. Built today./ })).toBeVisible();
    for (const month of [2, 7, 15]) {
      await page.getByRole('button', { name: new RegExp(`^${month} months:`) }).click();
      await expect(page.getByText(`Self-image / ${month} months from now`)).toBeVisible();
    }
    await page.getByRole('button', { name: 'Make it mine' }).click();
    await page.getByLabel('Identity statement').fill('I choose meaningful work every day.');
    await page.getByRole('button', { name: 'Save my vision' }).click();
    await expect(page.getByRole('status')).toContainText('Saved.');
    await page.reload();
    await expect(page.getByRole('button', { name: '15 months: I choose meaningful work every day.' })).toBeVisible();

    const owner = userClient(env);
    await owner.auth.signInWithPassword({ email: user.email, password: user.password });
    const { data: rows, error } = await owner.from('self_images').select('id, title').eq('user_id', user.id);
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    const stranger = userClient(env);
    await stranger.auth.signInWithPassword({ email: other.email, password: other.password });
    const hidden = await stranger.from('self_images').select('id').eq('id', rows![0].id);
    expect(hidden.error).toBeNull();
    expect(hidden.data).toEqual([]);
    const blocked = await stranger.from('self_images').update({ title: 'Unauthorized' }).eq('id', rows![0].id).select();
    expect(blocked.data).toEqual([]);

    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.screenshot({ path: '/tmp/future-self-desktop.png', fullPage: true });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((mode) => window.localStorage.setItem('theme', mode), theme);
      await page.reload();
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/future-self-mobile-${theme}.png`, fullPage: true });
    }

    await page.getByRole('link', { name: /Restart with 5 minutes/ }).click();
    await expect(page.getByTestId('focus-minutes')).toHaveValue('5');
    await expect(page.getByTestId('focus-intent')).toHaveValue('Open my plan and finish one small, useful task');
    await page.goto('/');
    await page.getByRole('link', { name: /Set up 25 min of focus/ }).click();
    await expect(page.getByTestId('focus-minutes')).toHaveValue('25');
  } finally {
    await deleteTestUser(env, user.id);
    if (other) await deleteTestUser(env, other.id);
  }
});
