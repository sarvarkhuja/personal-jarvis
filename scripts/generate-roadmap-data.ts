#!/usr/bin/env npx tsx
/**
 * Generates src/lib/domain/roadmap-data.ts from the roadmap markdown.
 * Run: npm run roadmap:gen
 */
import fs from "node:fs";
import path from "node:path";
import { parseCapstones, parseWeekTable } from "../src/lib/domain/roadmap-parse";

const ROOT = path.resolve(__dirname, "..");
const DOC = path.join(
	ROOT,
	"docs/files/senior-ai-systems-engineer-go-platform-roadmap-2026_1.md",
);
const OUT = path.join(ROOT, "src/lib/domain/roadmap-data.ts");

function main() {
	const md = fs.readFileSync(DOC, "utf8");
	const weeks = parseWeekTable(md);
	const caps = parseCapstones(md);
	if (weeks.length !== 28 || caps.length !== 7) {
		console.error(
			`Unexpected parse result: ${weeks.length} weeks, ${caps.length} capstones`,
		);
		process.exit(1);
	}
	const out = `// GENERATED — run npm run roadmap:gen
import type { Capstone, RoadmapWeek } from "./roadmap-parse";

export const ROADMAP_WEEKS: RoadmapWeek[] = ${JSON.stringify(weeks, null, 2)};

export const CAPSTONES: Capstone[] = ${JSON.stringify(caps, null, 2)};
`;
	fs.writeFileSync(OUT, out);
	console.log(`Wrote ${path.relative(ROOT, OUT)}`);
}

main();
