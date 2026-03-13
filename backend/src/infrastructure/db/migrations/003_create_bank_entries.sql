CREATE TABLE IF NOT EXISTS bank_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id         VARCHAR(50) NOT NULL,
  year            INT NOT NULL,
  amount_gco2eq   NUMERIC NOT NULL,
  applied         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
