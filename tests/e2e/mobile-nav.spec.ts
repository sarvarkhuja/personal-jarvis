import { expect, test } from "@playwright/test";
import { readE2EEnv } from "../helpers/env";
import { createTestUser, deleteTestUser } from "../helpers/users";

const env = readE2EEnv();

// A phone-sized viewport, below the 768px `md` breakpoint that the sidebar
// uses to switch from the persistent rail to the off-canvas drawer.
const MOBILE_VIEWPORT = { width: 375, height: 812 };

test.describe("Mobile navigation", () => {
	test.skip(
		env === null,
		"Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run.",
	);

	test("the sidebar can be opened from a trigger on mobile", async ({
		page,
	}) => {
		if (!env) return;
		const user = await createTestUser(env, "mobile-nav");
		try {
			await page.setViewportSize(MOBILE_VIEWPORT);

			await page.goto("/login");
			await page.getByLabel(/email/i).fill(user.email);
			await page.getByLabel(/password/i).fill(user.password);
			await page.getByRole("button", { name: /sign in|log in/i }).click();
			await page.waitForURL((u) => !u.pathname.startsWith("/login"));

			// On mobile the persistent sidebar is hidden; a trigger must exist to
			// open the off-canvas drawer. Without it, there is no navigation at all.
			const trigger = page.getByRole("button", { name: /toggle sidebar/i });
			await expect(trigger).toBeVisible();

			// The drawer starts closed — nav links are not yet reachable.
			await expect(page.getByRole("dialog")).toHaveCount(0);

			await trigger.click();

			// Tapping the trigger reveals the sidebar with its navigation links.
			const drawer = page.getByRole("dialog");
			await expect(drawer.getByRole("link", { name: "Habits" })).toBeVisible();
			await expect(drawer.getByRole("link", { name: "Today" })).toBeVisible();
		} finally {
			await deleteTestUser(env, user.id).catch(() => {});
		}
	});

	test("the sidebar closes after navigating to a route", async ({ page }) => {
		if (!env) return;
		const user = await createTestUser(env, "mobile-nav-close");
		try {
			await page.setViewportSize(MOBILE_VIEWPORT);

			await page.goto("/login");
			await page.getByLabel(/email/i).fill(user.email);
			await page.getByLabel(/password/i).fill(user.password);
			await page.getByRole("button", { name: /sign in|log in/i }).click();
			await page.waitForURL((u) => !u.pathname.startsWith("/login"));

			// Open the drawer and tap a nav link.
			await page.getByRole("button", { name: /toggle sidebar/i }).click();
			const drawer = page.getByRole("dialog");
			await drawer.getByRole("link", { name: "Habits" }).click();

			// Navigation happens and the drawer auto-closes behind it.
			await expect(page).toHaveURL(/\/habits$/);
			await expect(page.getByRole("dialog")).toHaveCount(0);
		} finally {
			await deleteTestUser(env, user.id).catch(() => {});
		}
	});
});
