-- WhatsApp OTP кодтарын сақтау кестесі.
-- Edge Function send-code жаңа код жазады, verify-code оқиды/белгілейді.
create extension if not exists "pgcrypto";

create table if not exists public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('passenger', 'driver')),
  code text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

-- Жиі сұралатын (телефон + код) үшін жартылай-индекс
create index if not exists idx_verification_codes_phone_code
  on public.verification_codes (phone, code)
  where verified = false;

-- Ескі кодтарды тазалау (CRON қосылса) — қазір қажет емес, бірақ кеңес ретінде:
-- delete from public.verification_codes where expires_at < now() and verified = false;

-- RLS: тек service_role кіре алады (Edge Function арқылы).
alter table public.verification_codes enable row level security;

-- Әдепкі бойынша саясат жоқ — anon/authenticated кіре алмайды.
-- service_role bypass RLS автоматты.
