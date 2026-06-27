import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { GoalsView, type GoalRecord } from '@/components/goals/GoalsView';

const KNOWN_STATUSES = new Set([
  'active',
  'done',
  'abandoned',
  'completed',
  'paused',
]);

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const sp = await searchParams;
  const filter =
    sp.status && KNOWN_STATUSES.has(sp.status) ? sp.status : 'active';

  // Fetch the whole set once. The horizon instrument always reflects the
  // active trajectory, while the filter only governs which goal cards render —
  // both are derived client-side from this list, so counts stay honest no
  // matter the filter. Personal-scale data; a single query is cheaper than two.
  const [goalsResult, habitsResult] = await Promise.all([
    supabase
      .from('goals')
      .select(
        'id, title, description, status, target_date, parent_goal_id, linked_habit_id, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('name', { ascending: true }),
  ]);

  const goals = (goalsResult.data ?? []) as GoalRecord[];
  const habits = (habitsResult.data ?? []) as Array<{ id: string; name: string }>;

  const habitOptions = habits.map((h) => ({ id: h.id, label: h.name }));
  const goalOptions = goals.map((g) => ({ id: g.id, label: g.title }));
  const today = new Date().toISOString().split('T')[0];

  return (
    <GoalsView
      allGoals={goals}
      habitOptions={habitOptions}
      goalOptions={goalOptions}
      filter={filter}
      today={today}
    />
  );
}
