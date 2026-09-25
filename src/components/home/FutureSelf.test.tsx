import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FutureSelf } from './FutureSelf';
import { buildAttentionEvidence } from '@/lib/domain/future-self';
import { STARTER_SELF_IMAGES } from '@/lib/schemas/self-images';
import { saveSelfImage } from '@/lib/actions/self-images';

vi.mock('@/lib/actions/self-images', () => ({ saveSelfImage: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const props = { images: [], today: '2026-09-25', evidence: buildAttentionEvidence([], '2026-09-25'), evidenceAvailable: true, imagesAvailable: true };

describe('FutureSelf', () => {
  it('changes horizons and calculates the cost of skipping practice', async () => {
    const user = userEvent.setup();
    render(<FutureSelf {...props} />);
    await user.click(screen.getByRole('button', { name: /^7 months/i }));
    expect(screen.getByText(STARTER_SELF_IMAGES[1].vision)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Days skipped / week'), '7');
    expect(screen.getByText(/7 skipped days a week means about 88 fewer hours/)).toBeInTheDocument();
    const recovery = new URL(screen.getByRole('link', { name: /Restart with 5 minutes/ }).getAttribute('href')!, 'https://example.com');
    expect(recovery.searchParams.get('minutes')).toBe('5');
    expect(recovery.searchParams.get('intent')).toBeTruthy();
  });

  it('retains edits when saving fails and allows retry', async () => {
    vi.mocked(saveSelfImage).mockResolvedValueOnce({ error: 'Try again.' }).mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<FutureSelf {...props} />);
    await user.click(screen.getByRole('button', { name: 'Make it mine' }));
    const input = screen.getByLabelText('Identity statement');
    await user.clear(input);
    await user.type(input, 'I build every day.');
    await user.click(screen.getByRole('button', { name: 'Save my vision' }));
    expect(await screen.findByText('Try again.')).toBeInTheDocument();
    expect(input).toHaveValue('I build every day.');
    await user.click(screen.getByRole('button', { name: 'Save my vision' }));
    expect(await screen.findByText(/Saved. This is the direction/)).toBeInTheDocument();
    expect(saveSelfImage).toHaveBeenLastCalledWith(expect.objectContaining({ months: 2, title: 'I build every day.' }), undefined);
  });

  it('updates saved visions by id and distinguishes unavailable data from zero activity', async () => {
    vi.mocked(saveSelfImage).mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const saved = { ...STARTER_SELF_IMAGES[0], id: 'saved-vision' };
    const { rerender } = render(<FutureSelf {...props} images={[saved]} />);
    await user.click(screen.getByRole('button', { name: 'Make it mine' }));
    await user.click(screen.getByRole('button', { name: 'Save my vision' }));
    expect(saveSelfImage).toHaveBeenCalledWith(expect.anything(), saved.id);
    rerender(<FutureSelf {...props} imagesAvailable={false} evidenceAvailable={false} />);
    expect(within(screen.getByRole('region', { name: '02 / How I’m actually going' })).getByRole('status')).toHaveTextContent('Focus history is unavailable');
    expect(screen.getByRole('button', { name: 'Close editor' })).toBeDisabled();
  });
});
