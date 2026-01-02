import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { adminLoginSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import session from "express-session";
import MemoryStore from "memorystore";
import { verifyAdminCredentials, generateNewSlug, startSlugRotation, getActiveSlugInfo, markSlugAsNotified, deriveCredentialsFromSlug, verifySlug } from "./slug-service";
import { sendAdminSlugNotification } from "./email";
import { verifyDomainNotBlacklisted, checkAllDomainsForBlacklist } from "./blacklist-service";
import { cybertempService } from "./cybertemp-service";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { logActivity } from "./logger-service";

declare module "express-session" {
  interface SessionData {
    adminId?: string;
    pendingAdminId?: string;
    requires2FA?: boolean;
    validatedSlug?: string;
    sessionSlug?: string; // Store the slug used for this session
  }
}

const bannedIps = new Map<string, number>();
const loginAttempts = new Map<string, number>();
const BAN_DURATION = 24 * 60 * 60 * 1000; // 24 horas

function isBanned(ip: string): boolean {
  const banExpiry = bannedIps.get(ip);
  if (banExpiry && Date.now() < banExpiry) {
    return true;
  }
  if (banExpiry) {
    bannedIps.delete(ip);
  }
  return false;
}

function banIp(ip: string): void {
  const banUntil = Date.now() + BAN_DURATION;
  bannedIps.set(ip, banUntil);
  loginAttempts.delete(ip);
  console.log(`[Admin Security] IP ${ip} banned until ${new Date(banUntil).toISOString()}`);
  
  logActivity({
    type: "security",
    action: "ip_banned",
    ip,
    details: { banUntil: new Date(banUntil).toISOString(), reason: "Failed login attempt" },
    success: true,
  }).catch(err => console.error("[Logger] Failed to log IP ban:", err));
}

function recordFailedAttempt(ip: string): void {
  const attempts = (loginAttempts.get(ip) || 0) + 1;
  loginAttempts.set(ip, attempts);
  
  if (attempts >= 1) {
    banIp(ip);
  }
}

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export async function registerAdminRoutes(app: Express): Promise<void> {
  const sessionTtl = 2 * 60 * 60 * 1000;
  const memoryStore = MemoryStore(session);
  const adminSessionStore = new memoryStore({
    checkPeriod: sessionTtl,
  });

  const adminSession = session({
    name: 'admin.sid',
    secret: process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || "admin-secret-change-in-production",
    store: adminSessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: 'strict',
    },
  });

  const isAdmin: RequestHandler = (req, res, next) => {
    if (req.session.adminId) {
      return next();
    }
    res.status(401).json({ message: "No autorizado" });
  };

  const checkIpWhitelist: RequestHandler = async (req, res, next) => {
    try {
      // If already authenticated, skip IP whitelist check
      if (req.session.adminId) {
        return next();
      }
      
      const clientIp = getClientIp(req);
      
      try {
        const allIps = await storage.getAllAdminIps();
        
        // If no IPs are whitelisted, allow access (so first admin can log in and add their IP)
        if (allIps.length === 0) {
          return next();
        }
        
        const isAllowed = await storage.isIpWhitelisted(clientIp);
        
        if (!isAllowed) {
          return res.status(403).json({ message: "Not found" });
        }
        return next();
      } catch (dbError: any) {
        // Database unavailable - log warning and allow access (so first admin can still set up)
        const msg = dbError?.message || "Database error";
        console.warn(`[IP Whitelist] Database check failed (${msg}). Allowing access for initial setup.`);
        return next();
      }
    } catch (error: any) {
      console.error("[IP Whitelist] Unexpected error:", error?.message || error);
      res.status(500).json({ message: "Error interno" });
    }
  };

  const validateSlug: RequestHandler = async (req, res, next) => {
    try {
      const slug = req.params.slug || req.body.slug;
      
      if (!slug) {
        return res.status(404).json({ message: "Not found" });
      }

      const isValid = await verifySlug(slug);
      if (!isValid) {
        return res.status(404).json({ message: "Not found" });
      }
      
      next();
    } catch (error) {
      res.status(404).json({ message: "Not found" });
    }
  };

  // CRITICAL: Register ALL routes BEFORE starting slug rotation
  // This ensures routes are available even if slug rotation fails
  app.get("/api/admin-auth/current-slug", async (req, res) => {
    try {
      const activeSlug = await storage.getActiveAdminSlug();
      if (!activeSlug) {
        return res.status(404).json({ message: "No active slug" });
      }

      // Don't expose the hash, just metadata
      res.json({
        expiresAt: activeSlug.expiresAt,
        createdAt: (activeSlug as any).createdAt || new Date(),
      });
    } catch (error) {
      res.status(500).json({ message: "Error interno" });
    }
  });

  // IMPORTANT: This endpoint is PUBLIC and does NOT create a session
  // Validation happens here, session creation only happens during login
  app.post("/api/admin-auth/validate-slug", async (req, res) => {
    try {
      const ip = getClientIp(req);
      
      if (isBanned(ip)) {
        return res.status(403).json({ message: "Access forbidden" });
      }

      const { slug } = req.body;
      
      if (!slug) {
        return res.status(404).json({ message: "Not found" });
      }

      const isValid = await verifySlug(slug);
      if (!isValid) {
        return res.status(404).json({ message: "Not found" });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error("[Admin Auth] Error validating slug:", error);
      res.status(404).json({ message: "Not found" });
    }
  });

  app.post("/api/admin-auth/login", adminSession, checkIpWhitelist, async (req, res) => {
    try {
      const ip = getClientIp(req);
      
      if (isBanned(ip)) {
        return res.status(403).json({ message: "banned" });
      }

      const { slug, username, password } = req.body;

      if (!slug || !username || !password) {
        recordFailedAttempt(ip);
        return res.status(403).json({ message: "banned" });
      }

      // Verify both slug validity AND credentials match the slug (ephemeral credentials only)
      const credentialsValid = await verifyAdminCredentials(slug, username, password);
      if (!credentialsValid) {
        await logActivity({
          type: "auth_attempt",
          action: "login_failed",
          ip,
          userAgent: req.headers['user-agent'],
          details: { username, slug: slug.substring(0, 16) + "..." },
          success: false,
        });
        recordFailedAttempt(ip);
        return res.status(403).json({ message: "banned" });
      }

      // Create or get a system admin (just for session management)
      let admin;
      try {
        admin = await storage.getAdminByEmail("system-admin@internal");
        if (!admin) {
          admin = await storage.createAdmin({
            email: "system-admin@internal",
            password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
          });
        }
      } catch (dbError: any) {
        // Database unavailable - create in-memory admin entry for this session
        console.warn("[Admin Login] Database unavailable, using memory admin. Error:", dbError?.message);
        admin = {
          id: crypto.randomBytes(16).toString('hex'),
          email: "system-admin@internal",
          password: "",
          twoFactorEnabled: "false",
          twoFactorSecret: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      if (admin.twoFactorEnabled === "true") {
        req.session.pendingAdminId = admin.id;
        req.session.requires2FA = true;
        req.session.validatedSlug = slug;
        req.session.sessionSlug = slug;
        return res.json({ requires2FA: true });
      }

      req.session.adminId = admin.id;
      req.session.sessionSlug = slug;
      
      await logActivity({
        type: "auth_attempt",
        action: "login",
        adminId: admin.id,
        ip,
        userAgent: req.headers['user-agent'],
        details: { username, method: admin.twoFactorEnabled === "true" ? "2fa_pending" : "direct" },
        success: true,
      });
      
      const { password: _, twoFactorSecret: __, ...adminWithoutSensitive } = admin;
      res.json(adminWithoutSensitive);
    } catch (error: any) {
      console.error("[Admin Login] Unexpected error:", error?.message || error);
      res.status(500).json({ message: "Error interno" });
    }
  });

  app.post("/api/admin-auth/verify-2fa", adminSession, checkIpWhitelist, async (req, res) => {
    try {
      const ip = getClientIp(req);
      
      if (isBanned(ip)) {
        return res.status(403).json({ message: "banned" });
      }

      const { code, slug } = req.body;

      if (!req.session.pendingAdminId || !req.session.requires2FA) {
        return res.status(401).json({ message: "Sesión inválida" });
      }

      const isSlugValid = await verifySlug(slug);
      if (!isSlugValid || slug !== req.session.validatedSlug) {
        delete req.session.pendingAdminId;
        delete req.session.requires2FA;
        delete req.session.validatedSlug;
        return res.status(401).json({ message: "Slug inválido o expirado. Inicia sesión nuevamente.", slugExpired: true });
      }

      const admin = await storage.getAdminById(req.session.pendingAdminId);
      if (!admin || !admin.twoFactorSecret) {
        return res.status(401).json({ message: "Error de autenticación" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: process.env.ADMIN_2FA_ISSUER || "TCorp Admin",
        label: admin.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(admin.twoFactorSecret)
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        return res.status(401).json({ message: "Código 2FA inválido" });
      }

      req.session.adminId = admin.id;
      const validSlug = req.session.validatedSlug || req.session.sessionSlug;
      req.session.sessionSlug = slug; // Bind slug to session
      delete req.session.pendingAdminId;
      delete req.session.requires2FA;
      delete req.session.validatedSlug;
      
      const { password: _, twoFactorSecret: __, ...adminWithoutSensitive } = admin;
      res.json({ ...adminWithoutSensitive, slug: validSlug });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/logout", adminSession, checkIpWhitelist, async (req, res) => {
    const adminId = req.session.adminId;
    const ip = getClientIp(req);
    
    if (adminId) {
      await logActivity({
        type: "auth_attempt",
        action: "logout",
        adminId,
        ip,
        userAgent: req.headers['user-agent'],
        success: true,
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.clearCookie("admin.sid");
      res.json({ message: "Sesión cerrada" });
    });
  });

  app.get("/api/admin-logs", adminSession, isAdmin, async (req, res) => {
    try {
      const { limit = "100", offset = "0", type, action, success } = req.query;
      
      const logs = await storage.getAdminLogs({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        type: type as any,
        action: action as any,
        success: success === "true" ? true : success === "false" ? false : undefined,
      });
      
      const total = await storage.getAdminLogsCount({
        type: type as any,
        action: action as any,
        success: success === "true" ? true : success === "false" ? false : undefined,
      });
      
      res.json({ logs, total });
    } catch (error: any) {
      console.error("[Admin Logs] Error fetching logs:", error);
      res.status(500).json({ message: "Error al obtener logs" });
    }
  });

  // CRITICAL: This endpoint must validate the slug BEFORE checking admin session
  // Otherwise any request creates a session and allows access
  app.get("/api/admin-auth/me", adminSession, async (req, res, next) => {
    try {
      const currentSlug = req.query.slug as string;
      console.log("[Admin Auth] GET /me - slug received:", currentSlug?.substring(0, 16) + "...");
      
      // 1. FIRST: Validate the slug is valid (required before anything else)
      if (!currentSlug) {
        console.log("[Admin Auth] GET /me - No slug provided");
        return res.status(401).json({ message: "Slug requerido" });
      }
      
      const slugIsValid = await verifySlug(currentSlug);
      console.log("[Admin Auth] GET /me - Slug validation result:", slugIsValid);
      
      if (!slugIsValid) {
        // Slug is invalid - reject immediately, don't create session
        console.log("[Admin Auth] GET /me - REJECTING: Invalid slug");
        return res.status(401).json({ message: "Slug inválido" });
      }
      
      // 2. ONLY AFTER slug validation: Check if admin session exists
      if (!req.session.adminId) {
        // No session yet - user hasn't logged in
        console.log("[Admin Auth] GET /me - No adminId in session");
        return res.status(401).json({ message: "No autenticado" });
      }
      
      // 3. CRITICAL FIX: ALWAYS verify session slug matches current slug
      // If sessionSlug is missing (old sessions) OR doesn't match, reject
      if (!req.session.sessionSlug || req.session.sessionSlug !== currentSlug) {
        // Session was created with different slug or no slug at all
        console.log("[Admin Auth] GET /me - REJECTING: Slug mismatch or missing. Session slug:", req.session.sessionSlug?.substring(0, 16) || "undefined", "Current slug:", currentSlug.substring(0, 16));
        // Destroy invalid session
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Slug inválido para esta sesión" });
      }
      
      console.log("[Admin Auth] GET /me - Authenticated successfully");
      const admin = await storage.getAdminById(req.session.adminId);
      if (!admin) {
        return res.status(404).json({ message: "Admin no encontrado" });
      }
      
      const { password: _, twoFactorSecret: __, ...adminWithoutSensitive } = admin;
      res.json(adminWithoutSensitive);
    } catch (error: any) {
      console.error("[Admin Auth] GET /me - Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/2fa/setup", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin) {
        return res.status(404).json({ message: "Admin no encontrado" });
      }

      const secret = new OTPAuth.Secret({ size: 20 });
      
      const totp = new OTPAuth.TOTP({
        issuer: process.env.ADMIN_2FA_ISSUER || "TCorp Admin",
        label: admin.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: secret
      });

      const otpauthUrl = totp.toString();
      const qrCode = await QRCode.toDataURL(otpauthUrl);

      res.json({
        secret: secret.base32,
        qrCode,
        otpauthUrl
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/2fa/enable", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { secret, code } = req.body;

      if (!secret || !code) {
        return res.status(400).json({ message: "Secret y código son requeridos" });
      }

      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin) {
        return res.status(404).json({ message: "Admin no encontrado" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: process.env.ADMIN_2FA_ISSUER || "TCorp Admin",
        label: admin.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        return res.status(400).json({ message: "Código inválido. Verifica que tu app de autenticación esté sincronizada." });
      }

      await storage.updateAdminTwoFactor(admin.id, secret, "true");

      res.json({ message: "2FA habilitado correctamente" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/2fa/disable", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { code } = req.body;

      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin || !admin.twoFactorSecret) {
        return res.status(404).json({ message: "2FA no está configurado" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: process.env.ADMIN_2FA_ISSUER || "TCorp Admin",
        label: admin.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(admin.twoFactorSecret)
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        return res.status(400).json({ message: "Código inválido" });
      }

      await storage.updateAdminTwoFactor(admin.id, null, "false");

      res.json({ message: "2FA deshabilitado" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/2fa/status", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin) {
        return res.status(404).json({ message: "Admin no encontrado" });
      }
      
      res.json({ 
        enabled: admin.twoFactorEnabled === "true"
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/users", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/inboxes", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const inboxes = await storage.getAllInboxes();
      res.json(inboxes);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin-auth/users/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "Usuario eliminado" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/stats", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const inboxes = await storage.getAllInboxes();
      const purposeStats = await storage.getUsagePurposeStats();
      res.json({
        totalUsers: users.length,
        verifiedUsers: users.filter(u => u.isVerified === "true").length,
        totalInboxes: inboxes.length,
        usagePurposeStats: purposeStats,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/whitelist", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const ips = await storage.getAllAdminIps();
      res.json(ips);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/whitelist", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { ipAddress, label } = req.body;
      if (!ipAddress) {
        return res.status(400).json({ message: "IP es requerida" });
      }
      const ip = await storage.createAdminIp({ ipAddress, label });
      res.json(ip);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin-auth/whitelist/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await storage.deleteAdminIp(req.params.id);
      res.json({ message: "IP eliminada" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/rotate-slug", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const result = await generateNewSlug();
      
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const baseUrl = process.env.APP_URL || 'http://localhost:5000';
        
        const sent = await sendAdminSlugNotification(adminEmail, result.slug, result.expiresAt, baseUrl);
        if (sent) {
          await markSlugAsNotified(result.slugId);
        }
      }
      
      res.json({ 
        message: "Slug rotado exitosamente",
        newSlug: result.slug,
        expiresAt: result.expiresAt
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/slug-info", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const info = await getActiveSlugInfo();
      res.json(info);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/my-ip", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      res.json({ ip: clientIp });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/domains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const domains = await storage.getAllEmailDomains();
      res.json(domains);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/domains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { domain, skipBlacklistCheck } = req.body;
      if (!domain) {
        return res.status(400).json({ message: "Dominio es requerido" });
      }
      const domainLower = domain.toLowerCase().trim();
      
      if (!skipBlacklistCheck) {
        const blacklistCheck = await verifyDomainNotBlacklisted(domainLower);
        if (!blacklistCheck.valid) {
          return res.status(400).json({ 
            message: `El dominio está en lista negra: ${blacklistCheck.reason}`,
            isBlacklisted: true
          });
        }
      }
      
      const newDomain = await storage.createEmailDomain({ domain: domainLower, isActive: "true" });
      res.json(newDomain);
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        return res.status(400).json({ message: "Este dominio ya existe" });
      }
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin-auth/domains/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      await storage.updateEmailDomain(req.params.id, isActive);
      res.json({ message: "Dominio actualizado" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin-auth/domains/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await storage.deleteEmailDomain(req.params.id);
      res.json({ message: "Dominio eliminado" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/domains/check-blacklist", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await checkAllDomainsForBlacklist();
      const domains = await storage.getAllEmailDomains();
      res.json({ message: "Verificación completada", domains });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/domains/:id/check", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const domains = await storage.getAllEmailDomains();
      const domain = domains.find(d => d.id === req.params.id);
      
      if (!domain) {
        return res.status(404).json({ message: "Dominio no encontrado" });
      }
      
      const result = await verifyDomainNotBlacklisted(domain.domain);
      
      if (!result.valid) {
        await storage.updateEmailDomain(domain.id, "false");
        return res.json({ 
          isBlacklisted: true, 
          message: result.reason,
          disabled: true
        });
      }
      
      res.json({ isBlacklisted: false, message: "Dominio no está en lista negra" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Cybertemp Email Management Routes
  app.get("/api/admin-auth/cybertemp/domains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const domains = await cybertempService.getDomains();
      res.json(domains);
    } catch (error: any) {
      res.status(400).json({ message: "Error al obtener dominios: " + error.message });
    }
  });

  app.post("/api/admin-auth/cybertemp/create-email", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { email, domain } = req.body;
      
      if (!email || !domain) {
        return res.status(400).json({ message: "Señal y dominio son requeridos" });
      }

      // Create in database
      const tempEmail = await storage.createTempEmail({
        email,
        domain,
        status: "active"
      });

      res.json({ message: "Señal temporal creada", tempEmail });
    } catch (error: any) {
      res.status(400).json({ message: "Error al crear la señal: " + error.message });
    }
  });

  app.get("/api/admin-auth/cybertemp/emails/:email", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { email } = req.params;
      const { limit = "25", offset = "0" } = req.query;
      
      const emails = await cybertempService.getEmails(
        email,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json(emails);
    } catch (error: any) {
      res.status(400).json({ message: "Error al obtener señales: " + error.message });
    }
  });

  app.get("/api/admin-auth/cybertemp/temp-emails", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const tempEmails = await storage.getAllTempEmails();
      res.json(tempEmails);
    } catch (error: any) {
      res.status(400).json({ message: "Error al obtener señales temporales: " + error.message });
    }
  });

  app.delete("/api/admin-auth/cybertemp/temp-emails/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const tempEmail = await storage.getAllTempEmails().then(emails => 
        emails.find(e => e.id === req.params.id)
      );
      
      if (!tempEmail) {
        return res.status(404).json({ message: "Email temporal no encontrado" });
      }

      // Delete from Cybertemp API
      try {
        await cybertempService.deleteInbox(tempEmail.email);
      } catch (e) {
        console.warn("[Admin] Error deleting from Cybertemp:", e);
      }

      // Delete from database
      await storage.deleteTempEmail(req.params.id);
      res.json({ message: "Email temporal eliminado" });
    } catch (error: any) {
      res.status(400).json({ message: "Error al eliminar email: " + error.message });
    }
  });

  app.get("/api/admin-auth/cybertemp/plan", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const plan = await cybertempService.getPlan();
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ message: "Error al obtener plan: " + error.message });
    }
  });

  app.get("/api/admin-auth/cybertemp/subdomains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const subdomains = await storage.getCybertempSubdomains();
      res.json(subdomains);
    } catch (error: any) {
      res.status(400).json({ message: "Error al obtener subdominios: " + error.message });
    }
  });

  app.post("/api/admin-auth/cybertemp/create-subdomains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { domain, count = 1 } = req.body;
      if (!domain) {
        return res.status(400).json({ message: "Dominio es requerido" });
      }

      const created = [];
      for (let i = 0; i < count; i++) {
        const subdomainName = `sub${Date.now()}-${i}`;
        try {
          await cybertempService.createSubdomain(subdomainName, domain);
          const subdomain = await storage.createCybertempSubdomain({
            subdomain: subdomainName,
            domain: domain,
            status: "active"
          });
          created.push(subdomain);
        } catch (e) {
          console.warn(`[Admin] Error creating subdomain ${subdomainName}.${domain}:`, e);
        }
      }

      res.json({ 
        message: `${created.length} subdominios creados`,
        subdomains: created
      });
    } catch (error: any) {
      res.status(400).json({ message: "Error al crear subdominios: " + error.message });
    }
  });

  app.post("/api/admin-auth/cybertemp/generate-subdomains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { quantity = 3 } = req.body;
      const quantityNum = Math.max(1, Math.min(parseInt(quantity) || 3, 10));
      
      console.log(`[Admin Routes] Starting subdomain generation for ${quantityNum} total subdomains...`);
      const domains = await cybertempService.getDomains();
      console.log(`[Admin Routes] Retrieved ${domains.length} domains from CyberTemp`);
      
      const activeDomains = domains.filter(d => d.available);
      console.log(`[Admin Routes] ${activeDomains.length} domains are available`);
      
      if (activeDomains.length === 0) {
        return res.status(503).json({ message: "No hay dominios disponibles" });
      }

      const results = [];
      let workingDomain: string | null = null;

      for (const domain of activeDomains) {
        try {
          console.log(`[Admin Routes] Testing domain ${domain.domain}...`);
          
          const testSubdomain = cybertempService.generateRandomSubdomain();
          await cybertempService.createSubdomain(testSubdomain, domain.domain);
          
          console.log(`[Admin Routes] Domain ${domain.domain} is working!`);
          
          const saved = await storage.createCybertempSubdomain({
            subdomain: testSubdomain,
            domain: domain.domain,
            status: "active"
          });
          results.push(saved);
          workingDomain = domain.domain;
          break;
          
        } catch (error) {
          console.warn(`[Admin Routes] Domain ${domain.domain} failed, trying next...`, error);
          continue;
        }
      }

      if (!workingDomain) {
        return res.status(503).json({ message: "No se encontró ningún dominio funcional" });
      }

      for (let i = 1; i < quantityNum; i++) {
        try {
          const subdomain = cybertempService.generateRandomSubdomain();
          console.log(`[Admin Routes] Creating subdomain ${subdomain}.${workingDomain}...`);
          
          await cybertempService.createSubdomain(subdomain, workingDomain);
          
          const saved = await storage.createCybertempSubdomain({
            subdomain,
            domain: workingDomain,
            status: "active"
          });
          
          results.push(saved);
        } catch (error) {
          console.error(`Failed to create subdomain on ${workingDomain}:`, error);
        }
      }

      res.json({ 
        message: `Generated ${results.length} subdomains in domain ${workingDomain}`,
        subdomains: results 
      });
    } catch (error: any) {
      console.error("[Admin Routes] Error generating subdomains:", error);
      res.status(500).json({ message: "Error al generar subdominios: " + (error.message || String(error)) });
    }
  });

  app.delete("/api/admin-auth/cybertemp/subdomains/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const subdomains = await storage.getCybertempSubdomains();
      const subdomain = subdomains.find(s => s.id === req.params.id);
      
      if (!subdomain) {
        return res.status(404).json({ message: "Subdominio no encontrado" });
      }

      try {
        await cybertempService.deleteSubdomain(subdomain.subdomain, subdomain.domain);
      } catch (e) {
        console.warn("[Admin] Error deleting from Cybertemp:", e);
      }

      await storage.deleteCybertempSubdomain(req.params.id);
      res.json({ message: "Subdominio eliminado" });
    } catch (error: any) {
      res.status(400).json({ message: "Error al eliminar subdominio: " + error.message });
    }
  });

  app.get("/api/admin-auth/emails", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const emails = await storage.getAllEmails();
      res.json(emails);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin-auth/emails/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await storage.deleteEmailById(req.params.id);
      
      await logActivity({
        type: "admin_action",
        action: "delete_email",
        adminId: req.session.adminId,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        details: { emailId: req.params.id },
        success: true,
      });
      
      res.json({ message: "Email eliminado" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/system-stats", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin-auth/blocked-ips", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const blockedIps = await storage.getAllBlockedIps();
      res.json(blockedIps);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin-auth/blocked-ips", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { ipAddress, reason } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ message: "IP es requerida" });
      }

      const blocked = await storage.createBlockedIp({
        ipAddress,
        reason: reason || "Manual block",
      });
      
      await logActivity({
        type: "security",
        action: "ip_blocked_manually",
        adminId: req.session.adminId,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        details: { blockedIp: ipAddress, reason },
        success: true,
      });
      
      res.json(blocked);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin-auth/blocked-ips/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const blockedIps = await storage.getAllBlockedIps();
      const blockedIp = blockedIps.find(ip => ip.id === req.params.id);
      
      await storage.deleteBlockedIp(req.params.id);
      
      await logActivity({
        type: "security",
        action: "ip_unblocked",
        adminId: req.session.adminId,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        details: { unblockedIpId: req.params.id, unblockedIpAddress: blockedIp?.ipAddress },
        success: true,
      });
      
      res.json({ message: "IP desbloqueada" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // CRITICAL FIX: Start slug rotation AFTER all routes are registered
  // This ensures routes are available even if slug rotation fails
  try {
    console.log("[Admin Security] Starting slug rotation system...");
    await startSlugRotation((newSlug, expiresAt, slugId) => {
      const credentials = deriveCredentialsFromSlug(newSlug);
      console.log(`[Admin Security] New slug generated, expires at: ${expiresAt.toISOString()}`);
      console.log(`[Admin Security] Access URL: /secure/${newSlug}`);
      console.log(`[Admin Security] Credentials - Username: ${credentials.username}, Password: ${credentials.password}`);

      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          const baseUrl = process.env.APP_URL || 'http://localhost:5000';

          sendAdminSlugNotification(adminEmail, newSlug, expiresAt, baseUrl)
            .then((sent) => {
              if (sent) {
                markSlugAsNotified(slugId);
                console.log(`[Admin Security] Slug notification email sent to ${adminEmail}`);
              } else {
                console.log(`[Admin Security] Failed to send notification. New slug: /secure/${newSlug}`);
              }
            })
            .catch((error) => {
              console.error("[Admin Security] Error sending notification:", error);
            });
        } else {
          console.log(`[Admin Security] No ADMIN_EMAIL configured. New slug: /secure/${newSlug}`);
        }
      } catch (error) {
        console.error("[Admin Security] Error in slug rotation callback:", error);
      }
    });
    console.log("[Admin Security] Slug rotation system initialized successfully");
  } catch (error: any) {
    console.error("[Admin Security] CRITICAL: Failed to start slug rotation. Routes are registered but slug system is unavailable.");
    console.error("[Admin Security] Error details:", error?.message || error);
    console.error("[Admin Security] Stack trace:", error?.stack);
    console.error("[Admin Security] To fix: Ensure database is connected and admin_slugs table exists");
  }
}
