import { storage } from "./storage";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SLUG_EXPIRY_HOURS = parseInt(process.env.ADMIN_SLUG_EXPIRY_HOURS || "24", 10);
const SLUG_LENGTH = 48; // 48 bytes for 64 chars in base64url

/**
 * SECURITY: Credentials are NEVER stored anywhere
 * They are derived deterministically from the slug using HMAC
 * This ensures admin can only login with the exact current slug
 */
function generateSecureSlug(): string {
  return crypto.randomBytes(SLUG_LENGTH).toString("base64url");
}

async function hashSlug(slug: string): Promise<string> {
  return bcrypt.hash(slug, 10);
}

/**
 * Derive credentials from slug - deterministic and ephemeral
 * IMPORTANT: These credentials ONLY work with the active slug
 * Every time slug rotates, new credentials are generated
 */
export function deriveCredentialsFromSlug(slug: string): { username: string; password: string } {
  const usernameHash = crypto.createHmac('sha256', slug).update('username-salt').digest('hex').slice(0, 12);
  const passwordHash = crypto.createHmac('sha256', slug).update('password-salt').digest('hex').slice(0, 16);
  
  return {
    username: `admin_${usernameHash}`,
    password: passwordHash
  };
}

/**
 * Verify if a slug is valid (just the slug, no credentials check)
 */
export async function verifySlug(slug: string): Promise<boolean> {
  const activeSlug = await storage.getActiveAdminSlug();
  if (!activeSlug) {
    return false;
  }

  const isValid = await bcrypt.compare(slug, activeSlug.slugHash);
  return isValid;
}

/**
 * Verify if provided credentials match the active slug
 * Returns true only if:
 * 1. The slug itself is valid (matches bcrypt hash)
 * 2. The username and password match the derived credentials
 */
export async function verifyAdminCredentials(
  slug: string,
  username: string,
  password: string
): Promise<boolean> {
  const activeSlug = await storage.getActiveAdminSlug();
  if (!activeSlug) {
    return false;
  }

  // Verify the slug itself is valid
  const slugValid = await bcrypt.compare(slug, activeSlug.slugHash);
  if (!slugValid) {
    return false;
  }

  // Get expected credentials from the slug
  const expectedCreds = deriveCredentialsFromSlug(slug);

  // Verify username and password match
  const credentialsValid =
    username === expectedCreds.username &&
    password === expectedCreds.password;

  return credentialsValid;
}

export async function generateNewSlug(): Promise<{ slug: string; expiresAt: Date; slugId: string }> {
  // CRITICAL: Deactivate ALL other slugs to ensure only ONE is functional
  await storage.deactivateAllSlugs();

  let plainSlug: string;
  let attempts = 0;
  const maxAttempts = 10;

  // Ensure uniqueness: generate until we get a slug not in active slugs
  do {
    plainSlug = generateSecureSlug();
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error("Failed to generate unique slug after maximum attempts");
    }
  } while (await storage.isSlugActive(plainSlug));

  const slugHash = await hashSlug(plainSlug);
  const expiresAt = new Date(Date.now() + SLUG_EXPIRY_HOURS * 60 * 60 * 1000);

  const newSlug = await storage.createAdminSlug({
    plainSlug,
    slugHash,
    expiresAt,
    isActive: "true",
    notifiedAt: null,
  });

  console.log("[Slug Service] New unique slug generated - all previous slugs deactivated");

  return { slug: plainSlug, expiresAt, slugId: newSlug.id };
}

export async function getActiveSlugInfo(): Promise<{
  expiresAt: Date;
  createdAt: Date;
  needsNotification: boolean;
} | null> {
  const activeSlug = await storage.getActiveAdminSlug();
  if (!activeSlug) return null;
  return {
    expiresAt: activeSlug.expiresAt,
    createdAt: (activeSlug as any).createdAt || new Date(),
    needsNotification: !activeSlug.notifiedAt,
  };
}

export async function checkAndRotateSlug(): Promise<{ rotated: boolean; newSlug?: string; expiresAt?: Date; slugId?: string }> {
  const activeSlug = await storage.getActiveAdminSlug();
  const now = new Date();
  
  if (!activeSlug || new Date(activeSlug.expiresAt) <= now) {
    const result = await generateNewSlug();
    return { rotated: true, newSlug: result.slug, expiresAt: result.expiresAt, slugId: result.slugId };
  }
  
  return { rotated: false };
}

export async function markSlugAsNotified(slugId: string): Promise<void> {
  await storage.markSlugNotified(slugId);
}

let rotationInterval: NodeJS.Timeout | null = null;

/**
 * Start the slug rotation mechanism
 * - Checks every minute if slug needs rotation
 * - Requires database to be functional
 * - Returns a promise that resolves when initial slug is ready
 * - Throws if database is unavailable (no fallback)
 */
export async function startSlugRotation(onRotate: (slug: string, expiresAt: Date, slugId: string) => void): Promise<void> {
  const checkInterval = 60 * 1000; // Check every minute

  // Initialize: check and rotate if needed
  const result = await checkAndRotateSlug();
  if (result.rotated && result.newSlug && result.expiresAt && result.slugId) {
    console.log(`[Admin Security] Database slug generated at startup`);
    onRotate(result.newSlug, result.expiresAt, result.slugId);
  } else {
    // Active slug exists - show its credentials
    const activeSlug = await storage.getActiveAdminSlug();
    if (activeSlug && activeSlug.plainSlug) {
      console.log(`[Admin Security] Active database slug found at startup`);
      onRotate(activeSlug.plainSlug, activeSlug.expiresAt, activeSlug.id);
    }
  }

  // Check and rotate periodically
  rotationInterval = setInterval(async () => {
    try {
      const result = await checkAndRotateSlug();
      if (result.rotated && result.newSlug && result.expiresAt && result.slugId) {
        console.log(`[Admin Security] Database slug rotated automatically`);
        onRotate(result.newSlug, result.expiresAt, result.slugId);
      }
    } catch (error: any) {
      console.error(`[Admin Security] CRITICAL: Slug rotation failed -`, error.message);
      // Log but don't crash - next check might succeed
    }
  }, checkInterval);
}

export function stopSlugRotation(): void {
  if (rotationInterval) {
    clearInterval(rotationInterval);
    rotationInterval = null;
  }
}
