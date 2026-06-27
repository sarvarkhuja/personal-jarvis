import { expect, test } from "@playwright/test";
import { readE2EEnv } from "../helpers/env";
import {
	adminClient,
	createTestUser,
	deleteTestUser,
	userClient,
} from "../helpers/users";

const env = readE2EEnv();

test.describe("RLS — medications", () => {
	test.skip(
		env === null,
		"Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to run RLS tests.",
	);

	test("user B cannot read or modify user A's medications", async () => {
		if (!env) return;
		const userA = await createTestUser(env, "rls-meds-a");
		const userB = await createTestUser(env, "rls-meds-b");
		try {
			const admin = adminClient(env);
			const { data: med, error: insErr } = await admin
				.from("medications")
				.insert({ user_id: userA.id, name: "Private — A" })
				.select()
				.single();
			expect(insErr).toBeNull();

			const sb = userClient(env);
			await sb.auth.signInWithPassword({
				email: userB.email,
				password: userB.password,
			});

			const { data: visible } = await sb
				.from("medications")
				.select("id")
				.eq("id", med!.id);
			expect(visible ?? []).toHaveLength(0);

			const { data: updated } = await sb
				.from("medications")
				.update({ name: "PWNED" })
				.eq("id", med!.id)
				.select();
			expect(updated ?? []).toHaveLength(0);

			const { data: deleted } = await sb
				.from("medications")
				.delete()
				.eq("id", med!.id)
				.select();
			expect(deleted ?? []).toHaveLength(0);

			const { data: stillThere } = await admin
				.from("medications")
				.select("name")
				.eq("id", med!.id)
				.single();
			expect(stillThere?.name).toBe("Private — A");
		} finally {
			await deleteTestUser(env, userA.id).catch(() => {});
			await deleteTestUser(env, userB.id).catch(() => {});
		}
	});

	test("user B cannot insert a medication_log against user A's med", async () => {
		if (!env) return;
		const userA = await createTestUser(env, "rls-meds-a2");
		const userB = await createTestUser(env, "rls-meds-b2");
		try {
			const admin = adminClient(env);
			const { data: med } = await admin
				.from("medications")
				.insert({ user_id: userA.id, name: "A only" })
				.select()
				.single();

			const sb = userClient(env);
			await sb.auth.signInWithPassword({
				email: userB.email,
				password: userB.password,
			});

			const { error: insertErr } = await sb.from("medication_logs").insert({
				user_id: userA.id, // forge attempt
				medication_id: med!.id,
				log_date: new Date().toISOString().slice(0, 10),
			});
			// RLS WITH CHECK fails on auth.uid() != user_id.
			expect(insertErr).not.toBeNull();
		} finally {
			await deleteTestUser(env, userA.id).catch(() => {});
			await deleteTestUser(env, userB.id).catch(() => {});
		}
	});
});
