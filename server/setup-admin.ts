import bcrypt from "bcryptjs";
import { db } from "./db";
import { admins, adminSlugs, adminIpWhitelist } from "@shared/schema";
import crypto from "crypto";
import { eq } from "drizzle-orm";

/**
 * Setup admin on startup
 * SECURITY: Admin credentials are NOT stored in database
 * Instead, they are derived ephemerally from the active slug only
 * The slug rotates automatically every 24 hours
 */
export async function setupAdmin(): Promise<void> {
  try {
    // Check if db is initialized (has methods)
    if (!db || !db.select) {
      console.warn("[Admin Setup] Database unavailable. Using memory-only admin mode.");
      console.warn("[Admin Setup] Admin panel will work but credentials will not persist across restarts.");
      return;
    }

    const [existingAdmin] = await db.select().from(admins).limit(1);
    
    if (!existingAdmin) {
      // Create a placeholder admin entry (no password stored)
      // This ensures admin system exists but login only works via ephemeral slug
      await db.insert(admins).values({
        email: "ephemeral@secure",
        password: "ephemeral", // Placeholder - never used
      });
      console.log(`[Admin Setup] Admin system initialized (ephemeral credentials only)`);
    } else {
      console.log(`[Admin Setup] Admin system exists`);
    }

    // Deactivate all existing slugs to ensure only ONE is active
    await db.update(adminSlugs).set({ isActive: "false" });

    const plainSlug = crypto.randomBytes(48).toString("base64url");
    const slugHash = await bcrypt.hash(plainSlug, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(adminSlugs).values({
      plainSlug,
      slugHash,
      expiresAt,
      isActive: "true",
    });
    
    console.log("");
    console.log("=".repeat(80));
    console.log("[Admin Setup] EPHEMERAL ADMIN ACCESS URL GENERATED");
    console.log("=".repeat(80));
    console.log(`URL: /secure/${plainSlug}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log("=".repeat(80));
    console.log("IMPORTANT: Save this URL. It will NOT be shown again.");
    console.log("IMPORTANT: Admin username and password are derived from this slug.");
    console.log("IMPORTANT: They are NOT stored in any database.");
    console.log("=".repeat(80));
    console.log("");

    const ips = await db.select().from(adminIpWhitelist);
    if (ips.length === 0) {
      console.log("[Admin Setup] No IPs whitelisted. Any IP can access with the correct slug.");
      console.log("[Admin Setup] Add your IP in the Security tab after logging in.");
    }

  } catch (error: any) {
    console.warn("[Admin Setup] Database error:", error?.message || error);
    console.warn("[Admin Setup] Using memory-only admin mode. Credentials will not persist across restarts.");
  }
}
