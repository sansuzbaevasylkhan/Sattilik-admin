-- Telegram-бот арқылы растау кодтарын жіберу үшін.
-- Әр пайдаланушы ботқа /start жазады → бот webhook-ы chat_id-ді осы бағанға сақтайды.
-- send-code осы chat_id-ға код жібереді.
alter table public.users
  add column if not exists telegram_chat_id text;

-- Бір chat_id тек бір пайдаланушыға тиесілі.
-- Ботты бірнеше адам иеленбесін, қайта тіркелулер шатаспасын.
create unique index if not exists users_telegram_chat_id_key
  on public.users (telegram_chat_id)
  where telegram_chat_id is not null;

-- Кодты 0000–9999 аралығында жасайтын SQL функциясы.
-- send-code Edge Function осы функцияны RPC арқылы шақырады,
-- сонда код генерациясы бір жерде — Postgres-та.
create or replace function public.generate_verification_code()
returns text
language sql
volatile
as $$
  select lpad((floor(random() * 10000))::int::text, 4, '0');
$$;
