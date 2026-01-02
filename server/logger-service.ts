import { db } from "./db";
import { adminLogs } from "@shared/models/auth";
import type { InsertAdminLog } from "@shared/models/auth";

export type LogType = "admin_action" | "site_event" | "auth_attempt" | "security";
export type LogAction = "login" | "logout" | "login_failed" | "ip_banned" | "slug_validated" | 
                       "email_created" | "email_deleted" | "user_created" | "user_deleted" |
                       "domain_created" | "domain_deleted" | "settings_updated" | "unauthorized_access";

interface LogOptions {
  type: LogType;
  action: LogAction;
  adminId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  success?: boolean;
}

export async function logActivity(options: LogOptions): Promise<void> {
  try {
    const logEntry: InsertAdminLog = {
      type: options.type,
      action: options.action,
      adminId: options.adminId || null,
      ip: options.ip || null,
      userAgent: options.userAgent || null,
      details: options.details ? JSON.stringify(options.details) : null,
      success: options.success === false ? "false" : "true",
    };

    await db.insert(adminLogs).values(logEntry);
  } catch (error) {
    console.error("[Logger Service] Failed to log activity:", error);
  }
}

export async function getLogs(options: {
  limit?: number;
  offset?: number;
  type?: LogType;
  action?: LogAction;
  adminId?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
}): Promise<typeof adminLogs.$inferSelect[]> {
  try {
    let query = db.select().from(adminLogs);
    
    // Apply filters - simplified, you'd need to build this with drizzle operators
    const results = await query.limit(options.limit || 100).offset(options.offset || 0);
    
    return results;
  } catch (error) {
    console.error("[Logger Service] Failed to retrieve logs:", error);
    return [];
  }
}
