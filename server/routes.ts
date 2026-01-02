import type { Express, RequestHandler } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertInboxSchema, insertEmailSchema, loginSchema, registerSchema, type UserWithoutPassword, FREE_SAVED_INBOX_LIMIT, PREMIUM_PRICE_USD, usagePurposes, usagePurposePrefixes, type UsagePurpose, type InsertCybertempSubdomain, inboxes, savedInboxes, userSubscriptions, subscriptionTransactions, users } from "@shared/schema";
import { nanoid } from "nanoid";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { sendVerificationEmail, sendSecurityAlertEmail } from "./email";
import { cybertempService } from "./cybertemp-service";
import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

function sortObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  return Object.keys(obj).sort().reduce((result: any, key) => {
    result[key] = sortObject(obj[key]);
    return result;
  }, {});
}

export function createBanMiddleware() {
  return async (req: any, res: any, next: any) => {
    const skipPaths = [
      "/assets", "/@", "/_", "/favicon.ico", "/robots.txt", "/manifest.json"
    ];

    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    if (req.path.startsWith("/banned/")) {
      return next();
    }

    if (req.path === "/api/captcha/lockout") {
      return next();
    }

    const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || 
                     req.socket.remoteAddress || 
                     "unknown";

    if (clientIp === "unknown") return next();

    try {
      const [isTemporarilyBanned, isPermanentlyBanned, isManualBlocked] = await Promise.all([
        storage.isIpTemporarilyBanned(clientIp),
        storage.isIpPermanentlyBanned(clientIp),
        storage.isIpBlocked(clientIp)
      ]);

      if (isTemporarilyBanned || isPermanentlyBanned || isManualBlocked) {
        console.log(`[BanMiddleware] Blocking banned IP: ${clientIp} trying to access ${req.path}. Temporary: ${isTemporarilyBanned}, Permanent: ${isPermanentlyBanned}, Manual: ${isManualBlocked}`);
        const banInfo = await storage.getIpBanInfo(clientIp);
        
        const isBanPermanent = isManualBlocked || isPermanentlyBanned || !('bannedUntil' in (banInfo || {}));
        const bannedUntil = ('bannedUntil' in (banInfo || {})) ? (banInfo as any).bannedUntil : undefined;
        
        if (req.path.startsWith("/api/")) {
          return res.status(403).json({ 
            message: "IP Blocked", 
            code: banInfo?.banCode || "MANUAL_BLOCK",
            isPermanent: isBanPermanent,
          });
        }
        
        if (banInfo) {
          const params = new URLSearchParams({
            isPermanent: isBanPermanent.toString(),
          });
          if (bannedUntil) {
            params.set('bannedUntil', bannedUntil.toISOString());
          }
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          return res.redirect(`/banned/${encodeURIComponent(banInfo.banCode)}?${params.toString()}`);
        } else {
          return res.status(403).send("<h1>403 Forbidden</h1><p>Acceso denegado por políticas de seguridad.</p>");
        }
      }
      next();
    } catch (error) {
      console.error("IP Ban Check Error:", error);
      next();
    }
  };
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const INBOX_LIFETIME_HOURS = 24 * 30;
const clients = new Map<string, Set<WebSocket>>();
// In-memory storage for test user saved inboxes
const testUserSavedInboxes: any[] = [];
const testUserTwoFactor = { secret: null as string | null, enabled: false };

// In-memory throttle for inbox checking
const inboxLastChecked = new Map<string, number>();
const CHECK_INTERVAL_MS = 20000; // 20 seconds
const BADGE_TTL_MS = 5 * 60 * 1000;
const BADGE_ERROR_BACKOFF_MS = 60 * 1000;
const BADGE_FETCH_TIMEOUT_MS = 6000;
const badgeCache: Record<"light" | "dark", { buffer: Buffer; contentType: string; fetchedAt: number } | null> = {
  light: null,
  dark: null,
};
const badgeInFlight: Record<"light" | "dark", Promise<{ buffer: Buffer; contentType: string } | null> | null> = {
  light: null,
  dark: null,
};
const badgeLastErrorAt: Record<"light" | "dark", number | null> = {
  light: null,
  dark: null,
};

async function fetchStatusBadge(theme: "light" | "dark") {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BADGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`https://status.tcorp.email/badge?theme=${theme}`, {
      headers: {
        "User-Agent": "tcorp-admin",
        "Accept": "image/svg+xml,image/*,*/*;q=0.8"
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/svg+xml";
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, contentType };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function ensureUserSecurityColumns() {
  const statements = [
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" text;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_code" varchar;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_code_expires" timestamp;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "security_alerts_enabled" boolean NOT NULL DEFAULT true;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privacy_mode_enabled" boolean NOT NULL DEFAULT false;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_ip" text;`,
  ];

  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error: any) {
      if (!error?.message?.includes("already exists")) {
        console.error("[Account] Error ensuring user columns:", error?.message || error);
      }
    }
  }
}

function sanitizeUser(user: any) {
  const {
    password,
    twoFactorSecret,
    twoFactorCode,
    twoFactorCodeExpires,
    ...rest
  } = user;
  return rest;
}

function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const sessionTtl = 24 * 60 * 60 * 1000; // 24 hours for security
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "tcorp-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  }));

  await ensureUserSecurityColumns();



  const isAuthenticated: RequestHandler = (req, res, next) => {
    if (req.session.userId) {
      return next();
    }
    res.status(401).json({ message: "No autorizado" });
  };

  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "tcorp-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws, req) => {
    sessionMiddleware(req as any, {} as any, () => {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        ws.close(4001, "No autorizado");
        return;
      }
      
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const inboxId = url.searchParams.get("inboxId");
      
      if (inboxId) {
        if (!clients.has(inboxId)) {
          clients.set(inboxId, new Set());
        }
        clients.get(inboxId)!.add(ws);
        
        ws.on("close", () => {
          clients.get(inboxId)?.delete(ws);
          if (clients.get(inboxId)?.size === 0) {
            clients.delete(inboxId);
          }
        });
      }
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validated = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validated.email);
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }

      const hashedPassword = await bcrypt.hash(validated.password, 10);
      
      const user = await storage.createUser({
        email: validated.email,
        password: hashedPassword,
        firstName: validated.firstName,
        lastName: validated.lastName,
      });

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpires = new Date(Date.now() + 15 * 60 * 1000);
      
      await storage.updateUserVerification(user.id, verificationCode, codeExpires);

      const emailSent = await sendVerificationEmail(validated.email, verificationCode);
      if (!emailSent) {
        return res.status(500).json({ message: "Error al enviar el correo de verificación. Intenta de nuevo." });
      }

      res.json({ 
        ...sanitizeUser(user), 
        requiresVerification: true 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Código de verificación requerido" });
      }

      const user = await storage.getUserByVerificationCode(code);
      
      if (!user) {
        return res.status(400).json({ message: "Código de verificación inválido" });
      }

      if (user.verificationCodeExpires && new Date() > user.verificationCodeExpires) {
        return res.status(400).json({ message: "El código de verificación ha expirado" });
      }

      await storage.verifyUser(user.id);
      
      req.session.userId = user.id;

      res.json({ ...sanitizeUser(user), isVerified: "true" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email requerido" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(400).json({ message: "Usuario no encontrado" });
      }

      if (user.isVerified === "true") {
        return res.status(400).json({ message: "El usuario ya está verificado" });
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpires = new Date(Date.now() + 15 * 60 * 1000);
      
      await storage.updateUserVerification(user.id, verificationCode, codeExpires);

      const emailSent = await sendVerificationEmail(email, verificationCode);
      if (!emailSent) {
        return res.status(500).json({ message: "Error al enviar el correo. Intenta de nuevo." });
      }

      res.json({ message: "Nuevo código enviado a tu correo" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validated = loginSchema.parse(req.body);
      const clientIp = getClientIp(req);
      
      // Test user - no database persistence
      const TEST_EMAIL = "test@testing.com";
      const TEST_PASSWORD = "password123";
      const TEST_USER_ID = "test-user-id";
      
      if (validated.email === TEST_EMAIL && validated.password === TEST_PASSWORD) {
        if (testUserTwoFactor.enabled && testUserTwoFactor.secret) {
          return res.json({ requiresTwoFactor: true, email: TEST_EMAIL });
        }
        req.session.userId = TEST_USER_ID;
        const testUser = {
          id: TEST_USER_ID,
          email: TEST_EMAIL,
          firstName: "Test",
          lastName: "User",
          isVerified: "true",
          createdAt: new Date(),
          verificationCode: null,
          verificationCodeExpires: null,
          usagePurpose: null,
          usagePurposeNotes: null,
        };
        return res.json(testUser);
      }
      
      const user = await storage.getUserByEmail(validated.email);
      if (!user) {
        return res.status(401).json({ message: "Email o contraseña incorrectos" });
      }

      const isValidPassword = await bcrypt.compare(validated.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email o contraseña incorrectos" });
      }

      if (user.isVerified !== "true") {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpires = new Date(Date.now() + 15 * 60 * 1000);
        await storage.updateUserVerification(user.id, verificationCode, codeExpires);
        
        const emailSent = await sendVerificationEmail(user.email, verificationCode);
        if (!emailSent) {
          return res.status(500).json({ message: "Error al enviar el correo de verificación. Intenta de nuevo." });
        }
        
        return res.json({ 
          ...sanitizeUser(user), 
          requiresVerification: true 
        });
      }

      if (user.twoFactorEnabled && user.twoFactorSecret) {
        return res.json({
          requiresTwoFactor: true,
          email: user.email,
        });
      }

      if (user.twoFactorEnabled && !user.twoFactorSecret) {
        await db.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, user.id));
      }

      const shouldAlert = (user.securityAlertsEnabled ?? true) && user.lastLoginIp && user.lastLoginIp !== clientIp;

      req.session.userId = user.id;
      await db.update(users).set({
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
      }).where(eq(users.id, user.id));

      if (shouldAlert) {
        await sendSecurityAlertEmail(user.email, clientIp);
      }

      res.json(sanitizeUser(user));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/2fa", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: "Codigo de seguridad requerido" });
      }

      const TEST_EMAIL = "test@testing.com";
      const TEST_USER_ID = "test-user-id";
      if (email === TEST_EMAIL) {
        if (!testUserTwoFactor.enabled || !testUserTwoFactor.secret) {
          return res.status(400).json({ message: "2FA no disponible" });
        }
        const totp = new OTPAuth.TOTP({
          issuer: process.env.USER_2FA_ISSUER || "TCorp Business",
          label: TEST_EMAIL,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(testUserTwoFactor.secret),
        });
        const delta = totp.validate({ token: String(code).trim(), window: 1 });
        if (delta === null) {
          return res.status(400).json({ message: "Codigo invalido" });
        }
        req.session.userId = TEST_USER_ID;
        return res.json({
          id: TEST_USER_ID,
          email: TEST_EMAIL,
          firstName: "Test",
          lastName: "User",
          isVerified: "true",
          createdAt: new Date(),
          verificationCode: null,
          verificationCodeExpires: null,
          usagePurpose: null,
          usagePurposeNotes: null,
        });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA no disponible" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: process.env.USER_2FA_ISSUER || "TCorp Business",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
      });
      const delta = totp.validate({ token: String(code).trim(), window: 1 });
      if (delta === null) {
        return res.status(400).json({ message: "Codigo invalido" });
      }

      const clientIp = getClientIp(req);
      const shouldAlert = (user.securityAlertsEnabled ?? true) && user.lastLoginIp && user.lastLoginIp !== clientIp;

      await db.update(users).set({
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
      }).where(eq(users.id, user.id));

      req.session.userId = user.id;

      if (shouldAlert) {
        await sendSecurityAlertEmail(user.email, clientIp);
      }

      res.json(sanitizeUser(user));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Sesión cerrada" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";
      const TEST_EMAIL = "test@testing.com";
      
      // Test user - return mock data
      if (req.session.userId === TEST_USER_ID) {
        const testUser = {
          id: TEST_USER_ID,
          email: TEST_EMAIL,
          firstName: "Test",
          lastName: "User",
          isVerified: "true",
          createdAt: new Date(),
          verificationCode: null,
          verificationCodeExpires: null,
          usagePurpose: null,
          usagePurposeNotes: null,
        };
        return res.json(testUser);
      }
      
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.json(sanitizeUser(user));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/account/preferences", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";
      if (req.session.userId === TEST_USER_ID) {
        return res.json({
          twoFactorEnabled: testUserTwoFactor.enabled,
          securityAlertsEnabled: true,
          privacyModeEnabled: false,
        });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      res.json({
        twoFactorEnabled: !!user.twoFactorEnabled,
        securityAlertsEnabled: user.securityAlertsEnabled ?? true,
        privacyModeEnabled: user.privacyModeEnabled ?? false,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error al cargar preferencias" });
    }
  });

  app.patch("/api/account/preferences", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";
      if (req.session.userId === TEST_USER_ID) {
        return res.json({
          twoFactorEnabled: testUserTwoFactor.enabled,
          securityAlertsEnabled: req.body.securityAlertsEnabled ?? true,
          privacyModeEnabled: req.body.privacyModeEnabled ?? false,
        });
      }

      const { securityAlertsEnabled, privacyModeEnabled } = req.body;
      const updates: Record<string, any> = {};

      if (typeof securityAlertsEnabled === "boolean") {
        updates.securityAlertsEnabled = securityAlertsEnabled;
      }
      if (typeof privacyModeEnabled === "boolean") {
        updates.privacyModeEnabled = privacyModeEnabled;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Sin cambios" });
      }

      await db.update(users).set(updates).where(eq(users.id, req.session.userId!));
      const user = await storage.getUserById(req.session.userId!);
      res.json({
        twoFactorEnabled: !!user?.twoFactorEnabled,
        securityAlertsEnabled: user?.securityAlertsEnabled ?? true,
        privacyModeEnabled: user?.privacyModeEnabled ?? false,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error al guardar preferencias" });
    }
  });

  app.post("/api/account/2fa/setup", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";
      const issuer = process.env.USER_2FA_ISSUER || "TCorp Business";

      if (req.session.userId === TEST_USER_ID) {
        const secret = new OTPAuth.Secret({ size: 20 }).base32;
        testUserTwoFactor.secret = secret;
        testUserTwoFactor.enabled = false;
        const totp = new OTPAuth.TOTP({
          issuer,
          label: "test@testing.com",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(secret),
        });
        const otpauthUrl = totp.toString();
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        return res.json({ secret, otpauthUrl, qrCodeDataUrl });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const secret = new OTPAuth.Secret({ size: 20 }).base32;
      const totp = new OTPAuth.TOTP({
        issuer,
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const otpauthUrl = totp.toString();
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      await db.update(users).set({
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      }).where(eq(users.id, user.id));

      res.json({ secret, otpauthUrl, qrCodeDataUrl });
    } catch (error: any) {
      res.status(500).json({ message: "Error al configurar 2FA" });
    }
  });

  app.post("/api/account/2fa/confirm", isAuthenticated, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Codigo requerido" });
      }

      const TEST_USER_ID = "test-user-id";
      const issuer = process.env.USER_2FA_ISSUER || "TCorp Business";

      if (req.session.userId === TEST_USER_ID) {
        if (!testUserTwoFactor.secret) {
          return res.status(400).json({ message: "2FA no configurado" });
        }
        const totp = new OTPAuth.TOTP({
          issuer,
          label: "test@testing.com",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(testUserTwoFactor.secret),
        });
        const delta = totp.validate({ token: String(code).trim(), window: 1 });
        if (delta === null) {
          return res.status(400).json({ message: "Codigo invalido" });
        }
        testUserTwoFactor.enabled = true;
        return res.json({ twoFactorEnabled: true });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA no configurado" });
      }

      const totp = new OTPAuth.TOTP({
        issuer,
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
      });
      const delta = totp.validate({ token: String(code).trim(), window: 1 });
      if (delta === null) {
        return res.status(400).json({ message: "Codigo invalido" });
      }

      await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, user.id));
      res.json({ twoFactorEnabled: true });
    } catch (error: any) {
      res.status(500).json({ message: "Error al confirmar 2FA" });
    }
  });

  app.post("/api/account/2fa/disable", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";
      if (req.session.userId === TEST_USER_ID) {
        testUserTwoFactor.enabled = false;
        testUserTwoFactor.secret = null;
        return res.json({ twoFactorEnabled: false });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      await db.update(users).set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
      }).where(eq(users.id, user.id));

      res.json({ twoFactorEnabled: false });
    } catch (error: any) {
      res.status(500).json({ message: "Error al desactivar 2FA" });
    }
  });

  app.get("/api/account/export", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";
      if (req.session.userId === TEST_USER_ID) {
        return res.json({
          exportedAt: new Date().toISOString(),
          user: {
            id: TEST_USER_ID,
            email: "test@testing.com",
          },
          subscription: null,
          savedInboxes: [],
        });
      }

      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const savedInboxes = await storage.getSavedInboxesByUserId(userId);
      const subscription = await storage.getUserSubscription(userId);

      res.json({
        exportedAt: new Date().toISOString(),
        user: sanitizeUser(user),
        subscription,
        savedInboxes,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error al exportar datos" });
    }
  });

  app.patch("/api/account/password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "Completa todos los campos" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Las contrasenas no coinciden" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "La contrasena debe tener al menos 6 caracteres" });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Contrasena actual incorrecta" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Error al cambiar contrasena" });
    }
  });

  app.delete("/api/account", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";
      const userId = req.session.userId!;

      if (userId === TEST_USER_ID) {
        req.session.destroy(() => {
          res.json({ success: true });
        });
        return;
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }

      await db.delete(savedInboxes).where(eq(savedInboxes.userId, userId));
      await db.delete(inboxes).where(eq(inboxes.ownerUserId, userId));
      await db.delete(subscriptionTransactions).where(eq(subscriptionTransactions.userId, userId));
      await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, userId));
      await db.delete(users).where(eq(users.id, userId));

      req.session.destroy(() => {
        res.json({ success: true });
      });
    } catch (error: any) {
      console.error("[Account] Error deleting account:", error);
      res.status(500).json({ message: "Error al eliminar la cuenta" });
    }
  });

  app.post("/api/account/usage-purpose", isAuthenticated, async (req, res) => {
    try {
      const { purpose, notes } = req.body;
      
      if (!purpose || !usagePurposes.includes(purpose)) {
        return res.status(400).json({ message: "Propósito inválido" });
      }

      const TEST_USER_ID = "test-user-id";
      const TEST_EMAIL = "test@testing.com";
      
      // Test user - return mock data with purpose set
      if (req.session.userId === TEST_USER_ID) {
        const testUser = {
          id: TEST_USER_ID,
          email: TEST_EMAIL,
          firstName: "Test",
          lastName: "User",
          isVerified: "true",
          createdAt: new Date(),
          verificationCode: null,
          verificationCodeExpires: null,
          usagePurpose: purpose,
          usagePurposeNotes: notes || null,
        };
        return res.json(testUser);
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      if (user.usagePurpose) {
        return res.status(400).json({ message: "El propósito ya fue configurado" });
      }

      await storage.updateUserUsagePurpose(req.session.userId!, purpose, notes);
      
      const updatedUser = await storage.getUserById(req.session.userId!);
      res.json(sanitizeUser(updatedUser!));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/health", async (req, res) => {
    try {
      // Check database connection
      await storage.getSavedInboxCount("health-check");
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        service: "tcorp-api"
      });
    } catch (error) {
      res.status(503).json({ status: "error", message: "Service Unavailable" });
    }
  });

  app.get("/api/status-badge", async (req, res) => {
    try {
      const theme = req.query.theme === "dark" ? "dark" : "light";
      const now = Date.now();
      const cached = badgeCache[theme];

      if (cached && now - cached.fetchedAt < BADGE_TTL_MS) {
        res.setHeader("Content-Type", cached.contentType);
        res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
        return res.send(cached.buffer);
      }

      if (badgeLastErrorAt[theme] && now - badgeLastErrorAt[theme] < BADGE_ERROR_BACKOFF_MS) {
        if (cached) {
          res.setHeader("Content-Type", cached.contentType);
          res.setHeader("Cache-Control", "public, max-age=60");
          return res.send(cached.buffer);
        }
        return res.status(503).end();
      }

      if (!badgeInFlight[theme]) {
        badgeInFlight[theme] = fetchStatusBadge(theme)
          .catch((error) => {
            console.error("[Routes] Status badge error:", error);
            return null;
          })
          .finally(() => {
            badgeInFlight[theme] = null;
          });
      }

      const fetched = await badgeInFlight[theme];
      if (fetched) {
        badgeCache[theme] = {
          buffer: fetched.buffer,
          contentType: fetched.contentType,
          fetchedAt: now,
        };
        res.setHeader("Content-Type", fetched.contentType);
        res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
        return res.send(fetched.buffer);
      }

      badgeLastErrorAt[theme] = now;
      if (cached) {
        res.setHeader("Content-Type", cached.contentType);
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.send(cached.buffer);
      }
      return res.status(502).end();
    } catch (error) {
      console.error("[Routes] Status badge error:", error);
      return res.status(502).end();
    }
  });

  app.get("/api/ads", async (req, res) => {
    try {
      const slotsParam = typeof req.query.slots === "string" ? req.query.slots : "";
      const slots = slotsParam
        ? slotsParam.split(",").map((slot) => slot.trim()).filter(Boolean)
        : undefined;

      const ads = await storage.getActiveAdSlotsByKeys(slots);
      res.json(
        ads.map((ad) => ({
          slot: ad.slot,
          html: ad.html,
        }))
      );
    } catch (error: any) {
      res.status(500).json({ message: "Error al obtener anuncios" });
    }
  });

  app.get("/api/cybertemp/domains", async (req, res) => {
    try {
      const domains = await cybertempService.getDomains();
      res.json(domains);
    } catch (error: any) {
      console.error("[Routes] Error getting domains:", error);
      res.status(500).json({ message: "Error al obtener dominios" });
    }
  });

  app.get("/api/cybertemp/plan", async (req, res) => {
    try {
      const plan = await cybertempService.getPlan();
      res.json(plan);
    } catch (error: any) {
      console.error("[Routes] Error getting plan:", error);
      res.status(500).json({ message: "Error al obtener información del plan" });
    }
  });

  app.post("/api/inbox", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";
      
      // Test user - generate mock inbox
      if (req.session.userId === TEST_USER_ID) {
        const prefix = "usr";
        const randomPart = nanoid(6).toLowerCase();
        const savedSubdomains = await storage.getCybertempSubdomains();
        const activeSubdomains = savedSubdomains.filter(s => s.status === "active");
        const usableSubdomains = activeSubdomains.length > 0 ? activeSubdomains : savedSubdomains;

        let selectedSubdomain = "";
        let selectedDomain = "";

        if (usableSubdomains.length > 0) {
          const randomSaved = usableSubdomains[Math.floor(Math.random() * usableSubdomains.length)];
          selectedSubdomain = randomSaved.subdomain;
          selectedDomain = randomSaved.domain;
        } else {
          try {
            const domains = await cybertempService.getDomains();
            const activeDomains = domains.filter(d => d.available);

            if (activeDomains.length > 0) {
              const randomDomain = activeDomains[Math.floor(Math.random() * activeDomains.length)];
              selectedDomain = randomDomain.domain;
              const subdomainPrefix = "mail";
              const randomSub = nanoid(4).toLowerCase();
              selectedSubdomain = `${subdomainPrefix}-${randomSub}`;

              await cybertempService.createSubdomain(selectedSubdomain, selectedDomain);
              await storage.createCybertempSubdomain({
                subdomain: selectedSubdomain,
                domain: selectedDomain,
                status: "active"
              });
            }
          } catch {
            // Ignore and try fallback domains.
          }
        }

        let email = "";
        if (selectedSubdomain && selectedDomain) {
          email = `${prefix}${randomPart}@${selectedSubdomain}.${selectedDomain}`;
        } else {
          const activeDomains = await storage.getActiveEmailDomains();
          if (activeDomains.length === 0) {
            return res.status(503).json({ message: "No hay dominios activos configurados." });
          }
          const selected = activeDomains[Math.floor(Math.random() * activeDomains.length)].domain;
          email = `${prefix}${randomPart}@${selected}`;
        }

        const expiresAt = new Date(Date.now() + INBOX_LIFETIME_HOURS * 60 * 60 * 1000);
        const inbox = await storage.createInbox({
          email,
          expiresAt,
          ownerUserId: TEST_USER_ID,
        });
        return res.json(inbox);
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      if (!user.usagePurpose) {
        return res.status(409).json({ 
          message: "Debes configurar para qué usarás el correo antes de generar uno",
          requiresUsagePurpose: true
        });
      }

      try {
        // Try to get a saved subdomain first
        const savedSubdomains = await storage.getCybertempSubdomains();
        const activeSubdomains = savedSubdomains.filter(s => s.status === "active");
        const usableSubdomains = activeSubdomains.length > 0 ? activeSubdomains : savedSubdomains;
        
        let selectedSubdomain;
        let selectedDomain;
        
        if (usableSubdomains.length > 0) {
          const randomSaved = usableSubdomains[Math.floor(Math.random() * usableSubdomains.length)];
          selectedSubdomain = randomSaved.subdomain;
          selectedDomain = randomSaved.domain;
        } else {
          // Fallback: Create a new one
          const domains = await cybertempService.getDomains();
          const activeDomains = domains.filter(d => d.available);
          
          if (activeDomains.length === 0) {
             return res.status(503).json({ message: "No hay dominios disponibles en CyberTemp. Intente más tarde." });
          }
          
          const randomDomain = activeDomains[Math.floor(Math.random() * activeDomains.length)];
          selectedDomain = randomDomain.domain;
          
          // Create a "nice" subdomain if possible, or random
          const prefix = "mail"; 
          const randomPart = nanoid(4).toLowerCase();
          selectedSubdomain = `${prefix}-${randomPart}`;
          
          await cybertempService.createSubdomain(selectedSubdomain, selectedDomain);
          await storage.createCybertempSubdomain({
             subdomain: selectedSubdomain,
             domain: selectedDomain,
             status: "active"
          });
        }

        const prefix = usagePurposePrefixes[user.usagePurpose as UsagePurpose] || "tmp";
        const randomPart = nanoid(6).toLowerCase();
        const randomUser = `${prefix}${randomPart}`;
        
        // Email format: user@subdomain.domain
        const email = `${randomUser}@${selectedSubdomain}.${selectedDomain}`;
        const expiresAt = new Date(Date.now() + INBOX_LIFETIME_HOURS * 60 * 60 * 1000);
        
        const inbox = await storage.createInbox({ email, expiresAt, ownerUserId: req.session.userId });
        res.json(inbox);
      } catch (cybertempError: any) {
        console.error("[Routes] CyberTemp API error:", cybertempError);
        return res.status(503).json({ message: "Error al conectar con CyberTemp API. Intente más tarde." });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inbox/:email", isAuthenticated, async (req, res) => {
    try {
      const inbox = await storage.getInboxByEmail(req.params.email);
      if (!inbox) {
        return res.status(404).json({ message: "Inbox not found" });
      }
      res.json(inbox);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inbox/:email/emails", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";

      const inbox = await storage.getInboxByEmail(req.params.email);
      if (!inbox) {
        return res.status(404).json({ message: "Inbox not found" });
      }

      if (req.session.userId === TEST_USER_ID) {
        const emails = await storage.getEmailsByInboxId(inbox.id);
        return res.json(emails);
      }

      // Check for new emails from CyberTemp if enough time has passed
      const now = Date.now();
      const lastChecked = inboxLastChecked.get(inbox.id) || 0;
      
      if (now - lastChecked > CHECK_INTERVAL_MS) {
        try {
          console.log(`[Inbox] Checking CyberTemp for new emails for ${inbox.email}...`);
          // Fetch from CyberTemp
          const remoteEmails = await cybertempService.getEmails(inbox.email);
          
          if (remoteEmails.length > 0) {
            // Get existing emails to avoid duplicates
            const existingEmails = await storage.getEmailsByInboxId(inbox.id);
            const existingCybertempIds = new Set(existingEmails.map(e => e.cybertempId).filter(Boolean));
            
            let newEmailsCount = 0;

            for (const remote of remoteEmails) {
              if (!existingCybertempIds.has(remote.id)) {
                 const newEmail = await storage.createEmail({
                   inboxId: inbox.id,
                   sender: remote.from,
                   subject: remote.subject,
                   body: remote.html || remote.text || "",
                   preview: (remote.text || "").substring(0, 150),
                   cybertempId: remote.id,
                   isRead: 0
                 });
                 newEmailsCount++;

                 // Notify via WebSocket
                 const inboxClients = clients.get(inbox.id);
                 if (inboxClients) {
                   const message = JSON.stringify({ type: "new_email", email: newEmail });
                   inboxClients.forEach(client => {
                     if (client.readyState === WebSocket.OPEN) {
                       client.send(message);
                     }
                   });
                 }
              }
            }
            if (newEmailsCount > 0) {
              console.log(`[Inbox] Synced ${newEmailsCount} new emails for ${inbox.email}`);
            }
          }
          
          inboxLastChecked.set(inbox.id, now);
        } catch (err) {
          console.error(`[Inbox] Error fetching from CyberTemp:`, err);
          // Don't fail the request, just log and continue to return DB emails
        }
      }
      
      const emails = await storage.getEmailsByInboxId(inbox.id);
      res.json(emails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/email/receive", async (req, res) => {
    try {
      const validated = insertEmailSchema.parse(req.body);
      
      const inbox = await storage.getInboxByEmail(validated.inboxId);
      if (!inbox) {
        return res.status(404).json({ message: "Inbox not found" });
      }
      
      const email = await storage.createEmail({
        ...validated,
        inboxId: inbox.id
      });
      
      const inboxClients = clients.get(inbox.id);
      if (inboxClients) {
        const message = JSON.stringify({ type: "new_email", email });
        inboxClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
      
      res.json(email);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/email/:id/read", async (req, res) => {
    try {
      await storage.markEmailAsRead(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/email/:id", async (req, res) => {
    try {
      await storage.deleteEmail(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inbox/cleanup", async (req, res) => {
    try {
      await storage.deleteExpiredInboxes();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/saved-inboxes", isAuthenticated, async (req, res) => {
    try {
      const TEST_USER_ID = "test-user-id";
      
      // Test user - return mock saved inboxes from memory
      if (req.session.userId === TEST_USER_ID) {
        return res.json({
          savedInboxes: testUserSavedInboxes,
          count: testUserSavedInboxes.length,
          limit: FREE_SAVED_INBOX_LIMIT,
          isPremium: false
        });
      }

      const savedInboxes = await storage.getSavedInboxesByUserId(req.session.userId!);
      const count = await storage.getSavedInboxCount(req.session.userId!);
      const isPremium = await storage.isUserPremium(req.session.userId!);
      
      res.json({
        savedInboxes,
        count,
        limit: isPremium ? null : FREE_SAVED_INBOX_LIMIT,
        isPremium
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/saved-inboxes", isAuthenticated, async (req, res) => {
    try {
      const { inboxId, alias } = req.body;
      
      if (!inboxId || !alias) {
        return res.status(400).json({ message: "inboxId y alias son requeridos" });
      }

      const TEST_USER_ID = "test-user-id";
      
      // Test user - allow saving mock inbox for demo purposes
      if (req.session.userId === TEST_USER_ID) {
        const mockSavedInbox = {
          id: nanoid(),
          userId: TEST_USER_ID,
          inboxId,
          alias,
          createdAt: new Date(),
        };
        testUserSavedInboxes.push(mockSavedInbox);
        return res.json(mockSavedInbox);
      }

      const inbox = await storage.getInbox(inboxId);
      if (!inbox) {
        return res.status(404).json({ message: "Inbox no encontrado" });
      }

      if (inbox.ownerUserId !== req.session.userId) {
        return res.status(403).json({ message: "No tienes permiso para guardar este inbox" });
      }

      const isPremium = await storage.isUserPremium(req.session.userId!);
      const count = await storage.getSavedInboxCount(req.session.userId!);
      
      if (!isPremium && count >= FREE_SAVED_INBOX_LIMIT) {
        return res.status(403).json({ 
          message: `Has alcanzado el límite de ${FREE_SAVED_INBOX_LIMIT} correos guardados. Actualiza a Premium para guardar ilimitados.`,
          limitReached: true
        });
      }

      await storage.makeInboxPermanent(inboxId);
      
      const savedInbox = await storage.createSavedInbox({
        userId: req.session.userId!,
        inboxId,
        alias
      });

      res.json(savedInbox);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/saved-inboxes/:id", isAuthenticated, async (req, res) => {
    try {
      const { alias } = req.body;
      
      if (!alias) {
        return res.status(400).json({ message: "alias es requerido" });
      }

      const savedInbox = await storage.getSavedInboxById(req.params.id);
      if (!savedInbox) {
        return res.status(404).json({ message: "Inbox guardado no encontrado" });
      }

      if (savedInbox.userId !== req.session.userId) {
        return res.status(403).json({ message: "No autorizado" });
      }

      await storage.updateSavedInboxAlias(req.params.id, alias);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/saved-inboxes/:id", isAuthenticated, async (req, res) => {
    try {
      const savedInbox = await storage.getSavedInboxById(req.params.id);
      if (!savedInbox) {
        return res.status(404).json({ message: "Inbox guardado no encontrado" });
      }

      if (savedInbox.userId !== req.session.userId) {
        return res.status(403).json({ message: "No autorizado" });
      }

      await storage.deleteSavedInbox(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/subscription", isAuthenticated, async (req, res) => {
    try {
      const subscription = await storage.getUserSubscription(req.session.userId!);
      const isPremium = await storage.isUserPremium(req.session.userId!);
      
      res.json({
        subscription,
        isPremium,
        priceUsd: PREMIUM_PRICE_USD
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subscription/checkout", isAuthenticated, async (req, res) => {
    try {
      const apiKey = process.env.NOWPAYMENTS_API_KEY;
      
      if (!apiKey) {
        return res.status(503).json({ message: "Pagos no configurados. Contacte al administrador." });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const response = await fetch("https://api.nowpayments.io/v1/invoice", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          price_amount: PREMIUM_PRICE_USD,
          price_currency: "usd",
          order_id: `premium_${req.session.userId}_${Date.now()}`,
          order_description: "TCorp Premium - 1 mes de almacenamiento ilimitado",
          ipn_callback_url: `${process.env.APP_URL || 'https://tcorp.email'}/api/subscription/webhook`,
          success_url: `${process.env.APP_URL || 'https://tcorp.email'}/account?payment=success`,
          cancel_url: `${process.env.APP_URL || 'https://tcorp.email'}/account?payment=cancelled`
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("NOWPayments error:", error);
        return res.status(500).json({ message: "Error al crear el pago" });
      }

      const data = await response.json();
      
      await storage.createSubscriptionTransaction({
        userId: req.session.userId!,
        eventType: "checkout_initiated",
        paymentId: data.id?.toString()
      });

      res.json({ 
        invoiceUrl: data.invoice_url,
        invoiceId: data.id
      });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subscription/webhook", async (req, res) => {
    try {
      const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
      
      if (ipnSecret) {
        const receivedSignature = req.headers['x-nowpayments-sig'] as string;
        if (receivedSignature) {
          const sortedBody = JSON.stringify(sortObject(req.body));
          const calculatedSignature = crypto
            .createHmac('sha512', ipnSecret)
            .update(sortedBody)
            .digest('hex');
          
          if (receivedSignature !== calculatedSignature) {
            console.error("Invalid IPN signature");
            return res.status(401).json({ message: "Invalid signature" });
          }
        }
      }

      const { payment_id, payment_status, order_id, actually_paid, pay_currency, purchase_id } = req.body;
      
      console.log("NOWPayments webhook received:", req.body);

      if (!order_id || !order_id.startsWith("premium_")) {
        return res.json({ success: true });
      }

      const userId = order_id.split("_")[1];
      
      if (!userId) {
        return res.json({ success: true });
      }

      const existingTx = await storage.getTransactionByPaymentId(payment_id?.toString());
      if (existingTx && existingTx.eventType === "payment_confirmed") {
        return res.json({ success: true });
      }

      await storage.createSubscriptionTransaction({
        userId,
        eventType: payment_status || "unknown",
        amount: actually_paid?.toString(),
        currency: pay_currency,
        paymentId: payment_id?.toString(),
        subscriptionId: purchase_id?.toString()
      });

      if (payment_status === "finished" || payment_status === "confirmed") {
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
        
        await storage.createOrUpdateSubscription(userId, {
          tier: "premium",
          status: "active",
          currentPeriodEnd,
          nowPaymentsSubscriptionId: purchase_id?.toString()
        });

        await storage.createSubscriptionTransaction({
          userId,
          eventType: "payment_confirmed",
          amount: actually_paid?.toString(),
          currency: pay_currency,
          paymentId: payment_id?.toString()
        });

        console.log(`User ${userId} upgraded to premium until ${currentPeriodEnd}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/captcha/lockout", async (req, res) => {
    try {
      const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || 
                       req.socket.remoteAddress || 
                       "unknown";
      
      console.log(`[Lockout] Banning IP: ${clientIp}`);
      
      // Create or update ban record
      const ban = await storage.createOrUpdateIpBan(clientIp);
      const banInfo = await storage.getIpBanInfo(clientIp);
      
      // Determine if it's permanent
      const isPermanent = 'bannedUntil' in ban ? false : true;
      
      console.log(`[Lockout] Ban created - Code: ${ban.banCode}, Permanent: ${isPermanent}, Ban Object:`, ban);
      
      // Return response with ban info
      res.json({ 
        code: ban.banCode,
        isPermanent,
        bannedUntil: ('bannedUntil' in ban) ? ban.bannedUntil : undefined
      });
    } catch (error: any) {
      console.error("Captcha lockout error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/unban", async (req, res) => {
    try {
      const { banCode } = req.body;
      
      if (!banCode) {
        return res.status(400).json({ 
          success: false,
          message: "Se requiere el código de baneo" 
        });
      }
      
      const result = await storage.unbanByCode(banCode);
      res.json(result);
    } catch (error: any) {
      console.error("Unban error:", error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  });

  app.post("/api/admin/unban-ip", async (req, res) => {
    try {
      const { ipAddress } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ 
          success: false,
          message: "Se requiere la dirección IP" 
        });
      }
      
      const result = await storage.unbanIpAddress(ipAddress);
      res.json({ 
        success: true,
        message: `IP desbaneada: ${ipAddress}`,
        deleted: result.deleted
      });
    } catch (error: any) {
      console.error("Unban IP error:", error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  });

  return httpServer;
}
