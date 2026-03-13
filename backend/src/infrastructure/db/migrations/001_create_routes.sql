CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS routes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      VARCHAR(20) NOT NULL UNIQUE,
  vessel_type   VARCHAR(50) NOT NULL,
  fuel_type     VARCHAR(50) NOT NULL,
  year          INT NOT NULL,
  ghg_intensity NUMERIC NOT NULL,
  fuel_consumption NUMERIC NOT NULL,
  distance      NUMERIC NOT NULL,
  total_emissions NUMERIC NOT NULL,
  is_baseline   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
