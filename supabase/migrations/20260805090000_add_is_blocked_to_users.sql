-- Admin dashboard needs a block/unblock action for both drivers and passengers.
alter table users
  add column if not exists is_blocked boolean not null default false;
