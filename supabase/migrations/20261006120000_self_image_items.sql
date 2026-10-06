-- Self-image as a list: one row per "I am…" statement, per horizon and pillar.
-- Replaces the one-row-per-horizon form in self_images (left in place, unused).
create table public.self_image_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  months smallint not null check (months in (2, 7, 15)),
  pillar text not null check (pillar in ('discipline', 'ml', 'physique', 'salah', 'work')),
  body text not null check (char_length(btrim(body)) between 1 and 280),
  -- clock_timestamp() so a multi-row insert keeps its VALUES order.
  created_at timestamptz not null default clock_timestamp()
);

create index self_image_items_user_idx on public.self_image_items (user_id, months, created_at);
alter table public.self_image_items enable row level security;
revoke all on public.self_image_items from anon, authenticated;
grant select, insert, update, delete on public.self_image_items to authenticated;

create policy self_image_items_select on public.self_image_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy self_image_items_insert on public.self_image_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy self_image_items_update on public.self_image_items for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy self_image_items_delete on public.self_image_items for delete to authenticated
  using ((select auth.uid()) = user_id);
