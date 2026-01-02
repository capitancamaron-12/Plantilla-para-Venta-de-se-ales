import { db } from "../server/db";
import { adminSlugs } from "../shared/models/auth";
import { eq, gt, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function getActiveSlug() {
  try {
    const [slug] = await db.select().from(adminSlugs)
      .where(and(eq(adminSlugs.isActive, "true"), gt(adminSlugs.expiresAt, sql`NOW()`)))
      .orderBy(adminSlugs.createdAt)
      .limit(1);

    if (!slug) {
      console.log("No active slug found. Run the application first to generate one.");
      process.exit(0);
    }

    console.log(`Active Admin Slug: ${slug.plainSlug}`);
    console.log(`Expires at: ${slug.expiresAt}`);
    console.log(`Admin Login URL: /secure/${slug.plainSlug}`);
    process.exit(0);
  } catch (error) {
    console.error("Error getting admin slug:", error);
    process.exit(1);
  }
}

getActiveSlug();
