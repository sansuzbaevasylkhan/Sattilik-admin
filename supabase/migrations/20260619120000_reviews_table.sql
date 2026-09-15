CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  driver_phone TEXT NOT NULL,
  passenger_first_name TEXT,
  passenger_last_name TEXT,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow reading reviews for app UI (driver profile)
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

-- Allow creating reviews for authenticated users
CREATE POLICY "reviews_public_insert" ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_reviews_driver_phone ON reviews(driver_phone);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

