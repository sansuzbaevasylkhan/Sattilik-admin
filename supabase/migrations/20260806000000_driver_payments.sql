-- Жүргізуші ID жүйесі және жол ақысын төлеу/шығару (ішкі симуляция).
--
-- driver_id — жүргізуші тіркелгенде автоматты жасалатын қысқа бірегей нөмір.
-- card_last4/card_holder — тек маскаланған карта деректері (толық PAN/CVV сақталмайды).
-- driver_paid/driver_paid_amount/driver_withdrawn — жолаушы жол ақысын
-- қосымша ішінде "төледі" деп белгілегенде және жүргізуші оны "шығарғанда"
-- пайдаланылатын ішкі симуляция өрістері (нақты банк аударымы жоқ).

alter table users
  add column if not exists driver_id text unique;

alter table users
  add column if not exists card_last4 text;

alter table users
  add column if not exists card_holder text;

create index if not exists idx_users_driver_id on users(driver_id);

alter table orders
  add column if not exists driver_paid boolean not null default false;

alter table orders
  add column if not exists driver_paid_amount integer not null default 0;

alter table orders
  add column if not exists driver_withdrawn boolean not null default false;
