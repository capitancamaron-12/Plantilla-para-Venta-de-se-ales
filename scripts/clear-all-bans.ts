import "dotenv/config";
import { db, connectDatabase } from "../server/db";
import { ipBansLevel1, ipBansLevel2, ipBansLevel3, ipBansPermanent } from "@shared/schema";

async function clearAllBans(): Promise<void> {
  await connectDatabase();
  try {
    console.log("\n🗑️  Limpiando todos los banos...\n");

    const deleted1 = await db.delete(ipBansLevel1);
    console.log("✅ Level 1: borrados");

    const deleted2 = await db.delete(ipBansLevel2);
    console.log("✅ Level 2: borrados");

    const deleted3 = await db.delete(ipBansLevel3);
    console.log("✅ Level 3: borrados");

    const deletedPerm = await db.delete(ipBansPermanent);
    console.log("✅ Permanentes: borrados");

    console.log("\n🎉 Todos los banos han sido limpiados!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

clearAllBans();
