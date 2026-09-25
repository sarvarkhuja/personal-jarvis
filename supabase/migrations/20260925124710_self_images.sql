create table public.self_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  months smallint not null check (months in (2, 7, 15)),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  vision text not null check (char_length(btrim(vision)) between 1 and 600),
  ml text not null check (char_length(btrim(ml)) between 1 and 400),
  physique text not null check (char_length(btrim(physique)) between 1 and 400),
  work text not null check (char_length(btrim(work)) between 1 and 400),
  salah text not null check (char_length(btrim(salah)) between 1 and 400),
  discipline text not null check (char_length(btrim(discipline)) between 1 and 400),
  created_at timestamptz not null default now()
);

create index self_images_user_months_idx on public.self_images (user_id, months, created_at);
alter table public.self_images enable row level security;
revoke all on public.self_images from anon, authenticated;
grant select, insert, update, delete on public.self_images to authenticated;

create policy self_images_select on public.self_images for select to authenticated
  using ((select auth.uid()) = user_id);
create policy self_images_insert on public.self_images for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy self_images_update on public.self_images for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy self_images_delete on public.self_images for delete to authenticated
  using ((select auth.uid()) = user_id);
