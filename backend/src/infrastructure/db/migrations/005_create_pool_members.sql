CREATE TABLE IF NOT EXISTS pool_members (
  pool_id   UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  ship_id   VARCHAR(50) NOT NULL,
  cb_before NUMERIC NOT NULL,
  cb_after  NUMERIC NOT NULL,
  PRIMARY KEY (pool_id, ship_id)
);
