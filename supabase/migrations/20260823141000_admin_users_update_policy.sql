-- askdrv-admin панелінің "block/unblock" әрекеті (app/api/*/status route.ts)
-- users кестесіне тікелей anon кілтпен PATCH жасайды (Supabase Auth жоқ,
-- сервер жағында да қызметтік кілт қолданылмайды). Bұрын 20260715000000
-- миграциясы қауіпсіздік үшін anon UPDATE-ті жапқан еді — сол admin
-- панельдің жұмыс істеуі үшін қайта ашамыз.
--
-- ЕСКЕРТУ: бұл anon кілтті білетін кез келген адамға (ол мобильді
-- қосымшамен ортақ, демек жария) users кестесінің кез келген жолын
-- өзгертуге мүмкіндік береді — тек is_blocked емес. Бұл admin панельдің
-- өз дизайнындағы шектеу (аутентификация жоқ), Supabase RLS деңгейінде
-- бұдан гөрі қатаң ұстау үшін admin панельге логин/сервис-рөл кілт
-- қосу керек болады.
drop policy if exists "users_admin_update" on public.users;
create policy "users_admin_update" on public.users for update
  to anon, authenticated using (true) with check (true);
