-- order.tsx карта арқылы таңдалған pickup/dropoff координаттарын алады,
-- бірақ бұрын orders кестесінде оларды сақтайтын баған болмаған —
-- сондықтан жүргізуші жағында карта көрсетуге дерек жетпей келген.

alter table public.orders
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision,
  add column if not exists dropoff_lat double precision,
  add column if not exists dropoff_lng double precision;
