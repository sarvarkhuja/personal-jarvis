import { expect, test } from "@playwright/test";
import { readE2EEnv } from "../helpers/env";
import {
	adminClient,
	createTestUser,
	deleteTestUser,
	userClient,
} from "../helpers/users";

const env = readE2EEnv();

test.describe("RLS — focus_sessions", () => {
	test.skip(
		env === null,
		"Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run RLS tests.",
	);

	test("user B cannot read or modify user A's focus sessions", async () => {
		if (!env) return;
		const userA = await createTestUser(env, "rls-focus-a");
		const userB = await createTestUser(env, "rls-focus-b");
		try {
			const admin = adminClient(env);
			const { data: session, error: insErr } = await admin
				.from("focus_sessions")
				.insert({
					user_id: userA.id,
					planned_minutes: 25,
					intent: "private",
				})
				.select()
				.single();
			expect(insErr).toBeNull();

			const sb = userClient(env);
			await sb.auth.signInWithPassword({
				email: userB.email,
				password: userB.password,
			});

			const { data: visible } = await sb
				.from("focus_sessions")
				.select("id")
				.eq("id", session!.id);
			expect(visible ?? []).toHaveLength(0);

			const { data: updated } = await sb
				.from("focus_sessions")
				.update({ intent: "PWNED" })
				.eq("id", session!.id)
				.select();
			expect(updated ?? []).toHaveLength(0);

			const { data: deleted } = await sb
				.from("focus_sessions")
				.delete()
				.eq("id", session!.id)
				.select();
			expect(deleted ?? []).toHaveLength(0);

			const { data: stillThere } = await admin
				.from("focus_sessions")
				.select("intent")
				.eq("id", session!.id)
				.single();
			expect(stillThere?.intent).toBe("private");
		} finally {
			await deleteTestUser(env, userA.id).catch(() => {});
			await deleteTestUser(env, userB.id).catch(() => {});
		}
	});
});
