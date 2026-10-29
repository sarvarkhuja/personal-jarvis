import { expect, test } from "@playwright/test";
import { readE2EEnv } from "../helpers/env";
import {
	adminClient,
	createTestUser,
	deleteTestUser,
	userClient,
} from "../helpers/users";

const env = readE2EEnv();

test.describe("RLS — roadmap", () => {
	test.skip(
		env === null,
		"Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run RLS tests.",
	);

	test("user B cannot read or modify user A's roadmap rows", async () => {
		if (!env) return;
		const userA = await createTestUser(env, "rls-roadmap-a");
		const userB = await createTestUser(env, "rls-roadmap-b");
		try {
			const admin = adminClient(env);
			const { data: item, error: itemErr } = await admin
				.from("roadmap_progress")
				.insert({
					user_id: userA.id,
					key: "ex:w01-go",
				})
				.select()
				.single();
			expect(itemErr).toBeNull();
			const { data: note, error: noteErr } = await admin
				.from("roadmap_notes")
				.insert({
					user_id: userA.id,
					week: 1,
					kind: "learning",
					confidence: 2,
					body: "Private — A",
					topics: ["kafka-redpanda"],
				})
				.select()
				.single();
			expect(noteErr).toBeNull();

			const sb = userClient(env);
			await sb.auth.signInWithPassword({
				email: userB.email,
				password: userB.password,
			});

			// select
			const { data: seenItem } = await sb
				.from("roadmap_progress")
				.select("id")
				.eq("id", item!.id);
			expect(seenItem ?? []).toHaveLength(0);
			const { data: seenNote } = await sb
				.from("roadmap_notes")
				.select("id")
				.eq("id", note!.id);
			expect(seenNote ?? []).toHaveLength(0);

			// update
			const { data: updItem } = await sb
				.from("roadmap_progress")
				.update({ key: "ex:w01-ai" })
				.eq("id", item!.id)
				.select();
			expect(updItem ?? []).toHaveLength(0);
			const { data: updNote } = await sb
				.from("roadmap_notes")
				.update({ body: "PWNED" })
				.eq("id", note!.id)
				.select();
			expect(updNote ?? []).toHaveLength(0);

			// delete
			const { data: delItem } = await sb
				.from("roadmap_progress")
				.delete()
				.eq("id", item!.id)
				.select();
			expect(delItem ?? []).toHaveLength(0);
			const { data: delNote } = await sb
				.from("roadmap_notes")
				.delete()
				.eq("id", note!.id)
				.select();
			expect(delNote ?? []).toHaveLength(0);

			// insert as A is rejected
			const { error: insItemErr } = await sb
				.from("roadmap_progress")
				.insert({
					user_id: userA.id,
					key: "ex:w02-go",
				});
			expect(insItemErr).not.toBeNull();
			const { error: insNoteErr } = await sb.from("roadmap_notes").insert({
				user_id: userA.id,
				week: 2,
				kind: "learning",
				body: "forged",
			});
			expect(insNoteErr).not.toBeNull();

			// A's rows are untouched, and nothing was forged
			const { data: itemAfter } = await admin
				.from("roadmap_progress")
				.select("key")
				.eq("user_id", userA.id);
			expect(itemAfter).toEqual([{ key: "ex:w01-go" }]);
			const { data: noteAfter } = await admin
				.from("roadmap_notes")
				.select("body")
				.eq("user_id", userA.id);
			expect(noteAfter).toEqual([{ body: "Private — A" }]);
		} finally {
			await deleteTestUser(env, userA.id).catch(() => {});
			await deleteTestUser(env, userB.id).catch(() => {});
		}
	});
});
