-- askdrv-admin панеліндегі "Жою" батырмасы (drivers/passengers) users
-- жазбасын толығымен өшіреді, тағы да anon кілтпен тікелей (сервис-рөл
-- кілт қолданылмайды, 20260823141000-дегі UPDATE саясатымен бірдей себеп).
drop policy if exists "users_admin_delete" on public.users;
create policy "users_admin_delete" on public.users for delete
  to anon, authenticated using (true);
