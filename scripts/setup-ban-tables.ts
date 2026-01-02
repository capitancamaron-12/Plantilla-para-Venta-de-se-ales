import { Pool } from "pg";

async function createBanTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    console.log("✅ Connected to database");

    const queries = [
      `CREATE TABLE IF NOT EXISTS "ip_bans_level1" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ip_address" text NOT NULL UNIQUE,
        "ban_code" varchar NOT NULL,
        "banned_until" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS "ip_bans_level2" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ip_address" text NOT NULL UNIQUE,
        "ban_code" varchar NOT NULL,
        "banned_until" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS "ip_bans_level3" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ip_address" text NOT NULL UNIQUE,
        "ban_code" varchar NOT NULL,
        "banned_until" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS "ip_bans_permanent" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ip_address" text NOT NULL UNIQUE,
        "ban_code" varchar NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );`,
      `CREATE INDEX IF NOT EXISTS idx_ip_bans_level1_ip ON "ip_bans_level1"("ip_address");`,
      `CREATE INDEX IF NOT EXISTS idx_ip_bans_level2_ip ON "ip_bans_level2"("ip_address");`,
      `CREATE INDEX IF NOT EXISTS idx_ip_bans_level3_ip ON "ip_bans_level3"("ip_address");`,
      `CREATE INDEX IF NOT EXISTS idx_ip_bans_permanent_ip ON "ip_bans_permanent"("ip_address");`,
    ];

    for (const sql of queries) {
      try {
        await client.query(sql);
        console.log("✅", sql.substring(0, 50) + "...");
      } catch (err: any) {
        if (err.code !== "42P07") {
          console.error("Error:", err.message);
        }
      }
    }

    client.release();
    console.log("\n✅ Tables ready!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createBanTables();
