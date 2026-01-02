import { db } from "../server/db.js";
import { sql } from "drizzle-orm";
import fs from "fs";

async function runMigration() {
  try {
    const query = fs.readFileSync("migrations/0002_create_admin_logs.sql", "utf-8");
    await db.execute(sql.raw(query));
    console.log("✅ admin_logs table created successfully");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
