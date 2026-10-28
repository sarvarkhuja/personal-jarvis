export type RoadmapWeek = {
	week: number;
	month: number;
	go: string;
	ai: string;
	ml: string;
	evidence: string;
	capstone: number | null;
};

export type Capstone = { n: number; title: string; description: string };

/** Split a pipe-table row on `|`, ignoring pipes inside backtick spans. */
function splitRow(line: string): string[] {
	const cells: string[] = [];
	let cur = "";
	let inCode = false;
	for (const ch of line) {
		if (ch === "`") inCode = !inCode;
		if (ch === "|" && !inCode) {
			cells.push(cur.trim());
			cur = "";
		} else {
			cur += ch;
		}
	}
	cells.push(cur.trim());
	// Leading/trailing pipes produce empty edge cells.
	if (cells[0] === "") cells.shift();
	if (cells.length && cells[cells.length - 1] === "") cells.pop();
	return cells;
}

export function parseWeekTable(md: string): RoadmapWeek[] {
	const lines = md.split("\n");
	const start = lines.findIndex((l) => l.startsWith("## 28-week execution plan"));
	if (start === -1) return [];

	const weeks: RoadmapWeek[] = [];
	let month = 1;
	let inTable = false;
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line.startsWith("|")) {
			if (inTable) break;
			continue;
		}
		inTable = true;
		const cells = splitRow(line);
		if (cells.length < 5) continue;
		const m = /\*\*(?:M(\d) · )?(\d+)\*\*/.exec(cells[0]);
		if (!m) continue; // header and --- rows
		if (m[1]) month = Number(m[1]);
		const cap = /\*\*Capstone (\d):\*\*/.exec(cells[4]);
		weeks.push({
			week: Number(m[2]),
			month,
			go: cells[1],
			ai: cells[2],
			ml: cells[3],
			evidence: cells[4],
			capstone: cap ? Number(cap[1]) : null,
		});
	}
	return weeks;
}

export function parseCapstones(md: string): Capstone[] {
	const lines = md.split("\n");
	const start = lines.findIndex((l) =>
		l.startsWith("### Seven portfolio capstones"),
	);
	if (start === -1) return [];

	const caps: Capstone[] = [];
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i];
		if (/^#{1,6} /.test(line)) break;
		const m = /^(\d+)\. \*\*(.+?):\*\* (.+)$/.exec(line);
		if (m) caps.push({ n: Number(m[1]), title: m[2], description: m[3].trim() });
	}
	return caps;
}
