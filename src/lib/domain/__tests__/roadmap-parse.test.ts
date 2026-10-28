import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCapstones, parseWeekTable } from "../roadmap-parse";

const doc = fs.readFileSync(
	"docs/files/senior-ai-systems-engineer-go-platform-roadmap-2026_1.md",
	"utf8",
);

const FIXTURE = `## 28-week execution plan

**Weekly cadence:** one | two | three.

| Week | Go | AI | ML | Evidence |
| --- | --- | --- | --- | --- |
| **M1 · 1** | Go \`context\` and \`a|b\` | ai one | ml one | ev one |
| **2** | go two | ai two | ml two | **Capstone 1:** done |

## Next
`;

describe("roadmap-parse", () => {
	it("parses 28 weeks with months 1–7 carried forward", () => {
		const weeks = parseWeekTable(doc);
		expect(weeks).toHaveLength(28);
		expect(weeks.map((w) => w.week)).toEqual(
			Array.from({ length: 28 }, (_, i) => i + 1),
		);
		expect(weeks[1].month).toBe(1);
		expect(weeks[8].month).toBe(3);
		expect(weeks.every((w) => w.go && w.ai && w.ml && w.evidence)).toBe(true);
	});

	it("marks capstones on weeks 4,8,…,28", () => {
		expect(
			parseWeekTable(doc)
				.filter((w) => w.capstone)
				.map((w) => [w.week, w.capstone]),
		).toEqual([
			[4, 1],
			[8, 2],
			[12, 3],
			[16, 4],
			[20, 5],
			[24, 6],
			[28, 7],
		]);
	});

	it("reads 7 capstones under the suffixed heading", () => {
		const caps = parseCapstones(doc);
		expect(caps).toHaveLength(7);
		expect(caps[0]).toMatchObject({ n: 1, title: "Go AI API gateway" });
		expect(caps[0].description).toMatch(/^request admission/);
	});

	it("skips the cadence paragraph and keeps inline markdown in cells", () => {
		const weeks = parseWeekTable(FIXTURE);
		expect(weeks).toHaveLength(2);
		expect(weeks[0].go).toContain("`context`");
		expect(weeks[0].go).toContain("`a|b`");
		expect(weeks[1]).toMatchObject({ week: 2, month: 1, capstone: 1 });
	});
});
