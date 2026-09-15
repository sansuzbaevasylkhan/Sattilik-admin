-- Add driver rating fields and auto-update average_rating from reviews
-- 2026-07-06

-- 1) Add columns on users
alter table users
  add column if not exists average_rating numeric;

alter table users
  add column if not exists reviews_count integer;

-- 2) Trigger function: when a review is inserted -> recompute driver's rating
create or replace function public.recompute_driver_rating_from_reviews()
returns trigger
language plpgsql
security definer
as $$
declare
  v_avg numeric;
  v_cnt integer;
begin
  -- NEW.driver_phone matches reviews.driver_phone
  select
    avg(r.stars)::numeric,
    count(*)::integer
  into v_avg, v_cnt
  from public.reviews r
  where r.driver_phone = new.driver_phone;

  update public.users u
  set
    average_rating = v_avg,
    reviews_count = v_cnt
  where u.phone = new.driver_phone;

  return new;
end;
$$;

-- 3) Attach trigger to reviews inserts
drop trigger if exists trg_reviews_recompute_driver_rating on public.reviews;

create trigger trg_reviews_recompute_driver_rating
after insert on public.reviews
for each row
execute function public.recompute_driver_rating_from_reviews();

-- 4) (optional) Allow select/update usage via existing RLS.
-- RLS policies already permit SELECT for anon/authenticated.
-- This migration updates users from the trigger function (runs as security definer).

