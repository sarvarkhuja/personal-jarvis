import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGoal } from '@/lib/actions/goals';
import { AddGoalSheet } from '../AddGoalSheet';

vi.mock('@/lib/actions/goals', () => ({ createGoal: vi.fn() }));
vi.mock('react-hook-form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-hook-form')>();
  return { ...actual, useForm: vi.fn(actual.useForm) };
});

const parentId = '11111111-1111-4111-8111-111111111111';

describe('AddGoalSheet', () => {
  beforeEach(() => {
    vi.mocked(useForm).mockClear();
    vi.mocked(createGoal).mockReset();
    vi.mocked(createGoal).mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('does not initialize form controllers for closed goal or sub-goal sheets', async () => {
    const user = userEvent.setup();
    render(
      <>
        <AddGoalSheet habitOptions={[]} goalOptions={[]} />
        <AddGoalSheet
          habitOptions={[]}
          goalOptions={[]}
          defaultParentId={parentId}
          triggerLabel="Add sub-goal"
        />
      </>,
    );

    expect(useForm).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add goal' }));

    expect(useForm).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Add goal' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('saves the selected sub-goal and closes after the server succeeds', async () => {
    const user = userEvent.setup();
    render(
      <AddGoalSheet
        habitOptions={[]}
        goalOptions={[]}
        defaultParentId={parentId}
        triggerLabel="Add sub-goal"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Add sub-goal' }));
    await user.type(screen.getByLabelText('Title'), 'Finish chapter one');
    await user.click(screen.getByRole('button', { name: 'Save goal' }));

    await waitFor(() => expect(createGoal).toHaveBeenCalledWith({
      title: 'Finish chapter one',
      description: null,
      target_date: null,
      parent_goal_id: parentId,
      linked_habit_id: null,
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('retains the draft when a sheet is closed and reopened', async () => {
    const user = userEvent.setup();
    render(<AddGoalSheet habitOptions={[]} goalOptions={[]} />);
    await user.click(screen.getByRole('button', { name: 'Add goal' }));
    await user.type(screen.getByLabelText('Title'), 'Continue this draft');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add goal' }));

    expect(screen.getByLabelText('Title')).toHaveValue('Continue this draft');
    expect(createGoal).not.toHaveBeenCalled();
  });

  it('keeps the entered goal available for retry after a server error', async () => {
    vi.mocked(createGoal).mockRejectedValueOnce(new Error('Could not save goal'));
    const user = userEvent.setup();
    render(<AddGoalSheet habitOptions={[]} goalOptions={[]} />);
    await user.click(screen.getByRole('button', { name: 'Add goal' }));
    await user.type(screen.getByLabelText('Title'), 'Read twelve books');
    await user.click(screen.getByRole('button', { name: 'Save goal' }));

    expect(await screen.findByText('Could not save goal')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Read twelve books');
    expect(screen.getByRole('button', { name: 'Save goal' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Save goal' }));
    await waitFor(() => expect(createGoal).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
