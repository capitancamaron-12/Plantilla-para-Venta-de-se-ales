import { db, connectDatabase } from "../server/db";
import { sql } from "drizzle-orm";

async function createBanTables() {
  try {
    await connectDatabase();
    
    console.log("Creating ip_bans_level1 table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ip_bans_level1" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ip_address" text NOT NULL UNIQUE,
        "ban_code" varchar NOT NULL,
        "banned_until" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    console.log("Creating ip_bans_level2 table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ip_bans_level2" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ip_address" text NOT NULL UNIQUE,
        "ban_code" varchar NOT NULL,
        "banned_until" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    console.log("Creating ip_bans_level3 table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ip_bans_level3" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ip_address" text NOT NULL UNIQUE,
        "ban_code" varchar NOT NULL,
        "banned_until" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    console.log("Creating ip_bans_permanent table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ip_bans_permanent" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ip_address" text NOT NULL UNIQUE,
        "ban_code" varchar NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    console.log("Creating indexes...");
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ip_bans_level1_ip ON "ip_bans_level1"("ip_address")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ip_bans_level2_ip ON "ip_bans_level2"("ip_address")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ip_bans_level3_ip ON "ip_bans_level3"("ip_address")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ip_bans_permanent_ip ON "ip_bans_permanent"("ip_address")`);

    console.log("✅ All ban tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    process.exit(1);
  }
}

createBanTables();
