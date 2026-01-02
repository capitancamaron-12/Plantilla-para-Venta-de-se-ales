import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, connectDatabase } from "../server/db";
import { users } from "../shared/models/auth";
import { eq } from "drizzle-orm";

async function createTestUser() {
  await connectDatabase();

  const email = "test@example.com";
  const password = "test123456";

  try {
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      console.log(`User with email ${email} already exists`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName: "Test",
      lastName: "User",
      isVerified: "true",
    }).returning();

    console.log(`Test user created successfully:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error("Error creating test user:", error);
    process.exit(1);
  }
}

createTestUser();
