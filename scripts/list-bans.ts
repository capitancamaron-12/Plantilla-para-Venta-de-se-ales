import "dotenv/config";
import { db, connectDatabase } from "../server/db";
import { ipBansLevel1, ipBansLevel2, ipBansLevel3, ipBansPermanent } from "@shared/schema";

async function listAllBans(): Promise<void> {
  await connectDatabase();
  try {
    console.log("\n📊 BANES EN LA BASE DE DATOS\n");

    const level1 = await db.select().from(ipBansLevel1);
    console.log("🔴 LEVEL 1 (5 segundos):");
    if (level1.length === 0) {
      console.log("  └─ (vacío)");
    } else {
      level1.forEach((ban, i) => {
        const expired = ban.bannedUntil < new Date() ? " [EXPIRADO]" : "";
        console.log(`  ${i + 1}. IP: ${ban.ipAddress} | Code: ${ban.banCode} | Until: ${ban.bannedUntil}${expired}`);
      });
    }

    const level2 = await db.select().from(ipBansLevel2);
    console.log("\n🟠 LEVEL 2 (10 segundos):");
    if (level2.length === 0) {
      console.log("  └─ (vacío)");
    } else {
      level2.forEach((ban, i) => {
        const expired = ban.bannedUntil < new Date() ? " [EXPIRADO]" : "";
        console.log(`  ${i + 1}. IP: ${ban.ipAddress} | Code: ${ban.banCode} | Until: ${ban.bannedUntil}${expired}`);
      });
    }

    const level3 = await db.select().from(ipBansLevel3);
    console.log("\n🟡 LEVEL 3 (20 segundos):");
    if (level3.length === 0) {
      console.log("  └─ (vacío)");
    } else {
      level3.forEach((ban, i) => {
        const expired = ban.bannedUntil < new Date() ? " [EXPIRADO]" : "";
        console.log(`  ${i + 1}. IP: ${ban.ipAddress} | Code: ${ban.banCode} | Until: ${ban.bannedUntil}${expired}`);
      });
    }

    const permanent = await db.select().from(ipBansPermanent);
    console.log("\n⛔ PERMANENTE:");
    if (permanent.length === 0) {
      console.log("  └─ (vacío)");
    } else {
      permanent.forEach((ban, i) => {
        console.log(`  ${i + 1}. IP: ${ban.ipAddress} | Code: ${ban.banCode}`);
      });
    }

    const total = level1.length + level2.length + level3.length + permanent.length;
    console.log(`\n📈 Total: ${total} bano(s)\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

listAllBans();
