ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS passenger_reviewed BOOLEAN NOT NULL DEFAULT false;

-- Optional: restrict payment_method values
ALTER TABLE orders
  ALTER COLUMN payment_method DROP DEFAULT;

