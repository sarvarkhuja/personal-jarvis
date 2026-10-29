-- Roadmap v3: one row per completed checkpoint (knowledge item, exercise, build,
-- gate, capstone criterion, foundation audit item). Row exists = done. Re-runnable.
-- The curriculum itself stays in src/data/roadmap.json; keys are validated app-side
-- and shape-checked here. roadmap_item_status (v1, 5 items/week) is left untouched.
create table if not exists public.roadmap_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key ~ '^(know|ex|build|gate|cap|found):[A-Za-z0-9:_-]{1,64}$'),
  done_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.roadmap_progress enable row level security;
revoke all on public.roadmap_progress from anon, authenticated;
grant select, insert, delete on public.roadmap_progress to authenticated;

drop policy if exists roadmap_progress_select on public.roadmap_progress;
create policy roadmap_progress_select on public.roadmap_progress for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists roadmap_progress_insert on public.roadmap_progress;
create policy roadmap_progress_insert on public.roadmap_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists roadmap_progress_delete on public.roadmap_progress;
create policy roadmap_progress_delete on public.roadmap_progress for delete to authenticated
  using ((select auth.uid()) = user_id);
