-- Driver profile fields
-- Adds avatar and car info to users table

alter table users
  add column if not exists avatar_url text;

alter table users
  add column if not exists car_name text;

alter table users
  add column if not exists car_number text;

alter table users
  add column if not exists car_color text;

-- Enable RLS (already enabled) - no extra policies here for simplicity.
-- App uses anon key with permissive policies already enabled for select/update.

