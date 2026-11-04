/**
 * Markdown heuristics for roadmap notes.
 *
 * Notes are stored as Markdown. When plain text lands in the editor (no HTML on
 * the clipboard, e.g. ChatGPT's copy button or a .md file), we only want to run
 * it through the Markdown parser when it actually carries Markdown syntax;
 * ordinary prose should stay exactly as typed.
 */

const BLOCK = /^(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s?|```|\|.*\|\s*$)/m;
const INLINE = /\*\*[^*\n]+\*\*|`[^`\n]+`/;

export function looksLikeMarkdown(text: string): boolean {
  if (!text.trim()) return false;
  return BLOCK.test(text) || INLINE.test(text);
}
