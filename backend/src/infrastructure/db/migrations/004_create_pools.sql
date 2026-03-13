CREATE TABLE IF NOT EXISTS pools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year       INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
