-- Жүргізушінің нақты уақыттағы (real-time) орналасқан жері.
-- Сапар кезінде жолаушы жүргізушінің қозғалысын картадан көре алуы үшін.

create table if not exists public.driver_locations (
  phone text primary key,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.driver_locations enable row level security;

-- Апп-та нақты аутентификация жоқ (телефон-негізді), сондықтан
-- orders/users кестелерімен бірдей ашық саясат қолданамыз.
drop policy if exists "driver_locations_public_read" on public.driver_locations;
create policy "driver_locations_public_read" on public.driver_locations for select
  to anon, authenticated using (true);

drop policy if exists "driver_locations_public_upsert" on public.driver_locations;
create policy "driver_locations_public_upsert" on public.driver_locations for insert
  to anon, authenticated with check (true);

drop policy if exists "driver_locations_public_update" on public.driver_locations;
create policy "driver_locations_public_update" on public.driver_locations for update
  to anon, authenticated using (true);
