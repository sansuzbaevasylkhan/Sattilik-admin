CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_phone TEXT NOT NULL,
  passenger_first_name TEXT NOT NULL,
  passenger_last_name TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  distance TEXT NOT NULL DEFAULT '0 км',
  estimated_time TEXT NOT NULL DEFAULT '0 мин',
  price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  driver_phone TEXT,
  driver_first_name TEXT,
  driver_last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_public_read" ON orders FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "orders_public_insert" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "orders_public_update" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
