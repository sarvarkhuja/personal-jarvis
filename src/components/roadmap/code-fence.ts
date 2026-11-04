import type { Attribute, Editor } from '@tiptap/core';
import { CodeBlock } from '@tiptap/extension-code-block';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Code blocks that behave like a Markdown fence.
 *
 * - ``` + Enter (or space) opens a block, as in StarterKit.
 * - Tab / Shift+Tab indent and dedent inside the block instead of moving focus.
 * - Typing ``` on its own line at the end of the block closes it and drops you
 *   into a paragraph below. Enter ×3 and ArrowDown still work as before.
 * - The language (```go) is rendered as data-language on the <pre> for a label.
 */

function inCode(editor: Editor) {
  return editor.state.selection.$from.parent.type.spec.code === true;
}

function indent(editor: Editor): boolean {
  if (!inCode(editor)) return false;
  return editor.commands.command(({ tr }) => { tr.insertText('  '); return true; });
}

function dedent(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  if (!inCode(editor)) return false;
  const text = $from.parent.textContent;
  const lineStart = text.lastIndexOf('\n', $from.parentOffset - 1) + 1;
  const spaces = /^ {1,2}/.exec(text.slice(lineStart))?.[0].length ?? 0;
  if (spaces === 0) return true;
  const from = $from.start() + lineStart;
  return editor.commands.command(({ tr }) => { tr.delete(from, from + spaces); return true; });
}

/** Called on the third backtick: the block already ends with a line holding "``". */
function closeFence(editor: Editor): boolean {
  const { $from, empty } = editor.state.selection;
  if (!empty || !inCode(editor)) return false;
  const text = $from.parent.textContent;
  if ($from.parentOffset !== text.length) return false;
  const lineStart = text.lastIndexOf('\n') + 1;
  if (text.slice(lineStart) !== '``') return false;

  // Opened and closed with nothing inside: the user changed their mind.
  if (lineStart === 0) {
    return editor.chain().deleteRange({ from: $from.start(), to: $from.pos }).setNode('paragraph').run();
  }

  const from = $from.start() + lineStart - 1; // the newline before the fence goes too
  const after = $from.after() - ($from.pos - from);
  return editor
    .chain()
    .deleteRange({ from, to: $from.pos })
    .command(({ tr, dispatch }) => {
      if (!dispatch) return true;
      const next = tr.doc.nodeAt(after);
      if (!next || next.type.name !== 'paragraph' || next.content.size !== 0) {
        tr.insert(after, tr.doc.type.schema.nodes.paragraph.create());
      }
      tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView();
      return true;
    })
    .run();
}

export const CodeFence = CodeBlock.extend({
  addAttributes() {
    const parent = (this.parent?.() ?? {}) as Record<string, Partial<Attribute>>;
    return {
      ...parent,
      language: {
        ...parent.language,
        rendered: true,
        renderHTML: (attrs: Record<string, unknown>) => (attrs.language ? { 'data-language': String(attrs.language) } : {}),
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: ({ editor }) => indent(editor),
      'Shift-Tab': ({ editor }) => dedent(editor),
      '`': ({ editor }) => closeFence(editor),
    };
  },
});
