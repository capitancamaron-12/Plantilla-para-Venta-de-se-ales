import type { RequestHandler } from "express";
import { storage } from "../../server/storage";

const bannedIps = new Map<string, number>();
const loginAttempts = new Map<string, number>();
const BAN_DURATION = 24 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 3;

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

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

export function banIp(ip: string): void {
  const banUntil = Date.now() + BAN_DURATION;
  bannedIps.set(ip, banUntil);
  loginAttempts.delete(ip);
  console.log(`[Admin Security] IP ${ip} banned until ${new Date(banUntil).toISOString()}`);
}

export function recordFailedAttempt(ip: string): void {
  const attempts = (loginAttempts.get(ip) || 0) + 1;
  loginAttempts.set(ip, attempts);
  
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    banIp(ip);
  }
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export const checkBanned: RequestHandler = (req, res, next) => {
  const ip = getClientIp(req);
  
  if (isBanned(ip)) {
    return res.status(403).json({ message: "Access forbidden" });
  }
  
  next();
};

export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.session.adminId) {
    return next();
  }
  res.status(401).json({ message: "No autorizado" });
};

export const checkIpWhitelist: RequestHandler = async (req, res, next) => {
  try {
    if (req.session.adminId) {
      return next();
    }
    
    const clientIp = getClientIp(req);
    
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
      return next();
    }
    
    try {
      const allIps = await storage.getAllAdminIps();
      
      if (allIps.length === 0) {
        return next();
      }
      
      const isAllowed = await storage.isIpWhitelisted(clientIp);
      
      if (!isAllowed) {
        console.warn(`[IP Whitelist] Blocked access from ${clientIp}`);
        return res.status(403).json({ message: "Access denied" });
      }
      return next();
    } catch (dbError: any) {
      console.warn(`[IP Whitelist] Database check failed. Allowing localhost access only.`);
      return res.status(503).json({ message: "Service temporarily unavailable" });
    }
  } catch (error: any) {
    console.error("[IP Whitelist] Unexpected error:", error?.message || error);
    res.status(500).json({ message: "Error interno" });
  }
};

export const validateSlug: RequestHandler = async (req, res, next) => {
  try {
    const slug = req.params.slug || req.body.slug || req.query.slug;
    
    if (!slug) {
      return res.status(404).json({ message: "Not found" });
    }

    const { verifySlug } = await import("../../server/slug-service");
    const isValid = await verifySlug(slug as string);
    
    if (!isValid) {
      return res.status(404).json({ message: "Not found" });
    }
    
    next();
  } catch (error) {
    res.status(404).json({ message: "Not found" });
  }
};

export { getClientIp };
