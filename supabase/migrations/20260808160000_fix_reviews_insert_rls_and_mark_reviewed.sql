-- Бag 1: reviews INSERT саясаты тек "authenticated" рөліне рұқсат берген,
-- бірақ қосымша ешқашан нақты Supabase Auth логин жасамайды — барлық
-- сұраныстар anon кілтімен жіберіледі. Сондықтан пікір жіберу әрқашан
-- "new row violates row-level security policy" қатесімен сәтсіз аяқталған.
drop policy if exists "reviews_public_insert" on public.reviews;
create policy "reviews_public_insert" on public.reviews for insert
  to anon, authenticated with check (true);
