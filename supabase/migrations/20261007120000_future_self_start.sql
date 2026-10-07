-- Anchor the future-self runway: horizons are counted from this date, not from today.
alter table public.profiles
  add column future_self_started_on date not null default current_date;

-- Existing users start on the day they wrote their first self-image statement.
update public.profiles p
set future_self_started_on = (min_created at time zone p.timezone)::date
from (
  select user_id, min(created_at) as min_created
  from public.self_image_items
  group by user_id
) first_item
where first_item.user_id = p.id;
