CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_public_read" ON users FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "users_public_insert" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX idx_users_phone ON users(phone);