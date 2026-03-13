import pool from "./pool";

async function migrate(): Promise<void> {
  console.log("Running migrations...");

  await pool.query(`
    -- Add migration SQL here
    SELECT 1;
  `);

  console.log("Migrations complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
