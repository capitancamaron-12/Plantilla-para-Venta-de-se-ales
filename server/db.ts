import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("[Database] DATABASE_URL is required");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(client);

export async function connectDatabase() {
  try {
    await client.connect();
    console.log("[Database] Connected successfully");
  } catch (error: any) {
    console.error("[Database] Connection failed:", error?.message || error);
    process.exit(1);
  }
}

export { db };
