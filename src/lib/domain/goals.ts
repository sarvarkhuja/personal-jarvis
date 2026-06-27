export type GoalNode<T> = T & { children: GoalNode<T>[] };

/**
 * Build a parent → children tree from a flat list. Roots are entries whose
 * `parent_goal_id` is null OR whose parent isn't in the input set (e.g. when
 * the parent has a different status filter applied). Children are recursively
 * nested. Order of siblings preserves input order.
 */
export function buildGoalTree<
	T extends { id: string; parent_goal_id: string | null },
>(goals: T[]): GoalNode<T>[] {
	const byId = new Map<string, GoalNode<T>>();
	for (const g of goals) byId.set(g.id, { ...g, children: [] });

	const roots: GoalNode<T>[] = [];
	for (const g of goals) {
		const node = byId.get(g.id)!;
		const parentId = g.parent_goal_id;
		if (parentId && byId.has(parentId)) {
			byId.get(parentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	}
	return roots;
}

/**
 * Pick the top-N active goals nearest to their `target_date`. Goals without
 * a target_date sort after dated ones. Stable on input order for ties.
 */
export function topGoalsNearestTarget<
	T extends { status: string; target_date: string | null },
>(goals: T[], n: number, today: string): T[] {
	return goals
		.filter((g) => g.status === "active")
		.map((g, idx) => ({
			g,
			idx,
			// Distance in calendar days from today; null target_date pushed to the end.
			key:
				g.target_date === null
					? Number.POSITIVE_INFINITY
					: daysBetween(today, g.target_date),
		}))
		.sort((a, b) => a.key - b.key || a.idx - b.idx)
		.slice(0, n)
		.map((x) => x.g);
}

/**
 * Whole calendar days from `a` to `b` (both `YYYY-MM-DD`). Positive when `b`
 * is in the future relative to `a`. Computed in UTC so it never drifts by an
 * hour across DST. Exported for countdown displays.
 */
export function daysBetween(a: string, b: string): number {
	const [ay, am, ad] = a.split("-").map(Number);
	const [by, bm, bd] = b.split("-").map(Number);
	const at = Date.UTC(ay, am - 1, ad);
	const bt = Date.UTC(by, bm - 1, bd);
	return (bt - at) / (24 * 60 * 60 * 1000);
}
