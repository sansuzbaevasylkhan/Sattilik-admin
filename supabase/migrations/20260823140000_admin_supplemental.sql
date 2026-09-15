-- askdrv-admin (Next.js admin panel) талап ететін қосымша схема.
-- Дереккөзі: askdrv-admin/sql/admin-supplemental.sql

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null,
  period_start date not null,
  period_end date not null,
  total_trips integer not null default 0,
  gross_amount numeric(12, 2) not null default 0,
  commission_percent numeric(5, 2) not null default 10,
  net_amount numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_driver_id_idx on public.payments (driver_id);
create index if not exists payments_status_idx on public.payments (status);
create index if not exists payments_period_idx on public.payments (period_start, period_end);

-- admin панелі anon кілтімен тікелей қосылады, сондықтан RLS-ті орталар
-- (orders/users) сияқты anon/authenticated үшін ашық етеміз.
alter table public.payments enable row level security;

drop policy if exists "payments_public_read" on public.payments;
create policy "payments_public_read" on public.payments for select
  to anon, authenticated using (true);

drop policy if exists "payments_public_write" on public.payments;
create policy "payments_public_write" on public.payments for insert
  to anon, authenticated with check (true);

drop policy if exists "payments_public_update" on public.payments;
create policy "payments_public_update" on public.payments for update
  to anon, authenticated using (true) with check (true);

create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.admin_settings (key, value)
values ('commission_percent', '10')
on conflict (key) do nothing;

alter table public.admin_settings enable row level security;

drop policy if exists "admin_settings_public_read" on public.admin_settings;
create policy "admin_settings_public_read" on public.admin_settings for select
  to anon, authenticated using (true);

drop policy if exists "admin_settings_public_write" on public.admin_settings;
create policy "admin_settings_public_write" on public.admin_settings for update
  to anon, authenticated using (true) with check (true);

-- orders кестесін realtime публикацияға қосу (қайталап қосса қате бермеу
-- үшін бар-жоғын алдын ала тексереміз).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
