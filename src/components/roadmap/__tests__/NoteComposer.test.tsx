import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoadmapNote, updateRoadmapNote } from '@/lib/actions/roadmap';
import type { RoadmapNote } from '@/lib/domain/roadmap-library';
import { NoteComposer } from '../NoteComposer';

vi.mock('@/lib/actions/roadmap', () => ({ createRoadmapNote: vi.fn(), updateRoadmapNote: vi.fn() }));

const known = [{ slug: 'go-concurrency', count: 2 }];

/** Clipboard stub: unknown MIME types read as empty, like a real DataTransfer. */
function paste(target: Element, data: Record<string, string>) {
  fireEvent.paste(target, {
    clipboardData: { types: Object.keys(data), getData: (type: string) => data[type] ?? '', files: [], items: [] },
  });
}
const initial: RoadmapNote = {
  id: '11111111-1111-4111-8111-111111111111',
  week: 6,
  track: 'go',
  kind: 'gotcha',
  confidence: 3,
  body: 'Old body',
  topics: ['channels'],
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
};

describe('NoteComposer', () => {
  beforeEach(() => {
    vi.mocked(createRoadmapNote).mockReset();
    vi.mocked(updateRoadmapNote).mockReset();
    vi.mocked(createRoadmapNote).mockResolvedValue({ success: true, id: 'x' });
    vi.mocked(updateRoadmapNote).mockResolvedValue({ success: true });
  });
  afterEach(cleanup);

  it('adds a normalized topic chip on Enter and removes it with the x button', async () => {
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} />);
    await user.type(screen.getByLabelText('Topic'), 'Go Concurrency{Enter}');
    expect(screen.getByText('go-concurrency')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove go-concurrency' }));
    expect(screen.queryByText('go-concurrency')).not.toBeInTheDocument();
  });

  it('submits with Cmd+Enter, resets and shows SAVED', async () => {
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} />);
    await user.type(screen.getByLabelText('Topic'), 'Go Concurrency{Enter}');
    const body = (await screen.findByRole('textbox', { name: 'Note' }));
    await user.click(body);
    paste(body, { 'text/plain': 'Channels block' });
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    await waitFor(() =>
      expect(createRoadmapNote).toHaveBeenCalledWith({
        week: 6, kind: 'learning', confidence: 2, body: 'Channels block', topics: ['go-concurrency'], track: null,
      }),
    );
    expect(await screen.findByText('[ SAVED ]')).toBeInTheDocument();
    expect(body).toHaveTextContent('');
    expect(screen.queryByText('go-concurrency')).not.toBeInTheDocument();
  });

  it('shows an inline error and keeps the draft when the action fails', async () => {
    vi.mocked(createRoadmapNote).mockResolvedValue({ error: 'Nope' });
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} />);
    paste(await screen.findByRole('textbox', { name: 'Note' }), { 'text/plain': 'Keep me' });
    await user.click(screen.getByRole('button', { name: 'SAVE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('[ERROR: Nope]');
    expect((await screen.findByRole('textbox', { name: 'Note' }))).toHaveTextContent('Keep me');
  });

  it('prefills and updates in edit mode, then calls onDone', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} initial={initial} onDone={onDone} />);
    expect((await screen.findByRole('textbox', { name: 'Note' }))).toHaveTextContent('Old body');
    expect(screen.getByText('channels')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GOTCHA' })).toHaveAttribute('aria-pressed', 'true');
    await user.type((await screen.findByRole('textbox', { name: 'Note' })), '!');
    await user.click(screen.getByRole('button', { name: 'SAVE' }));
    await waitFor(() =>
      expect(updateRoadmapNote).toHaveBeenCalledWith({
        id: initial.id, week: 6, kind: 'gotcha', confidence: 3, body: 'Old body!', topics: ['channels'], track: 'go',
      }),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(createRoadmapNote).not.toHaveBeenCalled();
  });

  it('cancel calls onDone in edit mode', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} initial={initial} onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: 'CANCEL' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('Enter in the topic input does not submit', async () => {
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} />);
    paste(await screen.findByRole('textbox', { name: 'Note' }), { 'text/plain': 'Body' });
    await user.type(screen.getByLabelText('Topic'), 'abc{Enter}');
    expect(createRoadmapNote).not.toHaveBeenCalled();
  });

  it('caps at 8 topics: Enter keeps the draft and submit sends exactly 8', async () => {
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} initial={{ ...initial, topics: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }} />);
    expect(screen.getByLabelText('Topic')).toBeDisabled();
    cleanup();
    render(<NoteComposer week={6} known={known} />);
    paste(await screen.findByRole('textbox', { name: 'Note' }), { 'text/plain': 'Body' });
    for (const t of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) await user.type(screen.getByLabelText('Topic'), `${t}{Enter}`);
    expect(screen.getByLabelText('Topic')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'SAVE' }));
    await waitFor(() => expect(createRoadmapNote).toHaveBeenCalled());
    expect(vi.mocked(createRoadmapNote).mock.calls[0][0].topics).toHaveLength(8);
  });

  it('saves pasted rich content as markdown with its table and code block intact', async () => {
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} />);
    const body = await screen.findByRole('textbox', { name: 'Note' });
    paste(body, {
      'text/html': '<table><tr><th>Broker</th><th>ZK</th></tr><tr><td>Redpanda</td><td>no</td></tr></table><pre><code class="language-go">close(ch)</code></pre>',
      'text/plain': 'Broker ZK Redpanda no close(ch)',
    });
    await user.click(screen.getByRole('button', { name: 'SAVE' }));
    await waitFor(() => expect(createRoadmapNote).toHaveBeenCalled());
    const sent = vi.mocked(createRoadmapNote).mock.calls[0][0].body;
    expect(sent).toMatch(/^\| Broker\s+\| ZK\s+\|$/m);
    expect(sent).toContain('```go\nclose(ch)\n```');
  });

  it('blocks saving and flags the counter once the markdown passes 4000 characters', async () => {
    render(<NoteComposer week={6} known={known} />);
    const body = await screen.findByRole('textbox', { name: 'Note' });
    const long = 'x'.repeat(4001);
    paste(body, { 'text/plain': long });
    await waitFor(() => expect(screen.getByText('4001/4000')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'SAVE' })).toBeDisabled();
    expect(createRoadmapNote).not.toHaveBeenCalled();
  });

  it('returns focus to the note after a save', async () => {
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} />);
    paste(await screen.findByRole('textbox', { name: 'Note' }), { 'text/plain': 'Body' });
    await user.click(screen.getByRole('button', { name: 'SAVE' }));
    await screen.findByText('[ SAVED ]');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Note' })).toHaveFocus());
  });
});
