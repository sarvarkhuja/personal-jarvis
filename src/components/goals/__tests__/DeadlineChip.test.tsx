import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateGoal } from '@/lib/actions/goals';
import { DeadlineChip } from '../DeadlineChip';

vi.mock('@/lib/actions/goals', () => ({ updateGoal: vi.fn() }));

const goalId = '11111111-1111-4111-8111-111111111111';
const today = '2026-11-04';

function dateInput() {
  return screen.getByLabelText(/deadline date/i) as HTMLInputElement;
}

describe('DeadlineChip', () => {
  beforeEach(() => {
    vi.mocked(updateGoal).mockReset();
    vi.mocked(updateGoal).mockResolvedValue(undefined as never);
  });
  afterEach(cleanup);

  it('shows the formatted deadline as a chip', () => {
    render(<DeadlineChip goalId={goalId} targetDate="2026-12-31" today={today} />);
    const chip = screen.getByRole('button', {
      name: 'Change deadline for this goal, currently 31 Dec 2026',
    });
    expect(chip).toHaveTextContent('DUE 31 DEC 2026 ✎');
  });

  it('formats dates UTC-safely (first of month does not slip a day)', () => {
    render(<DeadlineChip goalId={goalId} targetDate="2027-01-01" today={today} />);
    expect(screen.getByRole('button')).toHaveTextContent('DUE 01 JAN 2027 ✎');
  });

  it('shows NO DEADLINE when the goal has none', () => {
    render(<DeadlineChip goalId={goalId} targetDate={null} today={today} />);
    expect(screen.getByRole('button', { name: 'Set a deadline' })).toHaveTextContent(
      'NO DEADLINE ✎',
    );
  });

  it('turns into a focused date input on click, without CLEAR when there is no date', async () => {
    const user = userEvent.setup();
    render(<DeadlineChip goalId={goalId} targetDate={null} today={today} />);
    await user.click(screen.getByRole('button', { name: 'Set a deadline' }));
    const input = dateInput();
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('opens on Enter from the keyboard', async () => {
    const user = userEvent.setup();
    render(<DeadlineChip goalId={goalId} targetDate="2026-12-31" today={today} />);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(dateInput()).toHaveValue('2026-12-31');
  });

  it('commits a changed date and shows it optimistically', async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    vi.mocked(updateGoal).mockReturnValue(
      new Promise<never>((r) => {
        resolve = r as () => void;
      }),
    );
    render(<DeadlineChip goalId={goalId} targetDate="2026-12-31" today={today} />);
    await user.click(screen.getByRole('button'));
    fireEvent.change(dateInput(), { target: { value: '2027-03-15' } });

    expect(updateGoal).toHaveBeenCalledWith({ id: goalId, target_date: '2027-03-15' });
    expect(
      screen.getByRole('button', { name: /currently 15 Mar 2027/ }),
    ).toHaveTextContent('DUE 15 MAR 2027 ✎');
    resolve();
  });

  it('ignores partial years while typing', async () => {
    const user = userEvent.setup();
    render(<DeadlineChip goalId={goalId} targetDate="2026-12-31" today={today} />);
    await user.click(screen.getByRole('button'));
    fireEvent.change(dateInput(), { target: { value: '0002-12-31' } });
    expect(updateGoal).not.toHaveBeenCalled();
    expect(dateInput()).toBeInTheDocument();
  });

  it('CLEAR commits a null deadline', async () => {
    const user = userEvent.setup();
    render(<DeadlineChip goalId={goalId} targetDate="2026-12-31" today={today} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button', { name: /clear deadline/i }));
    expect(updateGoal).toHaveBeenCalledWith({ id: goalId, target_date: null });
    expect(screen.getByRole('button', { name: 'Set a deadline' })).toBeInTheDocument();
  });

  it('Escape cancels back to the chip without saving', async () => {
    const user = userEvent.setup();
    render(<DeadlineChip goalId={goalId} targetDate="2026-12-31" today={today} />);
    await user.click(screen.getByRole('button'));
    await user.keyboard('{Escape}');
    expect(updateGoal).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /currently 31 Dec 2026/ })).toHaveFocus();
  });

  it('blur without change cancels', async () => {
    const user = userEvent.setup();
    render(<DeadlineChip goalId={goalId} targetDate="2026-12-31" today={today} />);
    await user.click(screen.getByRole('button'));
    fireEvent.blur(dateInput());
    expect(updateGoal).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /currently 31 Dec 2026/ })).toBeInTheDocument();
  });

  it('reverts and shows [ERR] when saving fails', async () => {
    const user = userEvent.setup();
    vi.mocked(updateGoal).mockRejectedValue(new Error('boom'));
    render(<DeadlineChip goalId={goalId} targetDate="2026-12-31" today={today} />);
    await user.click(screen.getByRole('button'));
    fireEvent.change(dateInput(), { target: { value: '2027-03-15' } });

    await waitFor(() => expect(screen.getByText('[ERR]')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /currently 31 Dec 2026/ })).toBeInTheDocument();
  });

  it('follows a new targetDate from the server', () => {
    const { rerender } = render(
      <DeadlineChip goalId={goalId} targetDate="2026-12-31" today={today} />,
    );
    rerender(<DeadlineChip goalId={goalId} targetDate="2027-06-01" today={today} />);
    expect(screen.getByRole('button')).toHaveTextContent('DUE 01 JUN 2027 ✎');
  });
});
