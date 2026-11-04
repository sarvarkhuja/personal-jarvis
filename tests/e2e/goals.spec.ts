import { expect, test } from "@playwright/test";
import { readE2EEnv } from "../helpers/env";
import { adminClient, createTestUser, deleteTestUser } from "../helpers/users";

const env = readE2EEnv();

test.describe("Goals & Habits — grouped by goal", () => {
	test.skip(
		env === null,
		"Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run.",
	);

	test("/goals redirects to /habits, habits sit under their goal, deadline edits in place", async ({
		page,
	}) => {
		if (!env) return;
		const user = await createTestUser(env, "goals-happy");
		try {
			const admin = adminClient(env);
			const { data: goal, error: goalErr } = await admin
				.from("goals")
				.insert({
					user_id: user.id,
					title: "Read 12 books",
					status: "active",
					target_date: "2027-06-30",
				})
				.select()
				.single();
			expect(goalErr).toBeNull();

			const { data: habit, error: habitErr } = await admin
				.from("habits")
				.insert({
					user_id: user.id,
					goal_id: goal!.id,
					name: "Read 30 min",
					kind: "check",
					frequency_json: { type: "daily" },
					color: "gray",
				})
				.select()
				.single();
			expect(habitErr).toBeNull();

			await page.goto("/login");
			await page.getByLabel(/email/i).fill(user.email);
			await page.getByLabel(/password/i).fill(user.password);
			await page.getByRole("button", { name: /sign in|log in/i }).click();
			await page.waitForURL((u) => !u.pathname.startsWith("/login"));

			await page.goto("/goals");
			await expect(page).toHaveURL(/\/habits$/);

			const card = page.getByTestId(`goal-card-${goal!.id}`);
			await expect(card.getByTestId(`goal-title-${goal!.id}`)).toContainText(
				"Read 12 books",
			);
			await expect(card.getByTestId(`habit-row-${habit!.id}`)).toBeVisible();

			// Change the deadline in place.
			await card.getByRole("button", { name: /change deadline/i }).click();
			await card.getByLabel("Deadline date").fill("2027-07-15");
			await card.getByLabel("Deadline date").press("Enter");
			await expect(card).toContainText(/15 JUL 2027/);

			await expect
				.poll(async () => {
					const { data } = await admin
						.from("goals")
						.select("target_date")
						.eq("id", goal!.id)
						.single();
					return data?.target_date;
				})
				.toBe("2027-07-15");
		} finally {
			await adminClient(env).from("habits").delete().eq("user_id", user.id);
			await adminClient(env).from("goals").delete().eq("user_id", user.id);
			await deleteTestUser(env, user.id).catch(() => {});
		}
	});
});
