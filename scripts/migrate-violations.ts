import { db, connectDatabase } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  try {
    await connectDatabase();
    
    console.log("Creating ip_violations table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ip_violations" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "ip_address" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    
    console.log("Creating index for ip_violations...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_ip_violations_ip_address ON "ip_violations"("ip_address")
    `);
    
    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
