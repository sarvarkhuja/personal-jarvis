import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FocusConsole } from '../FocusConsole';

// The component imports server actions; we never exercise them here, so stub the
// module to keep the test in jsdom without pulling in the Supabase server client.
vi.mock('@/lib/actions/focus', () => ({
  startFocusSession: vi.fn(),
  endFocusSession: vi.fn(),
}));

const goalOptions = [
  { id: 'goal-a', label: 'Goal A' },
  { id: 'goal-b', label: 'Goal B' },
];

const habitOptions = [
  { id: 'h-a1', label: 'A timer one', kind: 'timer', goalId: 'goal-a' },
  { id: 'h-a2', label: 'A timer two', kind: 'timer', goalId: 'goal-a' },
  { id: 'h-b1', label: 'B timer one', kind: 'timer', goalId: 'goal-b' },
  { id: 'h-check', label: 'A checkbox', kind: 'checkbox', goalId: 'goal-a' },
];

function habitOptionLabels() {
  const select = screen.getByTestId('focus-habit');
  return within(select)
    .getAllByRole('option')
    .map((o) => o.textContent);
}

describe('FocusConsole — linked timer habit reacts to the selected goal', () => {
  it('lists every timer habit (and no non-timer habits) when no goal is selected', () => {
    render(<FocusConsole goalOptions={goalOptions} habitOptions={habitOptions} />);
    expect(habitOptionLabels()).toEqual([
      '— none —',
      'A timer one',
      'A timer two',
      'B timer one',
    ]);
  });

  it('narrows the timer-habit options to the chosen goal', async () => {
    const user = userEvent.setup();
    render(<FocusConsole goalOptions={goalOptions} habitOptions={habitOptions} />);

    await user.selectOptions(screen.getByTestId('focus-goal'), 'goal-a');

    expect(habitOptionLabels()).toEqual(['— none —', 'A timer one', 'A timer two']);
  });

  it('clears a linked habit that no longer belongs to the newly chosen goal', async () => {
    const user = userEvent.setup();
    render(<FocusConsole goalOptions={goalOptions} habitOptions={habitOptions} />);

    await user.selectOptions(screen.getByTestId('focus-goal'), 'goal-a');
    const habitSelect = screen.getByTestId('focus-habit') as HTMLSelectElement;
    await user.selectOptions(habitSelect, 'h-a1');
    expect(habitSelect.value).toBe('h-a1');

    await user.selectOptions(screen.getByTestId('focus-goal'), 'goal-b');

    expect(habitSelect.value).toBe('');
    expect(habitOptionLabels()).toEqual(['— none —', 'B timer one']);
  });
});
