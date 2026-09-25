import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FutureSelf } from './FutureSelf';
import { buildAttentionEvidence } from '@/lib/domain/future-self';
import { STARTER_SELF_IMAGES } from '@/lib/schemas/self-images';
import { saveSelfImage } from '@/lib/actions/self-images';
import { startFocusSession, endFocusSession } from '@/lib/actions/focus';

vi.mock('@/lib/actions/self-images', () => ({ saveSelfImage: vi.fn() }));
vi.mock('@/lib/actions/focus', () => ({ startFocusSession: vi.fn(), endFocusSession: vi.fn() }));
afterEach(() => { cleanup(); window.localStorage.clear(); vi.clearAllMocks(); });
const props = { images: [], evidence: buildAttentionEvidence([], '2026-09-25'), evidenceAvailable: true, imagesAvailable: true, focusOptions: { goalOptions: [], habitOptions: [] } };

describe('FutureSelf', () => {
  it('changes horizons and keeps the quick recovery shortcut', async () => {
    const user = userEvent.setup();
    render(<FutureSelf {...props} />);
    await user.click(screen.getByRole('button', { name: /^7 months/i }));
    expect(screen.getByText(STARTER_SELF_IMAGES[1].vision)).toBeInTheDocument();
    const recovery = new URL(screen.getByRole('link', { name: /Restart with 5 minutes/ }).getAttribute('href')!, 'https://example.com');
    expect(recovery.searchParams.get('minutes')).toBe('5');
    expect(recovery.searchParams.get('intent')).toBeTruthy();
  });

  it('arms a session without an action and restores its timer after remounting', async () => {
    vi.mocked(startFocusSession).mockResolvedValue({ id: 'session-1' });
    vi.mocked(endFocusSession).mockResolvedValue({ id: 'session-1', ended_at: '2026-09-25T12:00:00Z', completed: false });
    const user = userEvent.setup();
    const { unmount } = render(<FutureSelf {...props} />);
    expect(screen.getByLabelText('One concrete next action (optional)')).not.toBeRequired();
    await user.click(screen.getByRole('button', { name: 'Arm session' }));
    expect(startFocusSession).toHaveBeenCalledWith({ planned_minutes: 25, intent: undefined, linked_goal_id: null, linked_habit_id: null });
    expect(await screen.findByTestId('focus-elapsed')).toBeInTheDocument();
    unmount();
    render(<FutureSelf {...props} />);
    expect(await screen.findByTestId('focus-elapsed')).toBeInTheDocument();
    expect(startFocusSession).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Abort' }));
    expect(endFocusSession).toHaveBeenCalledWith({ id: 'session-1', completed: false });
  });

  it('uses the shared goal, timer habit, action, and duration controls', async () => {
    vi.mocked(startFocusSession).mockResolvedValue({ id: 'session-2' });
    const user = userEvent.setup();
    render(<FutureSelf {...props} focusOptions={{
      goalOptions: [{ id: 'goal-1', label: 'Learn Python' }, { id: 'goal-2', label: 'Read more' }],
      habitOptions: [
        { id: 'habit-1', label: 'Python practice', kind: 'timer', goalId: 'goal-1' },
        { id: 'habit-2', label: 'Reading', kind: 'timer', goalId: 'goal-2' },
      ],
    }} />);
    await user.selectOptions(screen.getByLabelText('Linked goal'), 'goal-1');
    expect(within(screen.getByLabelText('Linked timer habit')).queryByRole('option', { name: 'Reading' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Linked timer habit'), 'habit-1');
    await user.type(screen.getByLabelText('One concrete next action (optional)'), 'Solve one exercise');
    await user.click(screen.getByRole('button', { name: '45' }));
    await user.click(screen.getByRole('button', { name: 'Arm session' }));
    expect(startFocusSession).toHaveBeenCalledWith({ planned_minutes: 45, intent: 'Solve one exercise', linked_goal_id: 'goal-1', linked_habit_id: 'habit-1' });
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
