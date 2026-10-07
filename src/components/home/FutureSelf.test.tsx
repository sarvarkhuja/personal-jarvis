import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FutureSelf } from './FutureSelf';
import { FocusConsole } from '@/components/focus/FocusConsole';
import { buildAttentionEvidence } from '@/lib/domain/future-self';
import { createSelfImageItem, deleteSelfImageItem, loadSelfImageProtocol, setFutureSelfStart, updateSelfImageItem } from '@/lib/actions/self-images';
import { startFocusSession, endFocusSession } from '@/lib/actions/focus';

vi.mock('@/lib/actions/self-images', () => ({
  setFutureSelfStart: vi.fn(), createSelfImageItem: vi.fn(), updateSelfImageItem: vi.fn(), deleteSelfImageItem: vi.fn(), loadSelfImageProtocol: vi.fn(),
}));
vi.mock('@/lib/actions/focus', () => ({ startFocusSession: vi.fn(), endFocusSession: vi.fn() }));
afterEach(() => { cleanup(); window.localStorage.clear(); vi.clearAllMocks(); });
const props = { items: [], today: '2026-09-25', startedOn: '2026-09-25', evidence: buildAttentionEvidence([], '2026-09-25'), evidenceAvailable: true, itemsAvailable: true, focusOptions: { goalOptions: [], habitOptions: [] } };

describe('FutureSelf', () => {
  it('changes horizons and keeps the quick recovery shortcut', async () => {
    const user = userEvent.setup();
    render(<FutureSelf {...props} />);
    await user.click(screen.getByRole('button', { name: /^7 months/i }));
    expect(screen.getByText('Consistency is who I am.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^7 months/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Standard \/ day 001 of 212 \/ by 25 APR 2027/)).toBeInTheDocument();
    expect(screen.getByText('Days left to my 7-month self')).toBeInTheDocument();
    const recovery = new URL(screen.getByRole('link', { name: /Restart with 5 minutes/ }).getAttribute('href')!, 'https://example.com');
    expect(recovery.searchParams.get('minutes')).toBe('5');
    expect(recovery.searchParams.get('intent')).toBeTruthy();
  });

  it('arms a session without an action and restores its timer after remounting', async () => {
    vi.mocked(startFocusSession).mockResolvedValue({ id: 'session-1' });
    vi.mocked(endFocusSession).mockResolvedValue({ id: 'session-1', ended_at: '2026-09-25T12:00:00Z', completed: false });
    const user = userEvent.setup();
    const { unmount } = render(<FutureSelf {...props} />);
    const session = within(screen.getByRole('region', { name: '[ Today / focus session ]' }));
    expect(session.getByText('A concrete action plan is optional.')).toBeInTheDocument();
    expect(session.queryByRole('textbox')).not.toBeInTheDocument();
    expect(session.queryByRole('combobox')).not.toBeInTheDocument();
    expect(session.queryByRole('spinbutton')).not.toBeInTheDocument();
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
    render(<FocusConsole {...{
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

  it('counts down from the start date and lets it be changed', async () => {
    vi.mocked(setFutureSelfStart).mockResolvedValueOnce({ error: 'The start date can’t be in the future.' }).mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<FutureSelf {...props} startedOn="2026-09-20" />);
    expect(screen.getByText(/Foundation \/ day 006 of 061/)).toBeInTheDocument();
    expect(screen.getByText('056')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Started 20 SEPT? 2026/ }));
    const input = screen.getByLabelText('Started on');
    await user.clear(input);
    await user.type(input, '2026-09-01');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/can’t be in the future/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(setFutureSelfStart).toHaveBeenLastCalledWith('2026-09-01');
  });

  it('loads the strict protocol into an empty horizon', async () => {
    vi.mocked(loadSelfImageProtocol).mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<FutureSelf {...props} />);
    await user.click(screen.getByRole('button', { name: /^15 months/i }));
    await user.click(screen.getByRole('button', { name: /Load strict protocol/ }));
    expect(loadSelfImageProtocol).toHaveBeenCalledWith(15);
    expect(await screen.findByText('[PROTOCOL LOADED]')).toBeInTheDocument();
  });

  it('adds, edits, and deletes statements, keeping drafts on failure', async () => {
    vi.mocked(createSelfImageItem).mockResolvedValueOnce({ error: 'Try again.' }).mockResolvedValueOnce({ success: true });
    vi.mocked(updateSelfImageItem).mockResolvedValue({ success: true });
    vi.mocked(deleteSelfImageItem).mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const item = { id: 'item-1', months: 2 as const, pillar: 'salah' as const, body: 'I pray on time.' };
    render(<FutureSelf {...props} items={[item]} />);
    expect(screen.queryByRole('button', { name: /Load strict protocol/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to Machine learning' }));
    const draft = screen.getByLabelText('New Machine learning statement');
    await user.type(draft, 'I study daily.{Enter}');
    expect(await screen.findByText('[ERROR: Try again.]')).toBeInTheDocument();
    expect(draft).toHaveValue('I study daily.');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(createSelfImageItem).toHaveBeenLastCalledWith({ months: 2, pillar: 'ml', body: 'I study daily.' });

    await user.click(screen.getByRole('button', { name: 'Edit: I pray on time.' }));
    const edit = screen.getByLabelText('Edit statement');
    await user.clear(edit);
    await user.type(edit, 'I pray every prayer on time.');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateSelfImageItem).toHaveBeenCalledWith('item-1', 'I pray every prayer on time.');

    await user.click(screen.getByRole('button', { name: 'Delete: I pray on time.' }));
    expect(deleteSelfImageItem).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('group', { name: 'Confirm delete' })).getByRole('button', { name: 'Yes' }));
    expect(deleteSelfImageItem).toHaveBeenCalledWith('item-1');
  });

  it('distinguishes unavailable data from zero activity', () => {
    render(<FutureSelf {...props} itemsAvailable={false} evidenceAvailable={false} />);
    expect(within(screen.getByRole('region', { name: '[ Last 14 days / evidence ]' })).getByRole('status')).toHaveTextContent('Focus history is unavailable');
    expect(screen.getByText(/self-image list is temporarily unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Salah' })).toBeDisabled();
  });
});
