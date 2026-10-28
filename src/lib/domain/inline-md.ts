export type InlineSegment = {
	kind: "text" | "code" | "bold" | "italic" | "link";
	text: string;
	href?: string;
};

/** Tiny left-to-right inline markdown scanner: `code`, **bold**, *italic*, [text](url). */
export function parseInlineMd(text: string): InlineSegment[] {
	const out: InlineSegment[] = [];
	let buf = "";
	const flush = () => {
		if (buf) out.push({ kind: "text", text: buf });
		buf = "";
	};

	let i = 0;
	while (i < text.length) {
		const ch = text[i];
		if (ch === "`") {
			const end = text.indexOf("`", i + 1);
			if (end > i + 1) {
				flush();
				out.push({ kind: "code", text: text.slice(i + 1, end) });
				i = end + 1;
				continue;
			}
		} else if (text.startsWith("**", i)) {
			const end = text.indexOf("**", i + 2);
			if (end > i + 2) {
				flush();
				out.push({ kind: "bold", text: text.slice(i + 2, end) });
				i = end + 2;
				continue;
			}
		} else if (ch === "*") {
			const end = text.indexOf("*", i + 1);
			if (end > i + 1) {
				flush();
				out.push({ kind: "italic", text: text.slice(i + 1, end) });
				i = end + 1;
				continue;
			}
		} else if (ch === "[") {
			const m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(text.slice(i));
			if (m) {
				flush();
				out.push({ kind: "link", text: m[1], href: m[2] });
				i += m[0].length;
				continue;
			}
		}
		buf += ch;
		i++;
	}
	flush();
	return out;
}
