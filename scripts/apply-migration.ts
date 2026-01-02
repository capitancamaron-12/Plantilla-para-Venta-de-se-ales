import { db, connectDatabase } from "../server/db";
import { sql } from "drizzle-orm";

async function runMigration() {
  try {
    console.log("Connecting to database...");
    await connectDatabase();
    
    console.log("Applying migration: Add cybertemp_id column to emails...");
    
    await db.execute(sql`
      ALTER TABLE "emails" ADD COLUMN "cybertemp_id" text
    `);
    
    console.log("✓ Migration applied successfully!");
    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes("already exists") || error.detail?.includes("bereits vorhanden")) {
      console.log("✓ Column already exists, skipping...");
      process.exit(0);
    }
    console.error("✗ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
