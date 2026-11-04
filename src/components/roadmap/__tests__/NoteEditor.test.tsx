import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NoteEditor } from '../NoteEditor';

const CLAUDE_HTML = `
<p>Two Kafka alternatives:</p>
<table>
  <thead><tr><th>Broker</th><th>Needs ZooKeeper</th></tr></thead>
  <tbody><tr><td>Kafka</td><td>yes (legacy)</td></tr><tr><td>Redpanda</td><td>no</td></tr></tbody>
</table>
<pre><code class="language-go">ch := make(chan int)
close(ch)</code></pre>
<p>Use <strong>buffered</strong> channels <em>sparingly</em>.</p>
`;

function paste(target: Element, data: Record<string, string>) {
  fireEvent.paste(target, {
    clipboardData: {
      types: Object.keys(data),
      getData: (type: string) => data[type] ?? '',
      files: [],
      items: [],
    },
  });
}

async function editor() {
  const el = await screen.findByRole('textbox', { name: 'Note' });
  return el;
}

describe('NoteEditor', () => {
  afterEach(cleanup);

  it('renders initial markdown as rich content', async () => {
    render(<NoteEditor value={'# Title\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n```go\nx := 1\n```'} onChange={() => {}} />);
    const el = await editor();
    expect(el.querySelector('h1')).toHaveTextContent('Title');
    expect(el.querySelector('table th')).toHaveTextContent('a');
    expect(el.querySelector('table td')).toHaveTextContent('1');
    expect(el.querySelector('pre code')).toHaveTextContent('x := 1');
  });

  it('keeps tables, code blocks and emphasis from pasted HTML and reports markdown', async () => {
    const onChange = vi.fn();
    render(<NoteEditor value="" onChange={onChange} />);
    const el = await editor();
    paste(el, { 'text/html': CLAUDE_HTML, 'text/plain': 'Two Kafka alternatives: Broker Needs ZooKeeper Kafka yes' });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const md = onChange.mock.calls.at(-1)?.[0] as string;
    // The serializer pads cells so columns line up; the shape is what matters.
    expect(md).toMatch(/^\| Broker\s+\| Needs ZooKeeper\s+\|$/m);
    expect(md).toMatch(/^\| -+ \| -+ \|$/m);
    expect(md).toMatch(/^\| Redpanda\s+\| no\s+\|$/m);
    expect(md).toContain('```go\nch := make(chan int)\nclose(ch)\n```');
    expect(md).toContain('**buffered**');
    expect(md).toContain('*sparingly*');
    expect(el.querySelector('table')).not.toBeNull();
    expect(el.querySelector('pre code')).not.toBeNull();
  });

  it('parses markdown pasted as plain text, like a ChatGPT copy button', async () => {
    const onChange = vi.fn();
    render(<NoteEditor value="" onChange={onChange} />);
    const el = await editor();
    paste(el, { 'text/plain': '## Heading\n\n- one\n- two\n\n| k | v |\n| --- | --- |\n| a | b |' });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(el.querySelector('h2')).toHaveTextContent('Heading');
    expect(el.querySelectorAll('li')).toHaveLength(2);
    expect(el.querySelector('table td')).toHaveTextContent('a');
  });

  it('submits on Cmd+Enter and Ctrl+Enter without inserting a line', async () => {
    const onSubmit = vi.fn();
    render(<NoteEditor value="hi" onChange={() => {}} onSubmit={onSubmit} />);
    const el = await editor();
    fireEvent.keyDown(el, { key: 'Enter', metaKey: true });
    fireEvent.keyDown(el, { key: 'Enter', ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(el.querySelectorAll('p')).toHaveLength(1);
  });

  it('clears when the value prop is reset to empty', async () => {
    const { rerender } = render(<NoteEditor value="first" onChange={() => {}} />);
    const el = await editor();
    expect(el).toHaveTextContent('first');
    rerender(<NoteEditor value="" onChange={() => {}} />);
    await waitFor(() => expect(el).toHaveTextContent(''));
  });

  it('reports typed text as markdown', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NoteEditor value="" onChange={onChange} />);
    const el = await editor();
    await user.click(el);
    await user.keyboard('Channels block');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('Channels block'));
  });

  it('is not editable while disabled', async () => {
    render(<NoteEditor value="locked" onChange={() => {}} disabled />);
    const el = await editor();
    expect(el).toHaveAttribute('contenteditable', 'false');
  });
});
