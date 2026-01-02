import { storage } from "./storage";

interface BlacklistCheckResult {
  domain: string;
  isBlacklisted: boolean;
  reason?: string;
}

async function checkDomainBlacklist(domain: string): Promise<BlacklistCheckResult> {
  try {
    const testEmail = `test@${domain}`;
    const response = await fetch(`https://api.host-tools.com/mail/email/${testEmail}`);
    
    if (!response.ok) {
      console.log(`[Blacklist] API error for ${domain}: ${response.status}`);
      return { domain, isBlacklisted: false };
    }
    
    const data = await response.json();
    
    const isBlacklisted = data.disposable === true || data.blocked === true;
    
    return {
      domain,
      isBlacklisted,
      reason: isBlacklisted ? "Dominio detectado como temporal/disposable" : undefined
    };
  } catch (error) {
    console.error(`[Blacklist] Error checking ${domain}:`, error);
    return { domain, isBlacklisted: false };
  }
}

export async function verifyDomainNotBlacklisted(domain: string): Promise<{ valid: boolean; reason?: string }> {
  const result = await checkDomainBlacklist(domain);
  
  if (result.isBlacklisted) {
    return { valid: false, reason: result.reason };
  }
  
  return { valid: true };
}

export async function checkAllDomainsForBlacklist(): Promise<void> {
  try {
    let domains: any[] = [];
    try {
      domains = await storage.getActiveEmailDomains();
    } catch (dbError: any) {
      // Database unavailable - skip blacklist check
      console.warn("[Blacklist] Database unavailable, skipping blacklist check");
      return;
    }

    if (domains.length === 0) {
      return;
    }

    console.log(`[Blacklist] Checking ${domains.length} domain(s)...`);

    for (const domain of domains) {
      const result = await checkDomainBlacklist(domain.domain);

      if (result.isBlacklisted) {
        console.log(`[Blacklist] Domain ${domain.domain} is blacklisted. Disabling...`);
        try {
          await storage.updateEmailDomain(domain.id, "false");
        } catch (dbError) {
          console.warn(`[Blacklist] Could not update domain ${domain.domain} in database`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("[Blacklist] Check completed");
  } catch (error: any) {
    console.warn("[Blacklist] Unexpected error:", error?.message || error);
  }
}

let checkInterval: NodeJS.Timeout | null = null;

export function startBlacklistMonitoring(intervalHours: number = 24): void {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  setTimeout(() => {
    checkAllDomainsForBlacklist();
  }, 60 * 1000);
  
  const intervalMs = intervalHours * 60 * 60 * 1000;
  checkInterval = setInterval(checkAllDomainsForBlacklist, intervalMs);
  
  console.log(`[Blacklist] Monitoring started. Checking every ${intervalHours} hours.`);
}

export function stopBlacklistMonitoring(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log("[Blacklist] Monitoring stopped");
  }
}
