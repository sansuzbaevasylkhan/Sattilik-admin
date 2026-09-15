-- Bot токені/username ауыстырылды (askdrvcodebot -> askdrvtaxiappcodebot).
-- Ескі боттан алынған telegram_chat_id жаңа бот үшін жарамсыз —
-- жаңа бот сол chat_id-ға хабарлама жібере алмайды (пайдаланушы жаңа
-- ботта әлі /start баспаған). Барлық пайдаланушыларды қайта
-- байланыстыруға мәжбүрлеу үшін тазалаймыз.
update public.users set telegram_chat_id = null where telegram_chat_id is not null;
