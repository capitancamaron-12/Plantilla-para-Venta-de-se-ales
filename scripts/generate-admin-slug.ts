import { generateNewSlug, deriveCredentialsFromSlug } from "../server/slug-service.js";

async function generateSlug() {
  try {
    const result = await generateNewSlug();

    // Derive credentials from the slug
    const credentials = deriveCredentialsFromSlug(result.slug);

    console.log("\n✅ New Admin Slug Generated:");
    console.log(`\nSlug: ${result.slug}`);
    console.log(`Access URL: /secure/${result.slug}`);
    console.log(`\n📋 Temporary Credentials (valid only with this slug):`);
    console.log(`Username: ${credentials.username}`);
    console.log(`Password: ${credentials.password}`);
    console.log(`\nExpires at: ${result.expiresAt.toISOString()}\n`);
    process.exit(0);
  } catch (error) {
    console.error("Error generating slug:", error);
    process.exit(1);
  }
}

generateSlug();
