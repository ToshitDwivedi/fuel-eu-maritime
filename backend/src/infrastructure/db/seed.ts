import pool from "./pool";

async function seed(): Promise<void> {
  console.log("Seeding database...");

  await pool.query(`
    -- Add seed SQL here
    SELECT 1;
  `);

  console.log("Seeding complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
