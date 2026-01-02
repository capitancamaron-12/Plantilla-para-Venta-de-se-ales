import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const inboxes = pgTable("inboxes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  ownerUserId: varchar("owner_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const emails = pgTable("emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inboxId: varchar("inbox_id").notNull().references(() => inboxes.id, { onDelete: "cascade" }),
  cybertempId: text("cybertemp_id"),
  sender: text("sender").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  preview: text("preview").notNull(),
  isRead: integer("is_read").notNull().default(0),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
});

export const insertInboxSchema = createInsertSchema(inboxes).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  receivedAt: true,
}).extend({
  cybertempId: z.string().optional(),
});

export type InsertInbox = z.infer<typeof insertInboxSchema>;
export type Inbox = typeof inboxes.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

export const savedInboxes = pgTable("saved_inboxes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  inboxId: varchar("inbox_id").notNull().references(() => inboxes.id, { onDelete: "cascade" }),
  alias: varchar("alias").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  tier: varchar("tier").notNull().default("free"),
  status: varchar("status").notNull().default("inactive"),
  nowPaymentsSubscriptionId: varchar("nowpayments_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptionTransactions = pgTable("subscription_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subscriptionId: varchar("subscription_id"),
  eventType: varchar("event_type").notNull(),
  amount: text("amount"),
  currency: varchar("currency"),
  txHash: text("tx_hash"),
  paymentId: varchar("payment_id"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
});

export const insertSavedInboxSchema = createInsertSchema(savedInboxes).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionTransactionSchema = createInsertSchema(subscriptionTransactions).omit({
  id: true,
  occurredAt: true,
});

export type InsertSavedInbox = z.infer<typeof insertSavedInboxSchema>;
export type SavedInbox = typeof savedInboxes.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertSubscriptionTransaction = z.infer<typeof insertSubscriptionTransactionSchema>;
export type SubscriptionTransaction = typeof subscriptionTransactions.$inferSelect;

export const FREE_SAVED_INBOX_LIMIT = 5;
export const PREMIUM_PRICE_USD = 2;

export const usagePurposes = [
  "marketing",
  "support",
  "sales",
  "hr",
  "testing",
  "personal",
  "other"
] as const;

export type UsagePurpose = typeof usagePurposes[number];

export const usagePurposeLabels: Record<UsagePurpose, string> = {
  marketing: "Marketing y campañas",
  support: "Soporte al cliente",
  sales: "Ventas y prospectos",
  hr: "Recursos Humanos / Reclutamiento",
  testing: "Testing de productos",
  personal: "Uso personal",
  other: "Otro"
};

export const usagePurposePrefixes: Record<UsagePurpose, string> = {
  marketing: "mkt",
  support: "sup",
  sales: "sal",
  hr: "hr",
  testing: "tst",
  personal: "per",
  other: "tmp"
};

export const tempEmails = pgTable("temp_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  domain: text("domain").notNull(),
  externalId: text("external_id"),
  status: varchar("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastCheckedAt: timestamp("last_checked_at").defaultNow(),
});

export const cybertempSubdomains = pgTable("cybertemp_subdomains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subdomain: text("subdomain").notNull(),
  domain: text("domain").notNull(),
  status: varchar("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adSlots = pgTable("ad_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slot: varchar("slot").notNull().unique(),
  html: text("html").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTempEmailSchema = createInsertSchema(tempEmails).omit({
  id: true,
  createdAt: true,
  lastCheckedAt: true,
});

export const insertCybertempSubdomainSchema = createInsertSchema(cybertempSubdomains).omit({
  id: true,
  createdAt: true,
});

export const insertAdSlotSchema = createInsertSchema(adSlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTempEmail = z.infer<typeof insertTempEmailSchema>;
export type TempEmail = typeof tempEmails.$inferSelect;
export type InsertCybertempSubdomain = z.infer<typeof insertCybertempSubdomainSchema>;
export type CybertempSubdomain = typeof cybertempSubdomains.$inferSelect;
export type InsertAdSlot = z.infer<typeof insertAdSlotSchema>;
export type AdSlot = typeof adSlots.$inferSelect;

export const ipBansLevel1 = pgTable("ip_bans_level1", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  banCode: varchar("ban_code").notNull(),
  bannedUntil: timestamp("banned_until").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ipBansLevel2 = pgTable("ip_bans_level2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  banCode: varchar("ban_code").notNull(),
  bannedUntil: timestamp("banned_until").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ipBansLevel3 = pgTable("ip_bans_level3", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  banCode: varchar("ban_code").notNull(),
  bannedUntil: timestamp("banned_until").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ipBansPermanent = pgTable("ip_bans_permanent", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  banCode: varchar("ban_code").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIpBanLevel1Schema = createInsertSchema(ipBansLevel1).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIpBanLevel2Schema = createInsertSchema(ipBansLevel2).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIpBanLevel3Schema = createInsertSchema(ipBansLevel3).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIpBanPermanentSchema = createInsertSchema(ipBansPermanent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIpBanLevel1 = z.infer<typeof insertIpBanLevel1Schema>;
export type IpBanLevel1 = typeof ipBansLevel1.$inferSelect;

export type InsertIpBanLevel2 = z.infer<typeof insertIpBanLevel2Schema>;
export type IpBanLevel2 = typeof ipBansLevel2.$inferSelect;

export type InsertIpBanLevel3 = z.infer<typeof insertIpBanLevel3Schema>;
export type IpBanLevel3 = typeof ipBansLevel3.$inferSelect;

export type InsertIpBanPermanent = z.infer<typeof insertIpBanPermanentSchema>;
export type IpBanPermanent = typeof ipBansPermanent.$inferSelect;

export type AnyIpBan = IpBanLevel1 | IpBanLevel2 | IpBanLevel3 | IpBanPermanent;
