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
			const note = page.getByRole("textbox", { name: "Note" });
			await note.fill("Redpanda is Kafka without ZooKeeper");
			// Paste the way a browser does when copying from Claude/ChatGPT: HTML on the clipboard.
			await note.evaluate((el) => {
				const dt = new DataTransfer();
				dt.setData(
					"text/html",
					'<table><thead><tr><th>Broker</th><th>ZooKeeper</th></tr></thead><tbody><tr><td>Redpanda</td><td>no</td></tr></tbody></table><pre><code class="language-go">close(ch)</code></pre>',
				);
				dt.setData("text/plain", "Broker ZooKeeper Redpanda no close(ch)");
				el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
			});
			await expect(note.locator("table td", { hasText: "Redpanda" })).toBeVisible();
			await expect(note.locator("pre code")).toHaveText("close(ch)");
			await page.getByLabel("Topic", { exact: true }).fill("kafka-redpanda");
			await page.getByLabel("Topic", { exact: true }).press("Enter");
			await page.getByRole("button", { name: "Confidence 1" }).click();
			await page.getByRole("button", { name: "SAVE", exact: true }).click();
			await expect(page.getByText("[ SAVED ]")).toBeVisible();
			await expect(note).toHaveText("");

			await page.goto("/roadmap/library?topic=kafka-redpanda&conf=1");
			await expect(
				page.getByText("Redpanda is Kafka without ZooKeeper"),
			).toBeVisible();
			const card = page.locator("article", { hasText: "Redpanda is Kafka without ZooKeeper" });
			await expect(card.locator("table th", { hasText: "Broker" })).toBeVisible();
			await expect(card.locator("table td", { hasText: "Redpanda" })).toBeVisible();
			await expect(card.locator("pre code")).toHaveText("close(ch)");
		} finally {
			const admin = adminClient(env);
			await admin.from("roadmap_notes").delete().eq("user_id", user.id);
			await admin.from("roadmap_progress").delete().eq("user_id", user.id);
			await deleteTestUser(env, user.id).catch(() => {});
		}
	});
});
