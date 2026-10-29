-- Roadmap playbook: per-item progress and the notes library. Re-runnable.
create table if not exists public.roadmap_item_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week smallint not null check (week between 1 and 28),
  track text not null check (track in ('design', 'go', 'ai', 'ml', 'evidence')),
  status text not null check (status in ('done', 'skipped')),
  -- short hash of the item text when ticked; drift detection
  item_hash text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, week, track)
);

alter table public.roadmap_item_status enable row level security;
revoke all on public.roadmap_item_status from anon, authenticated;
grant select, insert, update, delete on public.roadmap_item_status to authenticated;

drop policy if exists roadmap_item_status_select on public.roadmap_item_status;
create policy roadmap_item_status_select on public.roadmap_item_status for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists roadmap_item_status_insert on public.roadmap_item_status;
create policy roadmap_item_status_insert on public.roadmap_item_status for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists roadmap_item_status_update on public.roadmap_item_status;
create policy roadmap_item_status_update on public.roadmap_item_status for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists roadmap_item_status_delete on public.roadmap_item_status;
create policy roadmap_item_status_delete on public.roadmap_item_status for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.roadmap_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week smallint not null check (week between 1 and 28),
  track text null check (track in ('design', 'go', 'ai', 'ml', 'evidence')),
  kind text not null check (kind in ('learning', 'question', 'gotcha', 'decision', 'resource', 'story')),
  confidence smallint not null default 2 check (confidence between 1 and 3),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  topics text[] not null default '{}' check (cardinality(topics) <= 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmap_notes_user_created_idx on public.roadmap_notes (user_id, created_at desc);
create index if not exists roadmap_notes_topics_idx on public.roadmap_notes using gin (topics);

alter table public.roadmap_notes enable row level security;
revoke all on public.roadmap_notes from anon, authenticated;
grant select, insert, update, delete on public.roadmap_notes to authenticated;

drop policy if exists roadmap_notes_select on public.roadmap_notes;
create policy roadmap_notes_select on public.roadmap_notes for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists roadmap_notes_insert on public.roadmap_notes;
create policy roadmap_notes_insert on public.roadmap_notes for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists roadmap_notes_update on public.roadmap_notes;
create policy roadmap_notes_update on public.roadmap_notes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists roadmap_notes_delete on public.roadmap_notes;
create policy roadmap_notes_delete on public.roadmap_notes for delete to authenticated
  using ((select auth.uid()) = user_id);
