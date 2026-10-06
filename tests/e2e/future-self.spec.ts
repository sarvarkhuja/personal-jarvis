import { expect, test } from '@playwright/test';
import { readE2EEnv } from '../helpers/env';
import { createTestUser, deleteTestUser, userClient, type TestUser } from '../helpers/users';

const env = readE2EEnv();

test('future self: protocol, CRUD, owner isolation, responsive themes, and focus handoff', async ({ page }) => {
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
    for (const month of [7, 15, 2]) {
      await page.getByRole('button', { name: new RegExp(`^${month} months:`) }).click();
      await expect(page.getByText(`Days to my ${month}-month self`)).toBeVisible();
    }

    await page.getByRole('button', { name: /Load strict protocol/ }).click();
    await expect(page.getByText('I wake at the same time every day, weekends included.')).toBeVisible();
    await page.getByRole('button', { name: 'Add to Salah' }).click();
    await page.getByLabel('New Salah statement').fill('I read the tafsir of one ayah after Fajr.');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('I read the tafsir of one ayah after Fajr.')).toBeVisible();
    await page.getByRole('button', { name: 'Edit: I read the tafsir of one ayah after Fajr.' }).click();
    await page.getByLabel('Edit statement').fill('I read the tafsir of two ayat after Fajr.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('I read the tafsir of two ayat after Fajr.')).toBeVisible();
    await page.getByRole('button', { name: 'Delete: I read the tafsir of two ayat after Fajr.' }).click();
    await page.getByRole('group', { name: 'Confirm delete' }).getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText('I read the tafsir of two ayat after Fajr.')).toHaveCount(0);

    const owner = userClient(env);
    await owner.auth.signInWithPassword({ email: user.email, password: user.password });
    const { data: rows, error } = await owner.from('self_image_items').select('id').eq('user_id', user.id).eq('months', 2);
    expect(error).toBeNull();
    expect(rows!.length).toBeGreaterThan(0);
    const stranger = userClient(env);
    await stranger.auth.signInWithPassword({ email: other.email, password: other.password });
    const hidden = await stranger.from('self_image_items').select('id').eq('id', rows![0].id);
    expect(hidden.error).toBeNull();
    expect(hidden.data).toEqual([]);
    const blocked = await stranger.from('self_image_items').update({ body: 'Unauthorized' }).eq('id', rows![0].id).select();
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
  } finally {
    await deleteTestUser(env, user.id);
    if (other) await deleteTestUser(env, other.id);
  }
});
