import { type Inbox, type InsertInbox, type Email, type InsertEmail, type User, type InsertUser, type Admin, type InsertAdmin, type AdminSlug, type InsertAdminSlug, type AdminIp, type InsertAdminIp, type EmailDomain, type InsertEmailDomain, type SavedInbox, type InsertSavedInbox, type UserSubscription, type InsertUserSubscription, type SubscriptionTransaction, type InsertSubscriptionTransaction, type TempEmail, type InsertTempEmail, type CybertempSubdomain, type InsertCybertempSubdomain, type AdSlot, type AnyIpBan, type IpBanPermanent } from "@shared/schema";
import { db } from "./db";
import { inboxes, emails, users, admins, adminSlugs, adminLogs, adminIpWhitelist, emailDomains, savedInboxes, userSubscriptions, subscriptionTransactions, tempEmails, cybertempSubdomains, adSlots, blockedIps, ipBansLevel1, ipBansLevel2, ipBansLevel3, ipBansPermanent } from "@shared/schema";
import { eq, desc, and, gt, lt, sql, count, or, inArray } from "drizzle-orm";
import type { InsertAdminLog, AdminLog } from "@shared/models/auth";

export interface IStorage {
  createInbox(inbox: InsertInbox): Promise<Inbox>;
  getInbox(id: string): Promise<Inbox | undefined>;
  getInboxByEmail(email: string): Promise<Inbox | undefined>;
  deleteExpiredInboxes(): Promise<void>;
  
  createEmail(email: InsertEmail): Promise<Email>;
  getEmailsByInboxId(inboxId: string): Promise<Email[]>;
  markEmailAsRead(id: string): Promise<void>;
  deleteEmail(id: string): Promise<void>;

  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUserVerification(userId: string, code: string, expires: Date): Promise<void>;
  verifyUser(userId: string): Promise<void>;
  getUserByVerificationCode(code: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  private tablesInitialized = false;
  private adSlotsInitialized = false;

  async ensureBanTablesExist(): Promise<void> {
    if (this.tablesInitialized) return;

    try {
      const tables = [
        { name: "ip_bans_level1", sql: `CREATE TABLE IF NOT EXISTS "ip_bans_level1" ("id" varchar PRIMARY KEY DEFAULT gen_random_uuid(), "ip_address" text NOT NULL UNIQUE, "ban_code" varchar NOT NULL, "banned_until" timestamp NOT NULL, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now());` },
        { name: "ip_bans_level2", sql: `CREATE TABLE IF NOT EXISTS "ip_bans_level2" ("id" varchar PRIMARY KEY DEFAULT gen_random_uuid(), "ip_address" text NOT NULL UNIQUE, "ban_code" varchar NOT NULL, "banned_until" timestamp NOT NULL, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now());` },
        { name: "ip_bans_level3", sql: `CREATE TABLE IF NOT EXISTS "ip_bans_level3" ("id" varchar PRIMARY KEY DEFAULT gen_random_uuid(), "ip_address" text NOT NULL UNIQUE, "ban_code" varchar NOT NULL, "banned_until" timestamp NOT NULL, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now());` },
        { name: "ip_bans_permanent", sql: `CREATE TABLE IF NOT EXISTS "ip_bans_permanent" ("id" varchar PRIMARY KEY DEFAULT gen_random_uuid(), "ip_address" text NOT NULL UNIQUE, "ban_code" varchar NOT NULL, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now());` },
      ];

      for (const table of tables) {
        try {
          await db.execute(sql.raw(table.sql));
          console.log(`[Storage] Table ${table.name} ready`);
        } catch (err: any) {
          if (!err.message.includes("already exists")) {
            console.error(`[Storage] Error creating ${table.name}:`, err.message);
          }
        }
      }

      this.tablesInitialized = true;
    } catch (error) {
      console.error("[Storage] Error ensuring ban tables:", error);
    }
  }

  async createInbox(insertInbox: InsertInbox): Promise<Inbox> {
    const [inbox] = await db.insert(inboxes).values(insertInbox).returning();
    return inbox;
  }

  async getInbox(id: string): Promise<Inbox | undefined> {
    const [inbox] = await db.select().from(inboxes).where(eq(inboxes.id, id));
    return inbox;
  }

  async getInboxByEmail(email: string): Promise<Inbox | undefined> {
    const [inbox] = await db.select().from(inboxes).where(eq(inboxes.email, email));
    return inbox;
  }

  async deleteExpiredInboxes(): Promise<void> {
    // Keep expired inboxes to prevent reuse of email addresses.
    return;
  }

  async ensureAdSlotsTableExists(): Promise<void> {
    if (this.adSlotsInitialized) return;

    const createSql = `CREATE TABLE IF NOT EXISTS "ad_slots" (
      "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      "slot" varchar NOT NULL UNIQUE,
      "html" text NOT NULL,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    );`;

    try {
      await db.execute(sql.raw(createSql));
      this.adSlotsInitialized = true;
    } catch (error) {
      console.error("[Storage] Error ensuring ad_slots table:", error);
    }
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const [email] = await db.insert(emails).values(insertEmail).returning();
    return email;
  }

  async getEmailsByInboxId(inboxId: string): Promise<Email[]> {
    return db.select().from(emails).where(eq(emails.inboxId, inboxId)).orderBy(desc(emails.receivedAt));
  }

  async markEmailAsRead(id: string): Promise<void> {
    await db.update(emails).set({ isRead: 1 }).where(eq(emails.id, id));
  }

  async deleteEmail(id: string): Promise<void> {
    await db.delete(emails).where(eq(emails.id, id));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserVerification(userId: string, code: string, expires: Date): Promise<void> {
    await db.update(users).set({ 
      verificationCode: code, 
      verificationCodeExpires: expires 
    }).where(eq(users.id, userId));
  }

  async verifyUser(userId: string): Promise<void> {
    await db.update(users).set({ 
      isVerified: "true",
      verificationCode: null,
      verificationCodeExpires: null 
    }).where(eq(users.id, userId));
  }

  async getUserByVerificationCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationCode, code));
    return user;
  }

  async updateUserUsagePurpose(userId: string, purpose: string, notes?: string): Promise<void> {
    await db.update(users).set({ 
      usagePurpose: purpose,
      usagePurposeNotes: notes || null
    }).where(eq(users.id, userId));
  }

  async getUsagePurposeStats(): Promise<{ purpose: string; count: number }[]> {
    const result = await db
      .select({
        purpose: users.usagePurpose,
        count: count()
      })
      .from(users)
      .groupBy(users.usagePurpose);
    
    return result.map((r: any) => ({
      purpose: r.purpose || 'not_set',
      count: Number(r.count)
    }));
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }

  async getAdminById(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async updateAdminTwoFactor(adminId: string, secret: string | null, enabled: string): Promise<void> {
    await db.update(admins).set({ 
      twoFactorSecret: secret,
      twoFactorEnabled: enabled
    }).where(eq(admins.id, adminId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllInboxes(): Promise<Inbox[]> {
    return db.select().from(inboxes).orderBy(desc(inboxes.createdAt));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async createAdminSlug(insertSlug: InsertAdminSlug): Promise<AdminSlug> {
    const [slug] = await db.insert(adminSlugs).values(insertSlug).returning();
    return slug;
  }

  async getActiveAdminSlug(): Promise<AdminSlug | undefined> {
    await db.update(adminSlugs)
      .set({ isActive: "false" })
      .where(and(eq(adminSlugs.isActive, "true"), lt(adminSlugs.expiresAt, sql`NOW()`)));
    
    const [slug] = await db.select().from(adminSlugs)
      .where(and(eq(adminSlugs.isActive, "true"), gt(adminSlugs.expiresAt, sql`NOW()`)))
      .orderBy(desc(adminSlugs.createdAt))
      .limit(1);
    return slug;
  }

  async deactivateAllSlugs(): Promise<void> {
    await db.update(adminSlugs).set({ isActive: "false" });
  }

  async isSlugActive(plainSlug: string): Promise<boolean> {
    const [slug] = await db.select().from(adminSlugs).where(and(eq(adminSlugs.plainSlug, plainSlug), eq(adminSlugs.isActive, "true")));
    return !!slug;
  }

  async markSlugNotified(id: string): Promise<void> {
    await db.update(adminSlugs).set({ notifiedAt: new Date() }).where(eq(adminSlugs.id, id));
  }

  async createAdminIp(insertIp: InsertAdminIp): Promise<AdminIp> {
    const [ip] = await db.insert(adminIpWhitelist).values(insertIp).returning();
    return ip;
  }

  async getAllAdminIps(): Promise<AdminIp[]> {
    return db.select().from(adminIpWhitelist).orderBy(desc(adminIpWhitelist.createdAt));
  }

  async deleteAdminIp(id: string): Promise<void> {
    await db.delete(adminIpWhitelist).where(eq(adminIpWhitelist.id, id));
  }

  async isIpWhitelisted(ipAddress: string): Promise<boolean> {
    const ips = await this.getAllAdminIps();
    if (ips.length === 0) return true;
    return ips.some(ip => ip.ipAddress === ipAddress);
  }

  async createEmailDomain(insertDomain: InsertEmailDomain): Promise<EmailDomain> {
    const [domain] = await db.insert(emailDomains).values(insertDomain).returning();
    return domain;
  }

  async getAllEmailDomains(): Promise<EmailDomain[]> {
    return db.select().from(emailDomains).orderBy(desc(emailDomains.createdAt));
  }

  async getActiveEmailDomains(): Promise<EmailDomain[]> {
    return db.select().from(emailDomains).where(eq(emailDomains.isActive, "true")).orderBy(desc(emailDomains.createdAt));
  }

  async updateEmailDomain(id: string, isActive: string): Promise<void> {
    await db.update(emailDomains).set({ isActive }).where(eq(emailDomains.id, id));
  }

  async deleteEmailDomain(id: string): Promise<void> {
    await db.delete(emailDomains).where(eq(emailDomains.id, id));
  }

  async createSavedInbox(insertSavedInbox: InsertSavedInbox): Promise<SavedInbox> {
    const [savedInbox] = await db.insert(savedInboxes).values(insertSavedInbox).returning();
    return savedInbox;
  }

  async getSavedInboxesByUserId(userId: string): Promise<(SavedInbox & { inbox: Inbox })[]> {
    const results = await db
      .select()
      .from(savedInboxes)
      .innerJoin(inboxes, eq(savedInboxes.inboxId, inboxes.id))
      .where(eq(savedInboxes.userId, userId))
      .orderBy(desc(savedInboxes.createdAt));
    
    return results.map((r: any) => ({
      ...r.saved_inboxes,
      inbox: r.inboxes
    }));
  }

  async getSavedInboxCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(savedInboxes)
      .where(eq(savedInboxes.userId, userId));
    return result?.count || 0;
  }

  async getSavedInboxById(id: string): Promise<SavedInbox | undefined> {
    const [savedInbox] = await db.select().from(savedInboxes).where(eq(savedInboxes.id, id));
    return savedInbox;
  }

  async updateSavedInboxAlias(id: string, alias: string): Promise<void> {
    await db.update(savedInboxes).set({ alias }).where(eq(savedInboxes.id, id));
  }

  async deleteSavedInbox(id: string): Promise<void> {
    await db.delete(savedInboxes).where(eq(savedInboxes.id, id));
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return subscription;
  }

  async createOrUpdateSubscription(userId: string, data: Partial<InsertUserSubscription>): Promise<UserSubscription> {
    const existing = await this.getUserSubscription(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userSubscriptions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userSubscriptions.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userSubscriptions)
        .values({ userId, ...data })
        .returning();
      return created;
    }
  }

  async createSubscriptionTransaction(transaction: InsertSubscriptionTransaction): Promise<SubscriptionTransaction> {
    const [created] = await db.insert(subscriptionTransactions).values(transaction).returning();
    return created;
  }

  async getTransactionByPaymentId(paymentId: string): Promise<SubscriptionTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.paymentId, paymentId));
    return transaction;
  }

  async isUserPremium(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;
    if (subscription.tier !== "premium") return false;
    if (subscription.status !== "active") return false;
    if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
      await this.createOrUpdateSubscription(userId, { status: "expired", tier: "free" });
      return false;
    }
    return true;
  }

  async makeInboxPermanent(inboxId: string): Promise<void> {
    const [inbox] = await db.select().from(inboxes).where(eq(inboxes.id, inboxId));
    if (!inbox) {
      throw new Error("Inbox not found");
    }
    if (!inbox.ownerUserId) {
      console.error(`Attempted to make inbox ${inboxId} permanent without owner`);
      throw new Error("Cannot make inbox permanent without owner");
    }
    await db.update(inboxes).set({ 
      expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
    }).where(eq(inboxes.id, inboxId));
  }

  async createTempEmail(insertTempEmail: InsertTempEmail): Promise<TempEmail> {
    const [tempEmail] = await db.insert(tempEmails).values(insertTempEmail).returning();
    return tempEmail;
  }

  async getTempEmailByEmail(email: string): Promise<TempEmail | undefined> {
    const [tempEmail] = await db.select().from(tempEmails).where(eq(tempEmails.email, email));
    return tempEmail;
  }

  async getAllTempEmails(): Promise<TempEmail[]> {
    return db.select().from(tempEmails).orderBy(desc(tempEmails.createdAt));
  }

  async deleteTempEmail(id: string): Promise<void> {
    await db.delete(tempEmails).where(eq(tempEmails.id, id));
  }

  async updateTempEmailStatus(id: string, status: string): Promise<void> {
    await db.update(tempEmails).set({ status }).where(eq(tempEmails.id, id));
  }

  async createCybertempSubdomain(insertSubdomain: InsertCybertempSubdomain): Promise<CybertempSubdomain> {
    const [subdomain] = await db.insert(cybertempSubdomains).values(insertSubdomain).returning();
    return subdomain;
  }

  async getCybertempSubdomains(): Promise<CybertempSubdomain[]> {
    return db.select().from(cybertempSubdomains).orderBy(desc(cybertempSubdomains.createdAt));
  }

  async getCybertempSubdomainsByDomain(domain: string): Promise<CybertempSubdomain[]> {
    return db.select().from(cybertempSubdomains).where(eq(cybertempSubdomains.domain, domain)).orderBy(desc(cybertempSubdomains.createdAt));
  }

  async deleteCybertempSubdomain(id: string): Promise<void> {
    await db.delete(cybertempSubdomains).where(eq(cybertempSubdomains.id, id));
  }

  async updateCybertempSubdomainStatus(id: string, status: string): Promise<void> {
    await db.update(cybertempSubdomains).set({ status }).where(eq(cybertempSubdomains.id, id));
  }

  async getCybertempSubdomainBySubdomainAndDomain(subdomain: string, domain: string): Promise<CybertempSubdomain | undefined> {
    const [record] = await db.select().from(cybertempSubdomains).where(and(eq(cybertempSubdomains.subdomain, subdomain), eq(cybertempSubdomains.domain, domain)));
    return record;
  }

  async getAdSlots(): Promise<AdSlot[]> {
    await this.ensureAdSlotsTableExists();
    return db.select().from(adSlots).orderBy(desc(adSlots.updatedAt));
  }

  async getActiveAdSlotsByKeys(slots?: string[]): Promise<AdSlot[]> {
    await this.ensureAdSlotsTableExists();
    let query = db.select().from(adSlots).where(eq(adSlots.isActive, true));
    if (slots && slots.length > 0) {
      query = query.where(inArray(adSlots.slot, slots)) as any;
    }
    return query.orderBy(desc(adSlots.updatedAt));
  }

  async upsertAdSlot(data: { slot: string; html: string; isActive: boolean }): Promise<AdSlot> {
    await this.ensureAdSlotsTableExists();
    const [record] = await db
      .insert(adSlots)
      .values({
        slot: data.slot,
        html: data.html,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: adSlots.slot,
        set: {
          html: data.html,
          isActive: data.isActive,
          updatedAt: new Date(),
        },
      })
      .returning();
    return record;
  }

  async deleteAdSlot(id: string): Promise<void> {
    await this.ensureAdSlotsTableExists();
    await db.delete(adSlots).where(eq(adSlots.id, id));
  }

  async createAdminLog(insertLog: InsertAdminLog): Promise<AdminLog> {
    const [log] = await db.insert(adminLogs).values(insertLog).returning();
    return log;
  }

  async getAdminLogs(options: {
    limit?: number;
    offset?: number;
    type?: string;
    action?: string;
    success?: boolean;
  }): Promise<AdminLog[]> {
    let query = db.select().from(adminLogs);
    
    const conditions: any[] = [];
    
    if (options.type) {
      conditions.push(eq(adminLogs.type, options.type));
    }
    if (options.action) {
      conditions.push(eq(adminLogs.action, options.action));
    }
    if (options.success !== undefined) {
      conditions.push(eq(adminLogs.success, options.success ? "true" : "false"));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query
      .orderBy(desc(adminLogs.createdAt))
      .limit(options.limit || 100)
      .offset(options.offset || 0);
  }

  async getAdminLogsCount(options: {
    type?: string;
    action?: string;
    success?: boolean;
  }): Promise<number> {
    const conditions: any[] = [];
    
    if (options.type) {
      conditions.push(eq(adminLogs.type, options.type));
    }
    if (options.action) {
      conditions.push(eq(adminLogs.action, options.action));
    }
    if (options.success !== undefined) {
      conditions.push(eq(adminLogs.success, options.success ? "true" : "false"));
    }
    
    let query = db.select({ count: count() }).from(adminLogs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query;
    return result[0]?.count || 0;
  }

  async getAllEmails(inboxId?: string): Promise<any[]> {
    let query = db
      .select({
        id: emails.id,
        inboxId: emails.inboxId,
        inboxEmail: inboxes.email,
        from: emails.sender,
        subject: emails.subject,
        body: emails.body,
        receivedAt: emails.receivedAt,
      })
      .from(emails)
      .leftJoin(inboxes, eq(emails.inboxId, inboxes.id));

    if (inboxId) {
      query = query.where(eq(emails.inboxId, inboxId)) as any;
    }

    const result = await query
      .orderBy(desc(emails.receivedAt))
      .limit(1000);

    return result;
  }

  async deleteEmailById(emailId: string): Promise<void> {
    await db.delete(emails).where(eq(emails.id, emailId));
  }

  async getSystemStats(): Promise<any> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalEmailsResult] = await db
      .select({ count: count() })
      .from(emails);
    
    const [last24hResult] = await db
      .select({ count: count() })
      .from(emails)
      .where(gt(emails.receivedAt, yesterday));

    const [blockedIpsCountResult] = await db
      .select({ count: count() })
      .from(blockedIps);

    const activeIpsResult = await db
      .select({ ip: adminLogs.ip })
      .from(adminLogs)
      .where(
        and(
          gt(adminLogs.createdAt, yesterday),
          sql`${adminLogs.ip} IS NOT NULL`
        )
      )
      .groupBy(adminLogs.ip);

    const [rateLimitHitsResult] = await db
      .select({ count: count() })
      .from(adminLogs)
      .where(
        and(
          eq(adminLogs.type, "security"),
          eq(adminLogs.action, "ip_banned"),
          gt(adminLogs.createdAt, yesterday)
        )
      );

    const [activeDomainsResult] = await db
      .select({ count: count() })
      .from(emailDomains)
      .where(eq(emailDomains.isActive, "true"));

    const [cybertempSubdomainsResult] = await db
      .select({ count: count() })
      .from(cybertempSubdomains);

    return {
      totalEmails: totalEmailsResult?.count || 0,
      emailsLast24h: last24hResult?.count || 0,
      activeIps: activeIpsResult.length,
      blockedIpsCount: blockedIpsCountResult?.count || 0,
      rateLimitHits: rateLimitHitsResult?.count || 0,
      activeDomains: activeDomainsResult?.count || 0,
      cybertempSubdomains: cybertempSubdomainsResult?.count || 0,
    };
  }

  async getAllBlockedIps(): Promise<any[]> {
    return db
      .select()
      .from(blockedIps)
      .orderBy(desc(blockedIps.blockedAt));
  }

  async createBlockedIp(data: { ipAddress: string; reason: string }): Promise<any> {
    const [blocked] = await db
      .insert(blockedIps)
      .values(data)
      .returning();
    return blocked;
  }

  async deleteBlockedIp(id: string): Promise<void> {
    await db.delete(blockedIps).where(eq(blockedIps.id, id));
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    const [blocked] = await db
      .select()
      .from(blockedIps)
      .where(eq(blockedIps.ipAddress, ip));
    return !!blocked;
  }

  private async getIpBanByLevel(ipAddress: string): Promise<{ level: number; ban: AnyIpBan } | null> {
    await this.ensureBanTablesExist();
    
    const now = new Date();
    
    const [level1Ban] = await db.select().from(ipBansLevel1).where(eq(ipBansLevel1.ipAddress, ipAddress));
    if (level1Ban && level1Ban.bannedUntil > now) return { level: 1, ban: level1Ban };

    const [level2Ban] = await db.select().from(ipBansLevel2).where(eq(ipBansLevel2.ipAddress, ipAddress));
    if (level2Ban && level2Ban.bannedUntil > now) return { level: 2, ban: level2Ban };

    const [level3Ban] = await db.select().from(ipBansLevel3).where(eq(ipBansLevel3.ipAddress, ipAddress));
    if (level3Ban && level3Ban.bannedUntil > now) return { level: 3, ban: level3Ban };

    const [permanentBan] = await db.select().from(ipBansPermanent).where(eq(ipBansPermanent.ipAddress, ipAddress));
    if (permanentBan) return { level: 4, ban: permanentBan };

    return null;
  }

  private generateBanCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async createOrUpdateIpBan(ipAddress: string): Promise<AnyIpBan> {
    console.log(`\n\n========== START createOrUpdateIpBan for IP: ${ipAddress} ==========`);
    
    await this.ensureBanTablesExist();
    
    console.log(`[BanSystem] Processing lockout for IP: ${ipAddress}`);
    
    try {
      const now = new Date();
      
      // 1. Check current ban level (even if expired) to determine escalation
      const [level1Ban] = await db.select().from(ipBansLevel1).where(eq(ipBansLevel1.ipAddress, ipAddress));
      const [level2Ban] = await db.select().from(ipBansLevel2).where(eq(ipBansLevel2.ipAddress, ipAddress));
      const [level3Ban] = await db.select().from(ipBansLevel3).where(eq(ipBansLevel3.ipAddress, ipAddress));
      const [permanentBan] = await db.select().from(ipBansPermanent).where(eq(ipBansPermanent.ipAddress, ipAddress));
      
      // Determine current level
      let currentLevel = 0;
      let currentBanCode = '';
      if (level1Ban) {
        currentLevel = 1;
        currentBanCode = level1Ban.banCode;
      } else if (level2Ban) {
        currentLevel = 2;
        currentBanCode = level2Ban.banCode;
      } else if (level3Ban) {
        currentLevel = 3;
        currentBanCode = level3Ban.banCode;
      } else if (permanentBan) {
        currentLevel = 4;
        currentBanCode = permanentBan.banCode;
      }
      
      // Clean up expired bans for this IP
      await db.delete(ipBansLevel1).where(and(eq(ipBansLevel1.ipAddress, ipAddress), lt(ipBansLevel1.bannedUntil, now)));
      await db.delete(ipBansLevel2).where(and(eq(ipBansLevel2.ipAddress, ipAddress), lt(ipBansLevel2.bannedUntil, now)));
      await db.delete(ipBansLevel3).where(and(eq(ipBansLevel3.ipAddress, ipAddress), lt(ipBansLevel3.bannedUntil, now)));
      
      // Determine ban code
      const banCode = currentBanCode || this.generateBanCode();
      
      // Escalate through levels based on current status
      if (currentLevel === 0) {
        // First ban - Level 1
        console.log(`[BanEscalation] IP: ${ipAddress}, Level 1 (5 minutes)`);
        const bannedUntil = new Date(Date.now() + 5 * 60 * 1000);
        try {
          const result = await db
            .insert(ipBansLevel1)
            .values({ ipAddress, banCode, bannedUntil })
            .returning();
          console.log(`[BanSuccess] Level 1 ban created for IP ${ipAddress}, code: ${banCode}, banned until: ${bannedUntil}`);
          return result[0];
        } catch (e: any) {
          if (e.code === '23505') {
            const [existing] = await db.select().from(ipBansLevel1).where(eq(ipBansLevel1.ipAddress, ipAddress));
            console.log(`[BanSuccess] Level 1 ban already exists for IP ${ipAddress}, code: ${existing.banCode}`);
            return existing;
          }
          throw e;
        }

      } else if (currentLevel === 1) {
        // Level 1 -> Level 2
        console.log(`[BanEscalation] IP: ${ipAddress}, Level 2 (15 minutes) - Escalating from Level 1`);
        await db.delete(ipBansLevel1).where(eq(ipBansLevel1.ipAddress, ipAddress));
        const bannedUntil = new Date(Date.now() + 15 * 60 * 1000);
        try {
          const result = await db
            .insert(ipBansLevel2)
            .values({ ipAddress, banCode, bannedUntil })
            .returning();
          console.log(`[BanSuccess] Level 2 ban created for IP ${ipAddress}, code: ${banCode}, banned until: ${bannedUntil}`);
          return result[0];
        } catch (e: any) {
          if (e.code === '23505') {
            const [existing] = await db.select().from(ipBansLevel2).where(eq(ipBansLevel2.ipAddress, ipAddress));
            console.log(`[BanSuccess] Level 2 ban already exists for IP ${ipAddress}, code: ${existing.banCode}`);
            return existing;
          }
          throw e;
        }

      } else if (currentLevel === 2) {
        // Level 2 -> Level 3
        console.log(`[BanEscalation] IP: ${ipAddress}, Level 3 (45 minutes) - Escalating from Level 2`);
        await db.delete(ipBansLevel2).where(eq(ipBansLevel2.ipAddress, ipAddress));
        const bannedUntil = new Date(Date.now() + 45 * 60 * 1000);
        try {
          const result = await db
            .insert(ipBansLevel3)
            .values({ ipAddress, banCode, bannedUntil })
            .returning();
          console.log(`[BanSuccess] Level 3 ban created for IP ${ipAddress}, code: ${banCode}, banned until: ${bannedUntil}`);
          return result[0];
        } catch (e: any) {
          if (e.code === '23505') {
            const [existing] = await db.select().from(ipBansLevel3).where(eq(ipBansLevel3.ipAddress, ipAddress));
            console.log(`[BanSuccess] Level 3 ban already exists for IP ${ipAddress}, code: ${existing.banCode}`);
            return existing;
          }
          throw e;
        }

      } else if (currentLevel === 3) {
        // Level 3 -> Permanent
        console.log(`[BanEscalation] IP: ${ipAddress}, PERMANENT BAN - Escalating from Level 3`);
        await db.delete(ipBansLevel3).where(eq(ipBansLevel3.ipAddress, ipAddress));
        try {
          const result = await db
            .insert(ipBansPermanent)
            .values({ ipAddress, banCode })
            .returning();
          console.log(`[BanSuccess] PERMANENT ban created for IP ${ipAddress}, code: ${banCode}`);
          return result[0];
        } catch (e: any) {
          if (e.code === '23505') {
            const [existing] = await db.select().from(ipBansPermanent).where(eq(ipBansPermanent.ipAddress, ipAddress));
            console.log(`[BanSuccess] PERMANENT ban already exists for IP ${ipAddress}, code: ${existing.banCode}`);
            return existing;
          }
          throw e;
        }

      } else {
        // Already permanent - return existing ban
        console.log(`[BanEscalation] IP: ${ipAddress} already has PERMANENT BAN`);
        return permanentBan as IpBanPermanent;
      }
    } catch (error) {
      console.error(`[BanError] Failed to ban IP ${ipAddress}:`, error);
      throw error;
    }
  }

  async isIpPermanentlyBanned(ipAddress: string): Promise<boolean> {
    await this.ensureBanTablesExist();
    
    const [ban] = await db.select().from(ipBansPermanent).where(eq(ipBansPermanent.ipAddress, ipAddress));
    return !!ban;
  }

  async unbanByCode(banCode: string): Promise<{ success: boolean; message: string; unbannedIps: string[] }> {
    await this.ensureBanTablesExist();
    
    const unbannedIps: string[] = [];

    const level1Results = await db.select().from(ipBansLevel1).where(eq(ipBansLevel1.banCode, banCode));
    if (level1Results.length > 0) {
      for (const ban of level1Results) {
        unbannedIps.push(ban.ipAddress);
      }
      await db.delete(ipBansLevel1).where(eq(ipBansLevel1.banCode, banCode));
    }

    const level2Results = await db.select().from(ipBansLevel2).where(eq(ipBansLevel2.banCode, banCode));
    if (level2Results.length > 0) {
      for (const ban of level2Results) {
        unbannedIps.push(ban.ipAddress);
      }
      await db.delete(ipBansLevel2).where(eq(ipBansLevel2.banCode, banCode));
    }

    const level3Results = await db.select().from(ipBansLevel3).where(eq(ipBansLevel3.banCode, banCode));
    if (level3Results.length > 0) {
      for (const ban of level3Results) {
        unbannedIps.push(ban.ipAddress);
      }
      await db.delete(ipBansLevel3).where(eq(ipBansLevel3.banCode, banCode));
    }

    const permanentResults = await db.select().from(ipBansPermanent).where(eq(ipBansPermanent.banCode, banCode));
    if (permanentResults.length > 0) {
      for (const ban of permanentResults) {
        unbannedIps.push(ban.ipAddress);
      }
      await db.delete(ipBansPermanent).where(eq(ipBansPermanent.banCode, banCode));
    }

    if (unbannedIps.length === 0) {
      return { 
        success: false, 
        message: `No se encontró ningún baneo con código: ${banCode}`,
        unbannedIps: []
      };
    }

    return { 
      success: true, 
      message: `Baneo eliminado exitosamente. IPs desbaneadas: ${unbannedIps.join(", ")}`,
      unbannedIps
    };
  }

  async isIpTemporarilyBanned(ipAddress: string): Promise<boolean> {
    await this.ensureBanTablesExist();
    
    const level1 = await db.select().from(ipBansLevel1).where(eq(ipBansLevel1.ipAddress, ipAddress)).limit(1);
    const level2 = await db.select().from(ipBansLevel2).where(eq(ipBansLevel2.ipAddress, ipAddress)).limit(1);
    const level3 = await db.select().from(ipBansLevel3).where(eq(ipBansLevel3.ipAddress, ipAddress)).limit(1);
    
    // Check if any temporary level is still valid (not expired)
    if (level1.length > 0 && level1[0].bannedUntil > new Date()) {
      console.log(`[Storage] IP ${ipAddress} is banned Level 1 until ${level1[0].bannedUntil}`);
      return true;
    }
    if (level2.length > 0 && level2[0].bannedUntil > new Date()) {
      console.log(`[Storage] IP ${ipAddress} is banned Level 2 until ${level2[0].bannedUntil}`);
      return true;
    }
    if (level3.length > 0 && level3[0].bannedUntil > new Date()) {
      console.log(`[Storage] IP ${ipAddress} is banned Level 3 until ${level3[0].bannedUntil}`);
      return true;
    }
    
    return false;
  }

  async getIpBanInfo(ipAddress: string): Promise<AnyIpBan | undefined> {
    const banInfo = await this.getIpBanByLevel(ipAddress);
    return banInfo?.ban;
  }

  async unbanIpAddress(ipAddress: string): Promise<{ deleted: number }> {
    await this.ensureBanTablesExist();
    
    console.log(`[Unban] Unbanning IP: ${ipAddress}`);
    
    const deleted1 = await db.delete(ipBansLevel1).where(eq(ipBansLevel1.ipAddress, ipAddress));
    const deleted2 = await db.delete(ipBansLevel2).where(eq(ipBansLevel2.ipAddress, ipAddress));
    const deleted3 = await db.delete(ipBansLevel3).where(eq(ipBansLevel3.ipAddress, ipAddress));
    const deletedPerm = await db.delete(ipBansPermanent).where(eq(ipBansPermanent.ipAddress, ipAddress));
    
    const total = (deleted1 as any)?.rowCount || 0 + (deleted2 as any)?.rowCount || 0 + (deleted3 as any)?.rowCount || 0 + (deletedPerm as any)?.rowCount || 0;
    
    console.log(`[Unban] Removed ${total} ban record(s) for IP ${ipAddress}`);
    
    return { deleted: total };
  }
}

export const storage = new DatabaseStorage();
