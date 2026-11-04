import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteGoal, setGoalStatus } from '@/lib/actions/goals';
import { GoalActionsMenu } from '../GoalActionsMenu';

vi.mock('@/lib/actions/goals', () => ({ setGoalStatus: vi.fn(), deleteGoal: vi.fn() }));

const goalId = '11111111-1111-4111-8111-111111111111';
const title = 'Run a marathon';

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: `Goal actions for ${title}` }));
  return screen.findByRole('menu');
}

function itemNames() {
  return screen.getAllByRole('menuitem').map((el) => el.textContent?.trim());
}

describe('GoalActionsMenu', () => {
  beforeEach(() => {
    vi.mocked(setGoalStatus).mockReset().mockResolvedValue(undefined);
    vi.mocked(deleteGoal).mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders a closed menu trigger with popup semantics', () => {
    render(<GoalActionsMenu goalId={goalId} goalTitle={title} status="active" />);
    const trigger = screen.getByRole('button', { name: `Goal actions for ${title}` });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('lists active-goal actions, including add sub-goal when provided', async () => {
    const user = userEvent.setup();
    render(
      <GoalActionsMenu goalId={goalId} goalTitle={title} status="active" onAddSubGoal={() => {}} />,
    );
    await open(user);
    expect(
      screen.getByRole('button', { name: `Goal actions for ${title}` }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(itemNames()).toEqual(['Complete', 'Pause', 'Abandon', 'Add sub-goal', 'Delete']);
  });

  it('omits add sub-goal without a handler', async () => {
    const user = userEvent.setup();
    render(<GoalActionsMenu goalId={goalId} goalTitle={title} status="active" />);
    await open(user);
    expect(itemNames()).toEqual(['Complete', 'Pause', 'Abandon', 'Delete']);
  });

  it('lists paused-goal actions', async () => {
    const user = userEvent.setup();
    render(<GoalActionsMenu goalId={goalId} goalTitle={title} status="paused" />);
    await open(user);
    expect(itemNames()).toEqual(['Resume', 'Complete', 'Abandon', 'Delete']);
  });

  it.each(['done', 'completed', 'abandoned'] as const)(
    'lists only resume and delete for %s goals',
    async (status) => {
      const user = userEvent.setup();
      render(<GoalActionsMenu goalId={goalId} goalTitle={title} status={status} />);
      await open(user);
      expect(itemNames()).toEqual(['Resume', 'Delete']);
    },
  );

  it.each([
    ['active', 'Complete', 'done'],
    ['active', 'Pause', 'paused'],
    ['active', 'Abandon', 'abandoned'],
    ['paused', 'Resume', 'active'],
    ['done', 'Resume', 'active'],
  ] as const)('%s → %s sets status %s', async (status, label, next) => {
    const user = userEvent.setup();
    render(<GoalActionsMenu goalId={goalId} goalTitle={title} status={status} />);
    await open(user);
    await user.click(screen.getByRole('menuitem', { name: label }));
    await waitFor(() =>
      expect(setGoalStatus).toHaveBeenCalledWith({ id: goalId, status: next }),
    );
  });

  it('add sub-goal calls the handler', async () => {
    const user = userEvent.setup();
    const onAddSubGoal = vi.fn();
    render(
      <GoalActionsMenu
        goalId={goalId}
        goalTitle={title}
        status="active"
        onAddSubGoal={onAddSubGoal}
      />,
    );
    await open(user);
    await user.click(screen.getByRole('menuitem', { name: 'Add sub-goal' }));
    expect(onAddSubGoal).toHaveBeenCalledTimes(1);
  });

  it('delete confirms with the cascade warning, then deletes', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GoalActionsMenu goalId={goalId} goalTitle={title} status="active" />);
    await open(user);
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(confirm).toHaveBeenCalledWith(
      `Delete "${title}"? This also deletes its habits and their history.`,
    );
    await waitFor(() => expect(deleteGoal).toHaveBeenCalledWith({ id: goalId }));
  });

  it('does not delete when the confirm is dismissed', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<GoalActionsMenu goalId={goalId} goalTitle={title} status="active" />);
    await open(user);
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(deleteGoal).not.toHaveBeenCalled();
  });

  it('shows [ERR] when an action fails', async () => {
    const user = userEvent.setup();
    vi.mocked(setGoalStatus).mockRejectedValue(new Error('nope'));
    render(<GoalActionsMenu goalId={goalId} goalTitle={title} status="active" />);
    await open(user);
    await user.click(screen.getByRole('menuitem', { name: 'Pause' }));
    expect(await screen.findByText('[ERR]')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<GoalActionsMenu goalId={goalId} goalTitle={title} status="active" />);
    await open(user);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('closes on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <p>outside</p>
        <GoalActionsMenu goalId={goalId} goalTitle={title} status="active" />
      </div>,
    );
    await open(user);
    await user.click(screen.getByText('outside'));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
