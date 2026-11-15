-- ⚠️ ҚОЛМЕН ОРЫНДАЛАТЫН СКРИПТ — миграция емес, автоматты түрде іске қосылмайды.
-- Мақсаты: @sattiliktaxiappcodebot ботына ауысқанда ескі боттан қалған
-- public.users.telegram_chat_id мәндерін тазалау (жаңа бот ол chat_id-лерге
-- хабарлама жібере алмайды, өйткені пайдаланушы жаңа ботта /start баспаған).
--
-- Орындау: Supabase SQL Editor-ге көшіріп, рұқсат берілгеннен кейін
-- соңғы ROLLBACK-ты COMMIT-қа ауыстырыңыз.

-- 1) Алдын ала тексеру
select count(*) as linked_users
from public.users
where telegram_chat_id is not null;

begin;

update public.users
set telegram_chat_id = null
where telegram_chat_id is not null;

-- 2) Нәтижені тексеру (0 болуы керек)
select count(*) as linked_users_after
from public.users
where telegram_chat_id is not null;

-- Әдейі ROLLBACK: скрипт қателесіп іске қосылса, өзгеріс сақталмайды.
-- Рұқсат берілгенде ғана осы жолды "commit;" деп ауыстырыңыз.
rollback;
