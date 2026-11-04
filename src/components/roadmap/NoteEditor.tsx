'use client';

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { EditorContent, useEditor, type Editor, type UseEditorOptions } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { cn } from '@/lib/utils';
import { looksLikeMarkdown } from '@/lib/domain/note-markdown';
import { CodeFence } from './code-fence';

export type NoteEditorHandle = { focus: () => void };

/** Cmd/Ctrl+Enter submits from anywhere in the note, like the old textarea. */
function isSubmitKey(event: KeyboardEvent) {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey);
}

/**
 * Rich-text note editor that speaks Markdown.
 *
 * `value` is Markdown; `onChange` reports Markdown. Pasting HTML (Claude, ChatGPT,
 * docs) keeps headings, lists, tables, code blocks and emphasis; pasting raw
 * Markdown text is parsed too. Tables and fenced code round-trip as GFM.
 */
export function NoteEditor({ value, onChange, onSubmit, disabled = false, autoFocus = false, placeholder = 'What did you learn?', label = 'Note', className, handle }: {
  value: string;
  onChange: (markdown: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  /** Focus with the caret at the end once mounted (edit mode). */
  autoFocus?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  handle?: Ref<NoteEditorHandle>;
}) {
  // Tiptap re-applies its options whenever any option is a new reference, and
  // re-applying editor props between keystrokes drops characters. So the options
  // are built exactly once, and the callbacks read the latest props through a ref.
  const latest = useRef({ onChange, onSubmit });
  useEffect(() => { latest.current = { onChange, onSubmit }; });
  const editorRef = useRef<Editor | null>(null);

  const [options] = useState<UseEditorOptions & { immediatelyRender: false }>(() => ({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: { openOnClick: false } }),
      CodeFence,
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    content: value,
    contentType: 'markdown',
    editable: !disabled,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: { 'aria-label': label, 'aria-multiline': 'true', class: 'note-prose min-h-24 outline-none' },
      handleKeyDown: (_view, event) => {
        if (!isSubmitKey(event)) return false;
        event.preventDefault();
        latest.current.onSubmit?.();
        return true;
      },
      // HTML on the clipboard (Claude, ChatGPT, docs) is parsed by ProseMirror itself.
      // Markdown-looking plain text (a copy button, a .md file) goes through the Markdown parser.
      handlePaste: (view, event) => {
        const data = event.clipboardData;
        if (!data || data.getData('text/html')) return false;
        if (view.state.selection.$from.parent.type.spec.code) return false;
        const text = data.getData('text/plain');
        const e = editorRef.current;
        if (!e || !looksLikeMarkdown(text)) return false;
        event.preventDefault();
        e.commands.insertContent(text, { contentType: 'markdown' });
        return true;
      },
    },
    onCreate: ({ editor: e }) => { editorRef.current = e; },
    onUpdate: ({ editor: e }) => latest.current.onChange(e.getMarkdown()),
  }));
  const editor = useEditor(options);

  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);

  // Parent-driven resets (clear after save, prefill on edit) without echoing every keystroke back.
  useEffect(() => {
    if (!editor || value === editor.getMarkdown()) return;
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
  }, [editor, value]);

  useImperativeHandle(handle, () => ({ focus: () => editor?.commands.focus('end') }), [editor]);

  return (
    <div className={cn('w-full rounded-md border border-border-visible bg-background p-3 text-sm leading-relaxed text-text-primary focus-within:border-text-primary', disabled && 'opacity-60', className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
