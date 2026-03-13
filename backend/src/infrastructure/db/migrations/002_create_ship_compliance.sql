CREATE TABLE IF NOT EXISTS ship_compliance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id    VARCHAR(50) NOT NULL,
  year       INT NOT NULL,
  cb_gco2eq  NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
