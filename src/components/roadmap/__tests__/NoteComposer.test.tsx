import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoadmapNote, updateRoadmapNote } from '@/lib/actions/roadmap';
import type { RoadmapNote } from '@/lib/domain/roadmap-library';
import { NoteComposer } from '../NoteComposer';

vi.mock('@/lib/actions/roadmap', () => ({ createRoadmapNote: vi.fn(), updateRoadmapNote: vi.fn() }));

const known = [{ slug: 'go-concurrency', count: 2 }];
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
    const body = screen.getByLabelText('Note');
    await user.type(body, 'Channels block');
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    await waitFor(() =>
      expect(createRoadmapNote).toHaveBeenCalledWith({
        week: 6, kind: 'learning', confidence: 2, body: 'Channels block', topics: ['go-concurrency'], track: null,
      }),
    );
    expect(await screen.findByText('[ SAVED ]')).toBeInTheDocument();
    expect(body).toHaveValue('');
    expect(screen.queryByText('go-concurrency')).not.toBeInTheDocument();
  });

  it('shows an inline error and keeps the draft when the action fails', async () => {
    vi.mocked(createRoadmapNote).mockResolvedValue({ error: 'Nope' });
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} />);
    await user.type(screen.getByLabelText('Note'), 'Keep me');
    await user.click(screen.getByRole('button', { name: 'SAVE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('[ERROR: Nope]');
    expect(screen.getByLabelText('Note')).toHaveValue('Keep me');
  });

  it('prefills and updates in edit mode, then calls onDone', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<NoteComposer week={6} known={known} initial={initial} onDone={onDone} />);
    expect(screen.getByLabelText('Note')).toHaveValue('Old body');
    expect(screen.getByText('channels')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GOTCHA' })).toHaveAttribute('aria-pressed', 'true');
    await user.type(screen.getByLabelText('Note'), '!');
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
});
