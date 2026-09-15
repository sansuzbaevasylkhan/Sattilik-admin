-- Жүргізушінің нақты уақыттағы GPS орнын сақтайтын кесте.
-- hooks/useLocationBroadcast.ts осында POST (upsert) жасайды,
-- hooks/useDriverLocation.ts осыдан GET арқылы оқиды (жолаушы картасында
-- жүргізушінің қозғалысын көру үшін).
-- (Кесте мен саясаттар бұрын қолмен жасалған болуы мүмкін — сондықтан
-- барлығы idempotent жазылды.)

create table if not exists public.driver_locations (
  phone text primary key,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.driver_locations enable row level security;

drop policy if exists "driver_locations_public_read" on public.driver_locations;
create policy "driver_locations_public_read" on public.driver_locations for select
  to anon, authenticated using (true);

drop policy if exists "driver_locations_public_upsert" on public.driver_locations;
create policy "driver_locations_public_upsert" on public.driver_locations for insert
  to anon, authenticated with check (true);

drop policy if exists "driver_locations_public_update" on public.driver_locations;
create policy "driver_locations_public_update" on public.driver_locations for update
  to anon, authenticated using (true) with check (true);

create index if not exists idx_driver_locations_phone on public.driver_locations(phone);
