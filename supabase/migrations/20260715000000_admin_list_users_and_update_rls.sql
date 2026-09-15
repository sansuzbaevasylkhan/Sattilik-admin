-- telegram-webhook PATCH жасай алуы үшін service_role bypass-қа сенеміз,
-- бірақ қосымша қауіпсіздік: service_role-ға UPDATE рұқсатын қосамыз.
-- (service_role RLS-ті bypass жасайды, бірақ саясаттар service_role үшін
-- өткізілетін етіп жасаймыз, anon/authenticated үшін жабық.)

-- 1) telegram_chat_id бағанын жаңарту үшін service_role-ға UPDATE рұқсаты.
-- (service_role RLS bypass жасайды, бірақ бұл саясат анықтық үшін.)
-- anon/authenticated тікелей telegram_chat_id жасай алмасын:
drop policy if exists "users_public_update" on public.users;

-- 2) Driver-ге profile толтыру үшін өз жазбасын update жасай алатындай етеміз
--    (қазір бұл жоқ, бірақ келешекте керек болады).
--    Бірақ тек өз телефонымен ғана:
drop policy if exists "users_self_update" on public.users;
-- (anon/authenticated аутентификациясыз өзін identify жасай алмайды,
--  сондықтан бұл саясатты өшіріп қалдырамыз. PATCH тек Edge Function арқылы.)

-- 3) Admin функциясы үшін service_role read рұқсатын анық қалдырамыз.
--    (service_role RLS bypass жасайды — қосымша саясат қажет емес.)
