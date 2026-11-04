import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddHabitSheet } from '../AddHabitSheet';

vi.mock('@/lib/actions/habits', () => ({ createHabit: vi.fn() }));
vi.mock('@/lib/actions/goals', () => ({ createGoal: vi.fn() }));

const goalA = '11111111-1111-4111-8111-111111111111';
const goalB = '22222222-2222-4222-8222-222222222222';
const goalOptions = [
  { id: goalA, label: 'Run a marathon' },
  { id: goalB, label: 'Ship the app' },
];

describe('AddHabitSheet', () => {
  afterEach(cleanup);

  it('renders the default trigger with no goal preselected', async () => {
    const user = userEvent.setup();
    render(<AddHabitSheet goalOptions={goalOptions} />);

    await user.click(screen.getByRole('button', { name: 'Add habit' }));

    expect(screen.getByTestId('habit-goal')).toHaveValue('');
  });

  it('uses a custom trigger label and preselects the default goal', async () => {
    const user = userEvent.setup();
    render(
      <AddHabitSheet
        goalOptions={goalOptions}
        defaultGoalId={goalB}
        triggerLabel="+ Habit"
      />,
    );

    const trigger = screen.getByRole('button', { name: '+ Habit' });
    expect(trigger).toHaveAttribute('data-testid', `add-habit-trigger-${goalB}`);
    await user.click(trigger);

    expect(screen.getByTestId('habit-goal')).toHaveValue(goalB);
  });

  it('offers inline goal creation when there are no active goals', async () => {
    const user = userEvent.setup();
    render(<AddHabitSheet goalOptions={[]} />);

    await user.click(screen.getByRole('button', { name: 'Add habit' }));

    const empty = screen.getByTestId('add-habit-no-goals');
    expect(empty).toHaveTextContent('Habits belong to a goal. Create one first.');
    expect(screen.queryByRole('link', { name: /go to goals/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create a goal' }));

    expect(screen.getByRole('dialog', { name: 'Add goal' })).toBeInTheDocument();
  });
});
