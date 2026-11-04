import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { CodeFence } from '../code-fence';

let editor: Editor;

/** Headless Tiptap editor with the same code-block behaviour as NoteEditor. */
function mount(markdown: string) {
  editor = new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit.configure({ codeBlock: false }), CodeFence, Markdown],
    content: markdown,
    contentType: 'markdown',
  });
  return editor;
}

/** Doc position at the very end of the first code block's text. */
function endOfCode() {
  let end = -1;
  editor.state.doc.descendants((node, pos) => {
    if (end === -1 && node.type.name === 'codeBlock') end = pos + 1 + node.content.size;
  });
  if (end === -1) throw new Error('no code block');
  return end;
}

function key(init: KeyboardEventInit) {
  fireEvent.keyDown(editor.view.dom, init);
}

/** The editor always keeps an empty trailing paragraph; the note schema trims it on save. */
function md() {
  return editor.getMarkdown().trimEnd();
}

afterEach(() => editor?.destroy());

describe('CodeFence', () => {
  it('Tab inside a code block inserts two spaces instead of leaving the editor', () => {
    mount('```go\nx\n```');
    editor.commands.setTextSelection(endOfCode());
    key({ key: 'Tab' });
    expect(md()).toBe('```go\nx  \n```');
  });

  it('Tab outside a code block is left to the browser', () => {
    mount('plain');
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    key({ key: 'Tab' });
    expect(md()).toBe('plain');
  });

  it('Shift+Tab removes up to two leading spaces from the current line', () => {
    mount('```go\n    deep\n```');
    editor.commands.setTextSelection(endOfCode());
    key({ key: 'Tab', shiftKey: true });
    expect(md()).toBe('```go\n  deep\n```');
    key({ key: 'Tab', shiftKey: true });
    key({ key: 'Tab', shiftKey: true });
    expect(md()).toBe('```go\ndeep\n```');
  });

  it('typing the third backtick of a closing fence leaves the code block', () => {
    mount('```go\nx\n``\n```');
    editor.commands.setTextSelection(endOfCode());
    key({ key: '`' });
    expect(md()).toBe('```go\nx\n```');
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
    expect(editor.state.doc.lastChild?.type.name).toBe('paragraph');
  });

  it('a closing fence in an otherwise empty block turns it back into a paragraph', () => {
    mount('```\n``\n```');
    editor.commands.setTextSelection(endOfCode());
    key({ key: '`' });
    expect(editor.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(md()).toBe('');
  });

  it('a backtick anywhere else in a code block is not intercepted', () => {
    mount('```go\nfmt.Println(`raw`)\n```');
    editor.commands.setTextSelection(endOfCode());
    key({ key: '`' });
    expect(md()).toBe('```go\nfmt.Println(`raw`)\n```');
    expect(editor.state.selection.$from.parent.type.name).toBe('codeBlock');
  });

  it('labels the rendered pre with its language', () => {
    mount('```go\nx\n```');
    expect(editor.view.dom.querySelector('pre')).toHaveAttribute('data-language', 'go');
    expect(editor.view.dom.querySelector('pre code')).toHaveClass('language-go');
  });
});
