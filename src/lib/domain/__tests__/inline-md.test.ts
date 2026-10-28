import { describe, expect, it } from "vitest";
import { parseInlineMd } from "../inline-md";

describe("parseInlineMd", () => {
	it("parses code, bold, italic and links", () => {
		const segs = parseInlineMd("a `b` **c** *d* [e](https://x.y)");
		expect(segs.map((s) => s.kind)).toEqual([
			"text",
			"code",
			"text",
			"bold",
			"text",
			"italic",
			"text",
			"link",
		]);
		expect(segs[7]).toEqual({ kind: "link", text: "e", href: "https://x.y" });
		expect(segs[1].text).toBe("b");
	});

	it("leaves unbalanced markers as text", () => {
		expect(parseInlineMd("**x")).toEqual([{ kind: "text", text: "**x" }]);
	});

	it("parses *pipeline* as italic", () => {
		expect(parseInlineMd("as a *pipeline*: data")).toEqual([
			{ kind: "text", text: "as a " },
			{ kind: "italic", text: "pipeline" },
			{ kind: "text", text: ": data" },
		]);
	});
});
