import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteRoadmapNote, updateRoadmapNote } from '@/lib/actions/roadmap';
import type { RoadmapNote } from '@/lib/domain/roadmap-library';
import { NoteCard } from '../NoteCard';

vi.mock('@/lib/actions/roadmap', () => ({
  updateRoadmapNote: vi.fn(),
  deleteRoadmapNote: vi.fn(),
  createRoadmapNote: vi.fn(),
}));

const note: RoadmapNote = {
  id: '11111111-1111-4111-8111-111111111111',
  week: 6,
  track: 'go',
  kind: 'learning',
  confidence: 1,
  body: 'Channels block',
  topics: ['go-concurrency'],
  created_at: '2026-10-20T20:00:00Z',
  updated_at: '2026-10-20T20:00:00Z',
};

describe('NoteCard', () => {
  beforeEach(() => {
    vi.mocked(updateRoadmapNote).mockReset().mockResolvedValue({ success: true });
    vi.mocked(deleteRoadmapNote).mockReset().mockResolvedValue({ success: true });
  });
  afterEach(cleanup);

  it('renders kind, body, links and a local-date label', () => {
    render(<NoteCard note={note} tz="Asia/Tashkent" footer={<span>FOOT</span>} />);
    expect(screen.getByText('LEARNING')).toBeInTheDocument();
    expect(screen.getByText('Channels block')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'go-concurrency' })).toHaveAttribute('href', '/roadmap/library?topic=go-concurrency');
    expect(screen.getByRole('link', { name: 'W6' })).toHaveAttribute('href', '/roadmap?w=6');
    expect(screen.getByText('21 Oct')).toBeInTheDocument();
    expect(screen.getByText('FOOT')).toBeInTheDocument();
  });

  it('sets confidence from a dot', async () => {
    const user = userEvent.setup();
    render(<NoteCard note={note} tz="UTC" />);
    await user.click(screen.getByRole('button', { name: 'Confidence 3' }));
    await waitFor(() => expect(updateRoadmapNote).toHaveBeenCalledWith({ id: note.id, confidence: 3 }));
  });

  it('deletes after confirming', async () => {
    const user = userEvent.setup();
    render(<NoteCard note={note} tz="UTC" />);
    await user.click(screen.getByRole('button', { name: 'DELETE' }));
    expect(deleteRoadmapNote).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(deleteRoadmapNote).toHaveBeenCalledWith(note.id));
  });

  it('swaps to the composer on EDIT', async () => {
    const user = userEvent.setup();
    render(<NoteCard note={note} tz="UTC" />);
    await user.click(screen.getByRole('button', { name: 'EDIT' }));
    expect(screen.getByLabelText('Note')).toHaveValue('Channels block');
  });
});
