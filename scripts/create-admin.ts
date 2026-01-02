import bcrypt from "bcryptjs";
import { db } from "../server/db";
import { admins } from "../shared/models/auth";
import { eq } from "drizzle-orm";

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Error: ADMIN_EMAIL y ADMIN_PASSWORD son requeridos");
    console.log("Uso: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secreto npm run create-admin");
    process.exit(1);
  }

  try {
    const existing = await db.select().from(admins).where(eq(admins.email, email));
    if (existing.length > 0) {
      console.log(`Admin con email ${email} ya existe`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [admin] = await db.insert(admins).values({
      email,
      password: hashedPassword,
    }).returning();

    console.log(`Admin creado exitosamente:`);
    console.log(`  ID: ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    process.exit(0);
  } catch (error) {
    console.error("Error al crear admin:", error);
    process.exit(1);
  }
}

createAdmin();
