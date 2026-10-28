import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setItemStatus } from '@/lib/actions/roadmap';
import { ROADMAP_WEEKS } from '@/lib/domain/roadmap-data';
import { itemHash, itemText, type ItemStatus } from '@/lib/domain/roadmap';
import { WeekItems } from '../WeekItems';

vi.mock('@/lib/actions/roadmap', () => ({ setItemStatus: vi.fn() }));

const week = ROADMAP_WEEKS.find((w) => w.week === 6)!;
const status = (track: ItemStatus['track'], s: ItemStatus['status'], hash?: string): ItemStatus => ({
  week: 6,
  track,
  status: s,
  item_hash: hash ?? itemHash(itemText(6, track)),
  updated_at: '2026-10-20T10:00:00Z',
});

describe('WeekItems', () => {
  beforeEach(() => {
    vi.mocked(setItemStatus).mockReset();
    vi.mocked(setItemStatus).mockResolvedValue({ success: true });
  });
  afterEach(cleanup);

  it('renders the five track rows', () => {
    render(<WeekItems week={week} statuses={[]} capstone={null} />);
    for (const label of ['DESIGN', 'GO', 'AI PLATFORM', 'ML RUNTIME', 'EVIDENCE']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('marks done, then clears when already done', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<WeekItems week={week} statuses={[]} capstone={null} />);
    await user.click(screen.getByRole('button', { name: /done go/i }));
    expect(setItemStatus).toHaveBeenCalledWith(6, 'go', 'done');

    rerender(<WeekItems week={week} statuses={[status('go', 'done')]} capstone={null} />);
    await user.click(screen.getByRole('button', { name: /done go/i }));
    expect(setItemStatus).toHaveBeenLastCalledWith(6, 'go', null);
  });

  it('shows [ REVISED ] when the stored hash differs', () => {
    render(<WeekItems week={week} statuses={[status('ml', 'done', 'stale')]} capstone={null} />);
    expect(screen.getByText('[ REVISED ]')).toBeInTheDocument();
  });

  it('renders an inline error from the action', async () => {
    vi.mocked(setItemStatus).mockResolvedValue({ error: 'Could not save' });
    const user = userEvent.setup();
    render(<WeekItems week={week} statuses={[]} capstone={null} />);
    await user.click(screen.getByRole('button', { name: /skip evidence/i }));
    await waitFor(() => expect(screen.getByText('[ERROR: Could not save]')).toBeInTheDocument());
  });
});
