import { expect, test } from "@playwright/test";
import { readE2EEnv } from "../helpers/env";
import { adminClient, createTestUser, deleteTestUser } from "../helpers/users";

const env = readE2EEnv();

test.describe("Events — happy path", () => {
	test.skip(
		env === null,
		"Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run.",
	);

	test('an event for tomorrow appears in the today widget under "Tomorrow"', async ({
		page,
	}) => {
		if (!env) return;
		const user = await createTestUser(env, "events-happy");
		try {
			const admin = adminClient(env);

			// Set the test user's timezone to UTC so date math is predictable.
			await admin
				.from("profiles")
				.update({ timezone: "UTC" })
				.eq("id", user.id);

			// Tomorrow at 10:00 UTC.
			const todayUtc = new Date();
			const tomorrow = new Date(
				Date.UTC(
					todayUtc.getUTCFullYear(),
					todayUtc.getUTCMonth(),
					todayUtc.getUTCDate() + 1,
					10,
					0,
					0,
				),
			);
			const { data: ev, error: insErr } = await admin
				.from("events")
				.insert({
					user_id: user.id,
					title: "Lunch with Sam",
					starts_at: tomorrow.toISOString(),
				})
				.select()
				.single();
			expect(insErr).toBeNull();

			// Sign in.
			await page.goto("/login");
			await page.getByLabel(/email/i).fill(user.email);
			await page.getByLabel(/password/i).fill(user.password);
			await page.getByRole("button", { name: /sign in|log in/i }).click();
			await page.waitForURL((u) => !u.pathname.startsWith("/login"));

			// Today page: tomorrow section should contain the event.
			await page.goto("/today");
			const tomorrowSection = page.getByTestId("tomorrow-events");
			await expect(tomorrowSection).toBeVisible();
			await expect(
				tomorrowSection.getByTestId(`upcoming-${ev!.id}`),
			).toContainText("Lunch with Sam");
		} finally {
			await adminClient(env).from("events").delete().eq("user_id", user.id);
			await deleteTestUser(env, user.id).catch(() => {});
		}
	});
});
