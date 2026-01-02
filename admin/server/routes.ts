import type { Express } from "express";
import { storage } from "../../server/storage";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import session from "express-session";
import MemoryStore from "memorystore";
import { 
  verifyAdminCredentials, 
  generateNewSlug, 
  startSlugRotation, 
  getActiveSlugInfo, 
  markSlugAsNotified, 
  deriveCredentialsFromSlug, 
  verifySlug 
} from "../../server/slug-service";
import { sendAdminSlugNotification } from "../../server/email";
import { verifyDomainNotBlacklisted, checkAllDomainsForBlacklist } from "../../server/blacklist-service";
import { cybertempService } from "../../server/cybertemp-service";
import { logActivity } from "../../server/logger-service";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { 
  checkBanned, 
  isAdmin, 
  checkIpWhitelist, 
  validateSlug, 
  getClientIp,
  recordFailedAttempt,
  clearLoginAttempts 
} from "./middleware";

export async function registerAdminRoutes(app: Express): Promise<void> {
  const sessionTtl = 4 * 60 * 60 * 1000;
  const memoryStore = MemoryStore(session);
  const adminSessionStore = new memoryStore({
    checkPeriod: sessionTtl,
  });

  const adminSession = session({
    name: 'admin.panel.sid',
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

  app.get("/api/admin/current-slug", async (req, res) => {
    try {
      const activeSlug = await storage.getActiveAdminSlug();
      if (!activeSlug) {
        return res.status(404).json({ message: "No active slug" });
      }

      res.json({
        expiresAt: activeSlug.expiresAt,
        createdAt: (activeSlug as any).createdAt || new Date(),
      });
    } catch (error) {
      res.status(500).json({ message: "Error interno" });
    }
  });

  app.post("/api/admin/validate-slug", checkBanned, async (req, res) => {
    try {
      const ip = getClientIp(req);
      const { slug } = req.body;
      
      if (!slug) {
        recordFailedAttempt(ip);
        return res.status(404).json({ message: "Not found" });
      }

      const isValid = await verifySlug(slug);
      if (!isValid) {
        recordFailedAttempt(ip);
        return res.status(404).json({ message: "Not found" });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error("[Admin Auth] Error validating slug:", error);
      res.status(404).json({ message: "Not found" });
    }
  });

  app.post("/api/admin/login", adminSession, checkIpWhitelist, checkBanned, async (req, res) => {
    try {
      const ip = getClientIp(req);
      const { slug, username, password } = req.body;

      if (!slug || !username || !password) {
        recordFailedAttempt(ip);
        return res.status(403).json({ message: "Credenciales invalidas" });
      }

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
        return res.status(403).json({ message: "Credenciales invalidas" });
      }

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
        console.warn("[Admin Login] Database unavailable, using memory admin.");
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
      clearLoginAttempts(ip);
      
      await logActivity({
        type: "auth_attempt",
        action: "login",
        adminId: admin.id,
        ip,
        userAgent: req.headers['user-agent'],
        details: { username, method: "direct" },
        success: true,
      });
      
      const { password: _, twoFactorSecret: __, ...adminWithoutSensitive } = admin;
      res.json(adminWithoutSensitive);
    } catch (error: any) {
      console.error("[Admin Login] Unexpected error:", error?.message || error);
      res.status(500).json({ message: "Error interno" });
    }
  });

  app.post("/api/admin/verify-2fa", adminSession, checkIpWhitelist, checkBanned, async (req, res) => {
    try {
      const ip = getClientIp(req);
      const { code, slug } = req.body;

      if (!req.session.pendingAdminId || !req.session.requires2FA) {
        return res.status(401).json({ message: "Sesion invalida" });
      }

      const isSlugValid = await verifySlug(slug);
      if (!isSlugValid || slug !== req.session.validatedSlug) {
        delete req.session.pendingAdminId;
        delete req.session.requires2FA;
        delete req.session.validatedSlug;
        return res.status(401).json({ message: "Slug invalido o expirado", slugExpired: true });
      }

      const admin = await storage.getAdminById(req.session.pendingAdminId);
      if (!admin || !admin.twoFactorSecret) {
        return res.status(401).json({ message: "Error de autenticacion" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: process.env.ADMIN_2FA_ISSUER || "TCorp Admin Panel",
        label: admin.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(admin.twoFactorSecret)
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        recordFailedAttempt(ip);
        return res.status(401).json({ message: "Codigo 2FA invalido" });
      }

      req.session.adminId = admin.id;
      req.session.sessionSlug = slug;
      delete req.session.pendingAdminId;
      delete req.session.requires2FA;
      delete req.session.validatedSlug;
      clearLoginAttempts(ip);
      
      await logActivity({
        type: "auth_attempt",
        action: "login",
        adminId: admin.id,
        ip,
        userAgent: req.headers['user-agent'],
        details: { method: "2fa" },
        success: true,
      });
      
      const { password: _, twoFactorSecret: __, ...adminWithoutSensitive } = admin;
      res.json(adminWithoutSensitive);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/logout", adminSession, async (req, res) => {
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
        return res.status(500).json({ message: "Error al cerrar sesion" });
      }
      res.clearCookie("admin.panel.sid");
      res.json({ message: "Sesion cerrada" });
    });
  });

  app.get("/api/admin/me", adminSession, async (req, res) => {
    try {
      const currentSlug = req.query.slug as string;
      
      if (!currentSlug) {
        return res.status(401).json({ message: "Slug requerido" });
      }
      
      const slugIsValid = await verifySlug(currentSlug);
      if (!slugIsValid) {
        return res.status(401).json({ message: "Slug invalido" });
      }
      
      if (!req.session.adminId) {
        return res.status(401).json({ message: "No autenticado" });
      }
      
      if (!req.session.sessionSlug || req.session.sessionSlug !== currentSlug) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Slug invalido para esta sesion" });
      }
      
      const admin = await storage.getAdminById(req.session.adminId);
      if (!admin) {
        return res.status(404).json({ message: "Admin no encontrado" });
      }
      
      const { password: _, twoFactorSecret: __, ...adminWithoutSensitive } = admin;
      res.json(adminWithoutSensitive);
    } catch (error: any) {
      console.error("[Admin Auth] Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/2fa/setup", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin) {
        return res.status(404).json({ message: "Admin no encontrado" });
      }

      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: process.env.ADMIN_2FA_ISSUER || "TCorp Admin Panel",
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

  app.post("/api/admin/2fa/enable", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { secret, code } = req.body;

      if (!secret || !code) {
        return res.status(400).json({ message: "Secret y codigo son requeridos" });
      }

      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin) {
        return res.status(404).json({ message: "Admin no encontrado" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: process.env.ADMIN_2FA_ISSUER || "TCorp Admin Panel",
        label: admin.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        return res.status(400).json({ message: "Codigo invalido" });
      }

      await storage.updateAdminTwoFactor(admin.id, secret, "true");

      res.json({ message: "2FA habilitado correctamente" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/2fa/disable", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { code } = req.body;

      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin || !admin.twoFactorSecret) {
        return res.status(404).json({ message: "2FA no esta configurado" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: process.env.ADMIN_2FA_ISSUER || "TCorp Admin Panel",
        label: admin.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(admin.twoFactorSecret)
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        return res.status(400).json({ message: "Codigo invalido" });
      }

      await storage.updateAdminTwoFactor(admin.id, null, "false");

      res.json({ message: "2FA deshabilitado" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/2fa/status", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin) {
        return res.status(404).json({ message: "Admin no encontrado" });
      }
      
      res.json({ enabled: admin.twoFactorEnabled === "true" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/logs", adminSession, isAdmin, async (req, res) => {
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
      
      const parsedLogs = logs.map((log: any) => {
        if (typeof log.details !== "string") return log;
        try {
          return { ...log, details: JSON.parse(log.details) };
        } catch {
          return { ...log, details: null };
        }
      });

      res.json({ logs: parsedLogs, total });
    } catch (error: any) {
      console.error("[Admin Logs] Error:", error);
      res.status(500).json({ message: "Error al obtener logs" });
    }
  });

  app.get("/api/admin/ads", adminSession, checkIpWhitelist, isAdmin, async (_req, res) => {
    try {
      const ads = await storage.getAdSlots();
      res.json(ads);
    } catch (error: any) {
      res.status(500).json({ message: "Error al obtener anuncios" });
    }
  });

  app.post("/api/admin/ads", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { slot, html, isActive = true } = req.body as {
        slot?: string;
        html?: string;
        isActive?: boolean;
      };

      if (!slot || !html) {
        return res.status(400).json({ message: "Slot y HTML son requeridos" });
      }

      const saved = await storage.upsertAdSlot({
        slot: String(slot).trim(),
        html: String(html),
        isActive: Boolean(isActive),
      });

      res.json(saved);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Error al guardar anuncio" });
    }
  });

  app.delete("/api/admin/ads/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await storage.deleteAdSlot(req.params.id);
      res.json({ message: "Anuncio eliminado" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Error al eliminar anuncio" });
    }
  });

  app.get("/api/admin/users", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/inboxes", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const inboxes = await storage.getAllInboxes();
      res.json(inboxes);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/users/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      
      await logActivity({
        type: "admin_action",
        action: "delete_user",
        adminId: req.session.adminId,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        details: { userId: req.params.id },
        success: true,
      });
      
      res.json({ message: "Usuario eliminado" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/stats", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
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

  app.get("/api/admin/whitelist", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const ips = await storage.getAllAdminIps();
      res.json(ips);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/whitelist", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { ipAddress, label } = req.body;
      if (!ipAddress) {
        return res.status(400).json({ message: "IP es requerida" });
      }
      const ip = await storage.createAdminIp({ ipAddress, label });
      
      await logActivity({
        type: "security",
        action: "ip_whitelisted",
        adminId: req.session.adminId,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        details: { whitelistedIp: ipAddress, label },
        success: true,
      });
      
      res.json(ip);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/whitelist/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await storage.deleteAdminIp(req.params.id);
      res.json({ message: "IP eliminada" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/rotate-slug", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const result = await generateNewSlug();
      
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const baseUrl = process.env.APP_URL || `http://${process.env.ADMIN_HOST || '127.0.0.1'}:${process.env.ADMIN_PORT || '3001'}`;
        
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

  app.get("/api/admin/slug-info", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const info = await getActiveSlugInfo();
      res.json(info);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/my-ip", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      res.json({ ip: clientIp });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/domains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const domains = await storage.getAllEmailDomains();
      res.json(domains);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/domains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
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
            message: `El dominio esta en lista negra: ${blacklistCheck.reason}`,
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

  app.patch("/api/admin/domains/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      await storage.updateEmailDomain(req.params.id, isActive);
      res.json({ message: "Dominio actualizado" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/domains/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await storage.deleteEmailDomain(req.params.id);
      res.json({ message: "Dominio eliminado" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/domains/check-blacklist", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      await checkAllDomainsForBlacklist();
      const domains = await storage.getAllEmailDomains();
      res.json({ message: "Verificacion completada", domains });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/domains/:id/check", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
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
      
      res.json({ isBlacklisted: false, message: "Dominio no esta en lista negra" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/cybertemp/domains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const domains = await cybertempService.getDomains();
      res.json(domains);
    } catch (error: any) {
      res.status(400).json({ message: "Error al obtener dominios: " + error.message });
    }
  });

  app.post("/api/admin/cybertemp/create-email", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { email, domain } = req.body;
      
      if (!email || !domain) {
        return res.status(400).json({ message: "Señal y dominio son requeridos" });
      }

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

  app.get("/api/admin/cybertemp/emails/:email", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
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

  app.get("/api/admin/cybertemp/temp-emails", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const tempEmails = await storage.getAllTempEmails();
      res.json(tempEmails);
    } catch (error: any) {
      res.status(400).json({ message: "Error al obtener señales temporales: " + error.message });
    }
  });

  app.delete("/api/admin/cybertemp/temp-emails/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const tempEmail = await storage.getAllTempEmails().then(emails => 
        emails.find(e => e.id === req.params.id)
      );
      
      if (!tempEmail) {
        return res.status(404).json({ message: "Email temporal no encontrado" });
      }

      try {
        await cybertempService.deleteInbox(tempEmail.email);
      } catch (e) {
        console.warn("[Admin] Error deleting from Cybertemp:", e);
      }

      await storage.deleteTempEmail(req.params.id);
      res.json({ message: "Email temporal eliminado" });
    } catch (error: any) {
      res.status(400).json({ message: "Error al eliminar email: " + error.message });
    }
  });

  app.get("/api/admin/cybertemp/plan", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const plan = await cybertempService.getPlan();
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ message: "Error al obtener plan: " + error.message });
    }
  });

  app.get("/api/admin/cybertemp/subdomains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const subdomains = await storage.getCybertempSubdomains();
      res.json(subdomains);
    } catch (error: any) {
      res.status(400).json({ message: "Error al obtener subdominios: " + error.message });
    }
  });

  app.post("/api/admin/cybertemp/subdomains/bulk-delete", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids.filter((id: unknown) => typeof id === "string")
        : [];

      if (ids.length === 0) {
        return res.status(400).json({ message: "Ids requeridos" });
      }

      res.status(202).json({ message: "Eliminacion en proceso", queued: ids.length });

      setTimeout(() => {
        (async () => {
          const subdomains = await storage.getCybertempSubdomains();
          const targets = subdomains.filter((sub) => ids.includes(sub.id));

          for (const subdomain of targets) {
            try {
              await storage.deleteCybertempSubdomain(subdomain.id);
            } catch (e) {
              console.warn("[Admin] Error deleting subdomain from database:", e);
            }
          }
        })().catch((e) => {
          console.warn("[Admin] Error processing bulk subdomain delete:", e);
        });
      }, 0);
    } catch (error: any) {
      res.status(400).json({ message: "Error al eliminar subdominios: " + error.message });
    }
  });

  app.post("/api/admin/cybertemp/generate-subdomains", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const { quantity = 3 } = req.body;
      const quantityNum = Math.max(1, Math.min(parseInt(quantity) || 3, 10));
      
      const domains = await cybertempService.getDomains();
      const activeDomains = domains.filter(d => d.available);
      
      if (activeDomains.length === 0) {
        return res.status(503).json({ message: "No hay dominios disponibles" });
      }

      const results = [];
      let workingDomain: string | null = null;

      for (const domain of activeDomains) {
        try {
          const testSubdomain = cybertempService.generateRandomSubdomain();
          await cybertempService.createSubdomain(testSubdomain, domain.domain);
          
          const saved = await storage.createCybertempSubdomain({
            subdomain: testSubdomain,
            domain: domain.domain,
            status: "active"
          });
          results.push(saved);
          workingDomain = domain.domain;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!workingDomain) {
        return res.status(503).json({ message: "No se encontro ningun dominio funcional" });
      }

      for (let i = 1; i < quantityNum; i++) {
        try {
          const subdomain = cybertempService.generateRandomSubdomain();
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

  app.delete("/api/admin/cybertemp/subdomains/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const subdomains = await storage.getCybertempSubdomains();
      const subdomain = subdomains.find(s => s.id === req.params.id);
      
      if (!subdomain) {
        return res.status(404).json({ message: "Subdominio no encontrado" });
      }

      await storage.deleteCybertempSubdomain(req.params.id);
      res.json({ message: "Subdominio eliminado" });
    } catch (error: any) {
      res.status(400).json({ message: "Error al eliminar subdominio: " + error.message });
    }
  });

  app.get("/api/admin/emails", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const inboxId = typeof req.query.inboxId === "string" ? req.query.inboxId : undefined;
      const emails = await storage.getAllEmails(inboxId);
      res.json(emails);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/emails/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
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

  app.get("/api/admin/system-stats", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/blocked-ips", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
    try {
      const blockedIps = await storage.getAllBlockedIps();
      res.json(blockedIps);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/blocked-ips", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
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

  app.delete("/api/admin/blocked-ips/:id", adminSession, checkIpWhitelist, isAdmin, async (req, res) => {
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

  try {
    console.log("[Admin Panel] Starting slug rotation system...");
    await startSlugRotation((newSlug, expiresAt, slugId) => {
      const credentials = deriveCredentialsFromSlug(newSlug);
      console.log(`[Admin Panel] New slug generated, expires at: ${expiresAt.toISOString()}`);
      console.log(`[Admin Panel] Access URL: http://${process.env.ADMIN_HOST || '127.0.0.1'}:${process.env.ADMIN_PORT || '3001'}/secure/${newSlug}`);
      console.log(`[Admin Panel] Credentials - Username: ${credentials.username}, Password: ${credentials.password}`);

      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          const baseUrl = `http://${process.env.ADMIN_HOST || '127.0.0.1'}:${process.env.ADMIN_PORT || '3001'}`;

          sendAdminSlugNotification(adminEmail, newSlug, expiresAt, baseUrl)
            .then((sent) => {
              if (sent) {
                markSlugAsNotified(slugId);
                console.log(`[Admin Panel] Slug notification email sent to ${adminEmail}`);
              }
            })
            .catch((error) => {
              console.error("[Admin Panel] Error sending notification:", error);
            });
        }
      } catch (error) {
        console.error("[Admin Panel] Error in slug rotation callback:", error);
      }
    });
    console.log("[Admin Panel] Slug rotation system initialized successfully");
  } catch (error: any) {
    console.error("[Admin Panel] CRITICAL: Failed to start slug rotation.");
    console.error("[Admin Panel] Error details:", error?.message || error);
  }
}



