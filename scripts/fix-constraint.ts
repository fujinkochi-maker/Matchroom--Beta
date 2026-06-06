import pg from "pg";
import process from "node:process";

// Use Supabase direct connection with service role token as password
const pool = new pg.Pool({
  host: "wimhrvppeyudblcwzvin.supabase.co",
  database: "postgres",
  user: "supabase_admin",
  password: process.env.SUPABASE_SERVICE_KEY,
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const client = await pool.connect();
    console.log("Connected");

    // Drop old constraint and add new one with region
    await client.query(`
      ALTER TABLE rankings DROP CONSTRAINT IF EXISTS rankings_fighter_username_body_key;
      ALTER TABLE rankings ADD CONSTRAINT rankings_fighter_username_body_region_key UNIQUE (fighter_username, body, region);
    `);
    console.log("Constraint updated successfully");

    client.release();
  } catch (err: any) {
    console.error("Failed:", err.message);
  } finally {
    await pool.end();
  }
}

main();
