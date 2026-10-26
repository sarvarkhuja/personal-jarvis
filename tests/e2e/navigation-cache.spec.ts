import { expect, test, type Page } from '@playwright/test';
import { readE2EEnv } from '../helpers/env';
import { adminClient, createTestUser, deleteTestUser, type TestUser } from '../helpers/users';

const env = readE2EEnv();

async function signIn(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

test('cached navigation preserves owner isolation and immediate mutation freshness', async ({ page, browser }, testInfo) => {
  test.skip(!env, 'Supabase test credentials required.');
  if (!env) return;
  test.setTimeout(120_000);
  const owner = await createTestUser(env, 'navigation-owner');
  let other: TestUser | undefined;
  const timings: { destination: string; ms: number }[] = [];
  try {
    other = await createTestUser(env, 'navigation-other');
    const admin = adminClient(env);
    const ownerTitle = `Navigation owner ${Date.now()}`;
    const otherTitle = `Navigation other ${Date.now()}`;
    const { error } = await admin.from('goals').insert([
      { user_id: owner.id, title: ownerTitle, status: 'active' },
      { user_id: other.id, title: otherTitle, status: 'active' },
    ]);
    expect(error).toBeNull();
    await signIn(page, owner);
    await expect(page.getByRole('heading', { name: '[ Future self / built daily ]', exact: true })).toBeVisible();

    for (const destination of ['Goals', 'Settings', 'Goals']) {
      const start = Date.now();
      await page.getByRole('link', { name: destination, exact: true }).click();
      if (destination === 'Goals') {
        await expect(page.getByTestId(/^goal-title-/).filter({ hasText: ownerTitle })).toBeVisible();
        await expect(page.getByText(otherTitle, { exact: true })).toHaveCount(0);
      } else {
        await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
      }
      timings.push({ destination, ms: Date.now() - start });
    }

    const createdTitle = `Created after cached read ${Date.now()}`;
    await page.getByTestId('add-goal-trigger').click();
    await page.getByTestId('goal-title').fill(createdTitle);
    await page.getByTestId('goal-submit').click();
    await expect(page.getByTestId(/^goal-title-/).filter({ hasText: createdTitle })).toBeVisible();
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Goals', exact: true }).click();
    await expect(page.getByTestId(/^goal-title-/).filter({ hasText: createdTitle })).toBeVisible();

    const context = await browser.newContext();
    try {
      const stranger = await context.newPage();
      await signIn(stranger, other);
      await stranger.getByRole('link', { name: 'Goals', exact: true }).click();
      await expect(stranger.getByTestId(/^goal-title-/).filter({ hasText: otherTitle })).toBeVisible();
      await expect(stranger.getByText(ownerTitle, { exact: true })).toHaveCount(0);
      await expect(stranger.getByText(createdTitle, { exact: true })).toHaveCount(0);
    } finally {
      await context.close();
    }

    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('heading', { name: '[ Future self / built daily ]', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: '/private/tmp/jarvis-navigation-mobile.png', fullPage: true });
    await testInfo.attach('navigation-timings', { body: JSON.stringify(timings), contentType: 'application/json' });
    testInfo.annotations.push({ type: 'navigation-ms', description: JSON.stringify(timings) });

    // A valid signed JWT must not keep redirecting a deleted account home.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page.getByTestId('delete-account')).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept('delete my account'));
    await page.getByTestId('delete-account').click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    if (other) await deleteTestUser(env, other.id);
    await deleteTestUser(env, owner.id);
  }
});
