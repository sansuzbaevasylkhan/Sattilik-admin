create table if not exists public.trip_chat_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  phone text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists trip_chat_sessions_expires_at_idx
  on public.trip_chat_sessions (expires_at);

alter table public.trip_chat_sessions enable row level security;
revoke all on public.trip_chat_sessions from anon, authenticated;
grant all on public.trip_chat_sessions to service_role;
