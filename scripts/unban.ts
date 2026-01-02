import "dotenv/config";
import { db, connectDatabase } from "../server/db";
import { ipBansLevel1, ipBansLevel2, ipBansLevel3, ipBansPermanent } from "@shared/schema";
import { eq } from "drizzle-orm";

async function unbanByCodeOrIp(identifier: string): Promise<void> {
  await connectDatabase();
  
  const isIp = identifier.includes(':') || identifier.includes('.');
  const searchField = isIp ? 'IP' : 'code';
  console.log(`\n🔍 Buscando banos por ${searchField}: ${identifier}\n`);

  const unbannedIps: string[] = [];

  try {
    let whereClause = isIp ? eq(ipBansLevel1.ipAddress, identifier) : eq(ipBansLevel1.banCode, identifier);
    const level1Results = await db.select().from(ipBansLevel1).where(whereClause);
    if (level1Results.length > 0) {
      console.log(`✓ Level 1: encontrado ${level1Results.length} ban(s)`);
      for (const ban of level1Results) {
        unbannedIps.push(ban.ipAddress);
        console.log(`  - Eliminando: ${ban.ipAddress} (código: ${ban.banCode})`);
      }
      await db.delete(ipBansLevel1).where(whereClause);
    }

    whereClause = isIp ? eq(ipBansLevel2.ipAddress, identifier) : eq(ipBansLevel2.banCode, identifier);
    const level2Results = await db.select().from(ipBansLevel2).where(whereClause);
    if (level2Results.length > 0) {
      console.log(`✓ Level 2: encontrado ${level2Results.length} ban(s)`);
      for (const ban of level2Results) {
        unbannedIps.push(ban.ipAddress);
        console.log(`  - Eliminando: ${ban.ipAddress} (código: ${ban.banCode})`);
      }
      await db.delete(ipBansLevel2).where(whereClause);
    }

    whereClause = isIp ? eq(ipBansLevel3.ipAddress, identifier) : eq(ipBansLevel3.banCode, identifier);
    const level3Results = await db.select().from(ipBansLevel3).where(whereClause);
    if (level3Results.length > 0) {
      console.log(`✓ Level 3: encontrado ${level3Results.length} ban(s)`);
      for (const ban of level3Results) {
        unbannedIps.push(ban.ipAddress);
        console.log(`  - Eliminando: ${ban.ipAddress} (código: ${ban.banCode})`);
      }
      await db.delete(ipBansLevel3).where(whereClause);
    }

    whereClause = isIp ? eq(ipBansPermanent.ipAddress, identifier) : eq(ipBansPermanent.banCode, identifier);
    const permanentResults = await db.select().from(ipBansPermanent).where(whereClause);
    if (permanentResults.length > 0) {
      console.log(`✓ PERMANENTE: encontrado ${permanentResults.length} ban(s)`);
      for (const ban of permanentResults) {
        unbannedIps.push(ban.ipAddress);
        console.log(`  - Eliminando: ${ban.ipAddress} (código: ${ban.banCode})`);
      }
      await db.delete(ipBansPermanent).where(whereClause);
    }

    if (unbannedIps.length === 0) {
      console.log(`\n❌ No se encontró ningún baneo con ${searchField}: ${identifier}\n`);
      process.exit(1);
    } else {
      console.log(`\n✅ Baneo(s) eliminado(s) exitosamente!`);
      const uniqueIps = Array.from(new Set(unbannedIps));
      console.log(`📋 IPs desbaneadas: ${uniqueIps.join(", ")}\n`);
      process.exit(0);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

const identifier = process.argv[2];
if (!identifier) {
  console.log("Uso: npm run unban <BAN_CODE_O_IP>");
  console.log("Ejemplos:");
  console.log("  npm run unban ABC123      (por código de ban)");
  console.log("  npm run unban ::1         (por dirección IP)");
  console.log("  npm run unban 192.168.1.1 (por dirección IP)");
  process.exit(1);
}

const searchTerm = identifier.includes(':') || identifier.includes('.') ? identifier : identifier.toUpperCase();
unbanByCodeOrIp(searchTerm);
