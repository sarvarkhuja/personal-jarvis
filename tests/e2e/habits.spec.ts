import { expect, test } from "@playwright/test";
import { readE2EEnv } from "../helpers/env";
import { adminClient, createTestUser, deleteTestUser } from "../helpers/users";

const env = readE2EEnv();

test.describe("Habits — happy path", () => {
	test.skip(
		env === null,
		"Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run.",
	);

	test("create a daily checkbox habit, log it, see streak=1 and on /today", async ({
		page,
	}) => {
		if (!env) return;
		const user = await createTestUser(env, "habits-happy");
		try {
			// Sign in via the app's login flow — the app uses email+password via
			// existing /login route in the (auth) group.
			await page.goto("/login");
			await page.getByLabel(/email/i).fill(user.email);
			await page.getByLabel(/password/i).fill(user.password);
			await page.getByRole("button", { name: /sign in|log in/i }).click();
			await page.waitForURL((u) => !u.pathname.startsWith("/login"));

			// Go to /habits and create a habit.
			await page.goto("/habits");
			await page.getByTestId("add-habit-trigger").click();
			await page.getByTestId("habit-name").fill("Drink water");
			await page.getByTestId("habit-kind").selectOption("check");
			// Frequency defaults to all seven days selected (= daily), so no
			// interaction is needed for a daily habit.
			await page.getByTestId("habit-submit").click();

			// The new habit row should appear with streak 0.
			const row = page.getByTestId(/habit-row-/);
			await expect(row.first()).toBeVisible();
			const habitId = (await row.first().getAttribute("data-testid"))!.replace(
				"habit-row-",
				"",
			);

			// Log it from /today.
			await page.goto("/today");
			await page.getByTestId(`log-${habitId}`).click();
			await expect(page.getByTestId(`due-${habitId}`)).toContainText(/done/i);

			// Back on /habits, streak should be 1.
			await page.goto("/habits");
			await expect(page.getByTestId(`streak-${habitId}`)).toContainText("1");
		} finally {
			// Cleanup: cascade FKs delete habit + habit_logs.
			await adminClient(env).from("habits").delete().eq("user_id", user.id);
			await deleteTestUser(env, user.id).catch(() => {});
		}
	});
});
