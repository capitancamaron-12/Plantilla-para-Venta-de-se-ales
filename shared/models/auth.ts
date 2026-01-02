import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const usagePurposes = [
  "marketing",
  "customer_support", 
  "sales",
  "hr_recruiting",
  "product_testing",
  "personal",
  "development",
  "other"
] as const;

export type UsagePurpose = typeof usagePurposes[number];

export const usagePurposeLabels: Record<UsagePurpose, string> = {
  marketing: "Marketing y Campañas",
  customer_support: "Atención al Cliente",
  sales: "Ventas",
  hr_recruiting: "Recursos Humanos / Reclutamiento",
  product_testing: "Pruebas de Producto",
  personal: "Uso Personal",
  development: "Desarrollo / Testing",
  other: "Otro"
};

export const usagePurposePrefixes: Record<UsagePurpose, string> = {
  marketing: "mkt",
  customer_support: "sop",
  sales: "vta",
  hr_recruiting: "rh",
  product_testing: "test",
  personal: "usr",
  development: "dev",
  other: "tmp"
};

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  usagePurpose: varchar("usage_purpose"),
  usagePurposeNotes: text("usage_purpose_notes"),
  isVerified: varchar("is_verified").default("false"),
  verificationCode: varchar("verification_code"),
  verificationCodeExpires: timestamp("verification_code_expires"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorCode: varchar("two_factor_code"),
  twoFactorCodeExpires: timestamp("two_factor_code_expires"),
  securityAlertsEnabled: boolean("security_alerts_enabled").notNull().default(true),
  privacyModeEnabled: boolean("privacy_mode_enabled").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
  twoFactorCode: true,
  twoFactorCodeExpires: true,
  securityAlertsEnabled: true,
  privacyModeEnabled: true,
  lastLoginAt: true,
  lastLoginIp: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserWithoutPassword = Omit<User, "password" | "twoFactorSecret" | "twoFactorCode" | "twoFactorCodeExpires">;

export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: text("password").notNull(),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: varchar("two_factor_enabled").default("false"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSessions = pgTable(
  "admin_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_admin_session_expire").on(table.expire)]
);

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

export const adminSlugs = pgTable("admin_slugs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plainSlug: text("plain_slug").notNull(),
  slugHash: text("slug_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: varchar("is_active").default("true"),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminLogs = pgTable("admin_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // "admin_action", "site_event", "auth_attempt", etc
  action: varchar("action", { length: 100 }).notNull(), // "login", "logout", "create_user", "delete_email", etc
  adminId: varchar("admin_id"),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("user_agent"),
  details: text("details"), // JSON string con detalles adicionales
  success: varchar("success", { length: 10 }).default("true"), // "true" or "false"
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminIpWhitelist = pgTable("admin_ip_whitelist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: varchar("ip_address").notNull(),
  label: varchar("label"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminSlugSchema = createInsertSchema(adminSlugs).omit({
  id: true,
  createdAt: true,
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAdminIpSchema = createInsertSchema(adminIpWhitelist).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminSlug = z.infer<typeof insertAdminSlugSchema>;
export type AdminSlug = typeof adminSlugs.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminIp = z.infer<typeof insertAdminIpSchema>;
export type AdminIp = typeof adminIpWhitelist.$inferSelect;

export const emailDomains = pgTable("email_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: varchar("domain").notNull().unique(),
  isActive: varchar("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailDomainSchema = createInsertSchema(emailDomains).omit({
  id: true,
  createdAt: true,
});

export type InsertEmailDomain = z.infer<typeof insertEmailDomainSchema>;
export type EmailDomain = typeof emailDomains.$inferSelect;

export const blockedIps = pgTable("blocked_ips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  reason: text("reason").notNull(),
  blockedAt: timestamp("blocked_at").defaultNow(),
});

export const insertBlockedIpSchema = createInsertSchema(blockedIps).omit({
  id: true,
  blockedAt: true,
});

export type InsertBlockedIp = z.infer<typeof insertBlockedIpSchema>;
export type BlockedIp = typeof blockedIps.$inferSelect;
