import { expect, test } from "@playwright/test";
import { readE2EEnv } from "../helpers/env";
import { adminClient, createTestUser, deleteTestUser } from "../helpers/users";

const env = readE2EEnv();

test.describe("Roadmap — progress and notes", () => {
	test.skip(
		env === null,
		"Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run.",
	);

	test("tick an item, capture a note, find it in the library", async ({
		page,
	}) => {
		if (!env) return;
		const user = await createTestUser(env, "roadmap-happy");
		try {
			await page.goto("/login");
			await page.getByLabel(/email/i).fill(user.email);
			await page.getByLabel(/password/i).fill(user.password);
			await page.getByRole("button", { name: /sign in|log in/i }).click();
			await page.waitForURL((u) => !u.pathname.startsWith("/login"));

			await page.goto("/roadmap");
			await expect(page.getByText("Foundations · week 1 of 28")).toBeVisible();
			await page.getByRole("tab", { name: /^Practice/ }).click();
			const exercise = page.getByRole("button", { name: /^Done: Implement a modular Go/ });
			await exercise.click();
			await expect(exercise).toHaveAttribute("aria-pressed", "true");
			await expect(page.getByText("001", { exact: true })).toBeVisible();
			await page.reload();
			await expect(exercise).toHaveAttribute("aria-pressed", "true");

			await page.getByRole("tab", { name: /^Notes/ }).click();
			await page.getByLabel("Note", { exact: true }).fill("Redpanda is Kafka without ZooKeeper");
			await page.getByLabel("Topic", { exact: true }).fill("kafka-redpanda");
			await page.getByLabel("Topic", { exact: true }).press("Enter");
			await page.getByRole("button", { name: "Confidence 1" }).click();
			await page.getByRole("button", { name: "SAVE", exact: true }).click();
			await expect(page.getByText("[ SAVED ]")).toBeVisible();

			await page.goto("/roadmap/library?topic=kafka-redpanda&conf=1");
			await expect(
				page.getByText("Redpanda is Kafka without ZooKeeper"),
			).toBeVisible();
		} finally {
			const admin = adminClient(env);
			await admin.from("roadmap_notes").delete().eq("user_id", user.id);
			await admin.from("roadmap_progress").delete().eq("user_id", user.id);
			await deleteTestUser(env, user.id).catch(() => {});
		}
	});
});
