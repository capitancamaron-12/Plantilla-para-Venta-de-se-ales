import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, RefreshCw, Trash2, Mail, Clock, ChevronDown, ChevronLeft, ChevronRight, Shield, AlertCircle, LogOut, User, Bookmark, Crown, Briefcase, X, Printer, Download } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Email, Inbox } from "@shared/schema";
import { usagePurposes, usagePurposeLabels, type UsagePurpose } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SavedInbox {
  id: string;
  alias: string;
  inbox: { email: string; id: string };
}

type SubscriptionResponse = {
  isPremium: boolean;
};

export default function InboxPage() {
  const { toast } = useToast();
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [inboxId, setInboxId] = useState<string>("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [adSlots, setAdSlots] = useState<Record<string, string>>({});
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const hasInitialized = useRef(false);
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAlias, setSaveAlias] = useState("");
  const [showPurposeDialog, setShowPurposeDialog] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState<UsagePurpose | "">("");
  const [purposeNotes, setPurposeNotes] = useState("");
  const [isSavingPurpose, setIsSavingPurpose] = useState(false);
  const [showSavedInboxes, setShowSavedInboxes] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedEmailCount, setDisplayedEmailCount] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(15);
  const [lastManualRefreshAt, setLastManualRefreshAt] = useState(0);
  const [showAutoRefreshOptions, setShowAutoRefreshOptions] = useState(false);
  const MANUAL_REFRESH_COOLDOWN_MS = 5000;
  const [showInboxHint, setShowInboxHint] = useState(true);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const autoRefreshSelectRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!autoRefreshSelectRef.current) return;
      if (!autoRefreshSelectRef.current.contains(event.target as Node)) {
        setShowAutoRefreshOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (autoRefreshEnabled) {
      setShowAutoRefreshOptions(false);
    }
  }, [autoRefreshEnabled]);

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ["emails", currentEmail],
    queryFn: async () => {
      if (!currentEmail) return [];
      const res = await fetch(`/api/inbox/${currentEmail}/emails`);
      if (!res.ok) throw new Error(t.inbox.fetch_emails_error);
      return res.json();
    },
    enabled: !!currentEmail && isAuthenticated,
    refetchInterval: autoRefreshEnabled ? autoRefreshSeconds * 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const { data: savedInboxesData } = useQuery({
    queryKey: ["saved-inboxes"],
    queryFn: async () => {
      const res = await fetch("/api/saved-inboxes");
      if (!res.ok) throw new Error(t.inbox.fetch_saved_inboxes_error);
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        throw new Error("Failed to fetch subscription");
      }
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60,
  });

  const showAds = subscriptionData?.isPremium === false;
  const adSlotKeys = ["dashboard-top-0", "dashboard-top-1"];

  const savedInboxes = (savedInboxesData?.savedInboxes || []) as SavedInbox[];

  useEffect(() => {
    if (!showAds) {
      setAdSlots({});
      return;
    }

    const controller = new AbortController();
    const slotsParam = adSlotKeys.join(",");

    fetch(`/api/ads?slots=${encodeURIComponent(slotsParam)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch ads");
        }
        return res.json() as Promise<{ slot: string; html: string }[]>;
      })
      .then((data) => {
        const mapping: Record<string, string> = {};
        data.forEach((ad) => {
          if (ad.slot) {
            mapping[ad.slot] = ad.html || "";
          }
        });
        setAdSlots(mapping);
      })
      .catch(() => {
        setAdSlots({});
      });

    return () => controller.abort();
  }, [showAds, adSlotKeys.join(",")]);

  useEffect(() => {
    if (emails.length === 0) {
      setDisplayedEmailCount(0);
      return;
    }

    setDisplayedEmailCount(0);

    const initialDelay = setTimeout(() => {
      setDisplayedEmailCount(1);
    }, 300);

    return () => clearTimeout(initialDelay);
  }, [emails.length]);

  useEffect(() => {
    if (displayedEmailCount === 0 || displayedEmailCount >= emails.length) {
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedEmailCount(prev => Math.min(prev + 1, emails.length));
    }, 300);

    return () => clearTimeout(timer);
  }, [displayedEmailCount, emails.length]);

  const createInboxMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inbox", { method: "POST" });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(`401: ${t.inbox.unauthorized_error}`);
        }
        if (res.status === 409) {
          const data = await res.json();
          if (data.requiresUsagePurpose) {
            throw new Error("409: requiresUsagePurpose");
          }
        }
        throw new Error(t.inbox.create_inbox_error);
      }
      return res.json() as Promise<Inbox>;
    },
    onSuccess: (inbox) => {
      setCurrentEmail(inbox.email);
      setInboxId(inbox.id);
      setupWebSocket(inbox.id);
      toast({
        title: t.inbox.new_session,
        description: t.inbox.reset_success,
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("401")) {
        setLocation("/login", { replace: true });
      }
      if (error.message.includes("requiresUsagePurpose")) {
        setShowPurposeDialog(true);
      }
    },
  });

  const saveInboxMutation = useMutation({
    mutationFn: async ({ inboxId, alias }: { inboxId: string; alias: string }) => {
      const res = await fetch("/api/saved-inboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxId, alias }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t.inbox.save_error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-inboxes"] });
      setShowSaveDialog(false);
      setSaveAlias("");
      toast({
        title: t.inbox.save_success_title,
        description: t.inbox.save_success_desc,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.inbox.error_title,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    if (showSavedInboxes && savedInboxes.length > 0) {
      // Small delay to allow rendering before checking scroll
      setTimeout(checkScroll, 50);
      // Also add resize listener
      window.addEventListener('resize', checkScroll);
      return () => window.removeEventListener('resize', checkScroll);
    }
  }, [showSavedInboxes, savedInboxes.length]);

  useEffect(() => {
    if (!showSearch) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchPanelRef.current?.contains(target)) return;
      setShowSearch(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowSearch(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSearch]);

  const scrollSavedInboxes = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300; // Adjust scroll amount as needed
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
      
      // Update arrows after scroll completes
      setTimeout(checkScroll, 350);
    }
  };

  const handleSaveInbox = () => {
    if (inboxId && saveAlias.trim()) {
      saveInboxMutation.mutate({ inboxId, alias: saveAlias.trim() });
    }
  };

  const openSaveDialog = () => {
    setSaveAlias(currentEmail.split("@")[0] || t.inbox.default_alias);
    setShowSaveDialog(true);
  };

  const handleSavePurpose = async () => {
    if (!selectedPurpose) return;
    setIsSavingPurpose(true);
    try {
      const res = await fetch("/api/account/usage-purpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          purpose: selectedPurpose, 
          notes: selectedPurpose === "other" ? purposeNotes : undefined 
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t.inbox.save_error);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowPurposeDialog(false);
      toast({
        title: t.inbox.purpose_save_title,
        description: t.inbox.purpose_save_desc,
      });
      createInboxMutation.mutate();
    } catch (error: any) {
      toast({
        title: t.inbox.error_title,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingPurpose(false);
    }
  };

  const setupWebSocket = (id: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?inboxId=${id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected for signal:", id);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_email") {
          console.log("New signal received via WebSocket");
          queryClient.invalidateQueries({ queryKey: ["emails", currentEmail] });
          toast({
            title: t.inbox.new_email_title,
            description: data.email.subject,
          });
        }
      } catch (error) {
        console.error("WebSocket message parsing error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected (signal socket)");
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    if (isAuthenticated && !hasInitialized.current) {
      hasInitialized.current = true;
      // Check if user has a usage purpose configured
      // For test user, always show the dialog to allow testing
      const isTestUser = user?.email === "test@testing.com";
      if (user && (!user.usagePurpose || isTestUser)) {
        // No purpose yet or test user, show the dialog first
        setShowPurposeDialog(true);
      } else {
        // User has a purpose, create inbox immediately
        createInboxMutation.mutate();
      }
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, user]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentEmail);
    toast({
      title: t.inbox.copied,
      description: t.inbox.ready,
      duration: 2000,
    });
  };

  const refreshInbox = () => {
    const now = Date.now();
    if (now - lastManualRefreshAt < MANUAL_REFRESH_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((MANUAL_REFRESH_COOLDOWN_MS - (now - lastManualRefreshAt)) / 1000);
      toast({
        title: t.inbox.refresh_wait_title,
        description: t.inbox.refresh_wait_desc.replace("{seconds}", `${waitSeconds}`),
      });
      return;
    }
    setLastManualRefreshAt(now);
    setIsLoading(true);
    queryClient.invalidateQueries({ queryKey: ["emails", currentEmail] });
    setTimeout(() => {
      setIsLoading(false);
      toast({
        description: t.inbox.synced,
        duration: 2000,
      });
    }, 800);
  };

  const handleAutoRefreshToggle = (checked: boolean) => {
    if (!checked) {
      setAutoRefreshEnabled(false);
      return;
    }

    const confirmed = window.confirm(t.inbox.auto_refresh_confirm);
    if (confirmed) {
      setAutoRefreshEnabled(true);
    }
  };

  const generateNewEmail = () => {
    setSelectedEmailId(null);
    createInboxMutation.mutate();
  };

  const handleLoadSavedInbox = (savedInbox: SavedInbox) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentEmail(savedInbox.inbox.email);
      setInboxId(savedInbox.inbox.id);
      setSelectedEmailId(null);
      setupWebSocket(savedInbox.inbox.id);
      setShowSavedInboxes(false);
      setIsTransitioning(false);
    }, 300);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login", { replace: true });
    } catch (error) {
      toast({
        title: t.inbox.error_title,
        description: t.inbox.logout_error,
        variant: "destructive",
      });
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return t.inbox.time_days.replace("{count}", `${days}`);
    if (hours > 0) return t.inbox.time_hours.replace("{count}", `${hours}`);
    if (minutes > 0) return t.inbox.time_minutes.replace("{count}", `${minutes}`);
    return t.inbox.time_now;
  };

  const formatDateTime = (value: string | Date) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const getSenderDomain = (sender: string) => {
    const atIndex = sender.indexOf("@");
    if (atIndex === -1) return sender;
    return sender.slice(atIndex + 1);
  };

  const getEmailPreview = (email: Email) => {
    if (email.preview?.trim()) return email.preview;
    if (!email.body) return "";
    const stripped = email.body
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.slice(0, 150);
  };

  const escapeHtml = (value: string) => {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const extractEmailBody = (body: string) => {
    const match = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : body;
  };

  const buildEmailDocument = (email: Email) => {
    const isHtml = /<[^>]+>/.test(email.body || "");
    const subject = escapeHtml(email.subject || "");
    const sender = escapeHtml(email.sender || "");
    const to = escapeHtml(currentEmail || "");
    const received = escapeHtml(formatDateTime(email.receivedAt));
    const messageId = escapeHtml(email.cybertempId || email.id);
    const bodyHtml = isHtml
      ? extractEmailBody(email.body || "")
      : `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${escapeHtml(email.body || email.preview || "")}</pre>`;

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${subject}</title>
    <style>
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #ffffff; }
      .meta { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; }
      .meta h1 { margin: 0 0 8px; font-size: 20px; }
      .meta-line { font-size: 12px; color: #374151; line-height: 1.6; }
      .content { padding: 24px; }
      img { max-width: 100%; height: auto; }
      table { width: 100%; border-collapse: collapse; }
    </style>
  </head>
  <body>
    <div class="meta">
      <h1>${subject}</h1>
      <div class="meta-line"><strong>From:</strong> ${sender}</div>
      <div class="meta-line"><strong>To:</strong> ${to}</div>
      <div class="meta-line"><strong>Received:</strong> ${received}</div>
      <div class="meta-line"><strong>Message ID:</strong> ${messageId}</div>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
  </body>
</html>`;
  };

  const getEmailFileName = (email: Email) => {
    const raw = (email.subject || "email").toLowerCase();
    const cleaned = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const fallback = `email-${(email.cybertempId || email.id).slice(0, 8)}`;
    return cleaned || fallback;
  };

  const handlePrintEmail = (email: Email) => {
    const doc = buildEmailDocument(email);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      toast({
        title: t.inbox.error_title,
        description: t.inbox.print_error,
        variant: "destructive",
      });
      return;
    }
    printWindow.document.write(doc);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleDownloadEmail = (email: Email) => {
    const doc = buildEmailDocument(email);
    const fileName = getEmailFileName(email);
    try {
      const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: t.inbox.error_title,
        description: t.inbox.download_error,
        variant: "destructive",
      });
    }
  };

  const detectEmailFormat = (body: string) => {
    return /<[^>]+>/.test(body) ? t.inbox.format_html : t.inbox.format_text;
  };

  const formatEmailSize = (body: string) => {
    const bytes = new TextEncoder().encode(body).length;
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const selectedEmail = emails.find(e => e.id === selectedEmailId);
  
  const filteredEmails = emails.slice(0, displayedEmailCount).filter(email => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return true;
    if (trimmed.startsWith("@")) {
      const senderQuery = trimmed.slice(1);
      return email.sender.toLowerCase().includes(senderQuery);
    }
    return (
      email.sender.toLowerCase().includes(trimmed) ||
      email.subject.toLowerCase().includes(trimmed) ||
      email.preview.toLowerCase().includes(trimmed)
    );
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t.inbox.checking_session}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t.inbox.redirecting_login}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show purpose as a full page before inbox
  if (showPurposeDialog) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-64px)] bg-background">
          <div className="w-full">
            <div className="grid grid-cols-2 min-h-[calc(100vh-64px)]">
              {/* Left Column - Information */}
              <div className="border-r border-border/30 p-12 flex flex-col justify-center bg-muted/20">
                <div className="max-w-md">
                  <h1 className="text-5xl font-semibold mb-6 text-foreground">
                    {t.inbox.purpose_dialog.title}
                  </h1>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    {t.inbox.purpose_dialog.description}
                  </p>
                  <div className="space-y-4 pt-4">
                    <div className="flex gap-3">
                      <div className="text-primary/60 mt-1">→</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.inbox.purpose_dialog.personalization}</p>
                        <p className="text-xs text-muted-foreground">{t.inbox.purpose_dialog.personalization_desc}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="text-primary/60 mt-1">→</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.inbox.purpose_dialog.aliases}</p>
                        <p className="text-xs text-muted-foreground">{t.inbox.purpose_dialog.aliases_desc}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="text-primary/60 mt-1">→</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.inbox.purpose_dialog.security}</p>
                        <p className="text-xs text-muted-foreground">{t.inbox.purpose_dialog.security_desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Options */}
              <div className="p-12 flex flex-col justify-center">
                <div className="max-w-md mx-auto w-full">
                  <div className="mb-12">
                    <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <span className="text-xs font-semibold text-primary uppercase tracking-widest">{t.inbox.purpose_dialog.selection_label}</span>
                    </div>
                  </div>

                  <RadioGroup 
                    value={selectedPurpose} 
                    onValueChange={(value) => setSelectedPurpose(value as UsagePurpose)}
                    className="space-y-3"
                  >
                    {usagePurposes.map((purpose) => (
                      <div 
                        key={purpose}
                        onClick={() => setSelectedPurpose(purpose)}
                        className={`group p-4 rounded-md border transition-all duration-150 cursor-pointer ${
                          selectedPurpose === purpose 
                            ? 'bg-primary/5 border-primary/60' 
                            : 'border-border/50 hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={purpose} id={purpose} data-testid={`radio-purpose-${purpose}`} className="mt-0" />
                          <Label 
                            htmlFor={purpose} 
                            className="text-sm font-medium text-foreground cursor-pointer"
                          >
                            {t.inbox.purpose_dialog.purposes[purpose]}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>

                  {selectedPurpose === "other" && (
                    <div className="mt-8 space-y-3">
                      <Label htmlFor="purpose-notes" className="text-xs font-semibold text-foreground uppercase tracking-widest">
                        {t.inbox.purpose_dialog.additional_details}
                      </Label>
                      <Textarea
                        id="purpose-notes"
                        value={purposeNotes}
                        onChange={(e) => setPurposeNotes(e.target.value)}
                        placeholder={t.inbox.purpose_dialog.additional_placeholder}
                        className="resize-none text-sm bg-background border-border/60"
                        rows={3}
                        data-testid="input-purpose-notes"
                      />
                    </div>
                  )}

                  <Button 
                    onClick={handleSavePurpose}
                    disabled={!selectedPurpose || isSavingPurpose}
                    className="w-full mt-8 h-10 text-sm font-medium"
                    data-testid="button-save-purpose"
                  >
                    {isSavingPurpose ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2"></div>
                        {t.inbox.purpose_dialog.saving_btn}
                      </>
                    ) : (
                      t.inbox.purpose_dialog.continue_btn
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground mt-6">
                    {t.inbox.purpose_dialog.security_note}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-64px)] bg-background">
        <div className="container mx-auto px-4 py-6">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{t.inbox.title}</h1>
            </div>
          </div>

          {showInboxHint && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-sm border border-border/40 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-primary/70" />
                <span>{t.inbox.inbox_hint}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setShowInboxHint(false)}
                aria-label={t.inbox.close_label}
                title={t.inbox.close_label}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )}

          <div className="border border-border/40 bg-card mb-6 px-10 py-8 rounded-sm shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70 text-center w-full">{t.inbox.active_email_label}</label>
                <div className="flex items-center gap-2">
                  <div className="bg-muted/20 px-4 py-2 rounded-sm border border-border/30 flex items-center gap-3 group transition-colors hover:border-border/60">
                    <code className="text-base font-mono font-medium text-foreground/90 tracking-tight" data-testid="text-email-address">
                      {currentEmail || t.inbox.generating}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-primary transition-all duration-200 group-hover:scale-110" 
                      onClick={copyToClipboard} 
                      title={t.inbox.copy_label}
                      disabled={!currentEmail}
                      data-testid="button-copy-email"
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-end items-center">
                <div className="flex items-center gap-2 rounded-sm border border-border/40 px-3 py-1.5 text-xs">
                  <Label htmlFor="auto-refresh" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {t.inbox.auto_refresh_label}
                  </Label>
                  <Switch
                    id="auto-refresh"
                    checked={autoRefreshEnabled}
                    onCheckedChange={handleAutoRefreshToggle}
                  />
                  <div className="auto-refresh-select" ref={autoRefreshSelectRef}>
                    <button
                      type="button"
                      className={`auto-refresh-selected ${showAutoRefreshOptions ? "is-open" : ""} ${
                        autoRefreshEnabled ? "is-disabled" : ""
                      }`}
                      onClick={() => {
                        if (autoRefreshEnabled) return;
                        setShowAutoRefreshOptions((prev) => !prev);
                      }}
                      disabled={autoRefreshEnabled}
                      aria-haspopup="listbox"
                      aria-expanded={showAutoRefreshOptions}
                    >
                      <span>{autoRefreshSeconds} s</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        className="auto-refresh-arrow"
                        aria-hidden="true"
                      >
                        <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
                      </svg>
                    </button>
                    <div
                      className={`auto-refresh-options ${showAutoRefreshOptions ? "is-open" : ""}`}
                      role="listbox"
                    >
                      {[10, 15, 20, 25, 30].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`auto-refresh-option ${autoRefreshSeconds === value ? "is-active" : ""}`}
                          onClick={() => {
                            setAutoRefreshSeconds(value);
                            setShowAutoRefreshOptions(false);
                          }}
                          role="option"
                          aria-selected={autoRefreshSeconds === value}
                        >
                          {value} s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="group h-9 px-4 gap-2 border-border/40 text-xs transition-[color,background-color,transform] duration-300 ease-out active:scale-95" 
                  onClick={() => setShowSavedInboxes(!showSavedInboxes)}
                  disabled={savedInboxes.length === 0}
                  data-testid="button-show-saved"
                >
                  <Bookmark className="size-3.5 transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.05]" />
                  <span className="font-medium transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.03]">{t.inbox.saved_label} ({savedInboxes.length})</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="group h-9 px-4 gap-2 border-border/40 text-xs transition-[color,background-color,transform] duration-300 ease-out active:scale-95" 
                  onClick={refreshInbox} 
                  disabled={autoRefreshEnabled || isLoading || !currentEmail}
                  data-testid="button-refresh"
                >
                  <RefreshCw className={`size-3.5 transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.05] ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="font-medium transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.03]">{t.inbox.refresh_label}</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="group h-9 px-4 gap-2 border-border/40 text-xs transition-[color,background-color,transform] duration-300 ease-out active:scale-95" 
                  onClick={openSaveDialog}
                  disabled={!inboxId || saveInboxMutation.isPending}
                  data-testid="button-save-inbox"
                >
                  <Bookmark className="size-3.5 transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.05]" />
                  <span className="font-medium transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.03]">{t.inbox.save_label}</span>
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  className="group h-9 px-5 gap-2 shadow-sm text-xs transition-[color,background-color,transform] duration-300 ease-out active:scale-95" 
                  onClick={generateNewEmail}
                  disabled={createInboxMutation.isPending}
                  data-testid="button-new-email"
                >
                  <Trash2 className="size-3.5 transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.05]" />
                  <span className="font-medium transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.03]">{t.inbox.new_label}</span>
                </Button>
                <p className="w-full text-[10px] text-muted-foreground text-right">
                  {t.inbox.new_info}
                </p>
              </div>
            </div>
            
            {savedInboxes.length > 0 && (
              <div className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out ${showSavedInboxes ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pt-4 border-t border-border/60 relative">
                  <label className="text-xs text-muted-foreground block mb-3 px-1">{t.inbox.saved_inboxes_label}</label>
                  
                  <div className="relative group">
                    {/* Left Arrow */}
                    <div className={`absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/80 shadow-sm border border-border/40 hover:bg-background hover:scale-110 transition-all duration-200"
                        onClick={(e) => { e.stopPropagation(); scrollSavedInboxes('left'); }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Scroll Container */}
                    <div 
                      ref={scrollContainerRef}
                      className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory px-1"
                      onScroll={checkScroll}
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {savedInboxes.map((saved, idx) => (
                        <div key={saved.id} className="snap-start shrink-0 w-[200px]">
                          <button
                            onClick={() => handleLoadSavedInbox(saved)}
                            style={{ animationDelay: showSavedInboxes ? `${idx * 50}ms` : '0ms' }}
                            className={`w-full p-3 rounded-lg border text-left transition-all duration-300 ease-out hover:shadow-md active:scale-95 ${
                              showSavedInboxes ? 'animate-in fade-in slide-in-from-bottom-2' : ''
                            } ${
                              currentEmail === saved.inbox.email
                                ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20'
                                : 'bg-card border-border/60 hover:bg-accent/50 hover:border-accent'
                            }`}
                            data-testid={`button-saved-inbox-${saved.id}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`h-2 w-2 rounded-full ${currentEmail === saved.inbox.email ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                              <div className="font-semibold text-sm text-foreground truncate">{saved.alias}</div>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate pl-4 opacity-80">{saved.inbox.email}</div>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Right Arrow */}
                    <div className={`absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-l from-background to-transparent transition-opacity duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/80 shadow-sm border border-border/40 hover:bg-background hover:scale-110 transition-all duration-200"
                        onClick={(e) => { e.stopPropagation(); scrollSavedInboxes('right'); }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {showAds && (
            <div className="dashboard-ad-strip">
              <div className="dashboard-ad-grid">
                <DashboardAdPlaceholder slot="dashboard-top-0" content={adSlots["dashboard-top-0"]} />
                <DashboardAdPlaceholder slot="dashboard-top-1" content={adSlots["dashboard-top-1"]} />
              </div>
            </div>
          )}

          <div className={`grid lg:grid-cols-12 gap-0 border border-border/60 rounded-sm bg-card shadow-sm overflow-hidden h-[650px] transition-opacity duration-300 ${isTransitioning ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-border/60 flex flex-col h-full bg-muted/5">
              <div className="p-4 border-b border-border/60 flex items-center justify-between gap-2 bg-card">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{t.inbox.inbox_header}</span>
                  <Badge variant="secondary" className="rounded-sm px-1.5 py-0 text-[10px] font-mono" data-testid="badge-email-count">{filteredEmails.length}</Badge>
                </div>
                <div className="relative flex items-center justify-end flex-1">
                  <div
                    ref={searchPanelRef}
                    className={`inbox-search absolute right-2 top-1/2 -translate-y-1/2 w-full min-w-0 overflow-hidden origin-right transition-[max-width,opacity,transform] duration-300 ease-out ${
                      showSearch ? "max-w-[360px] opacity-100 scale-x-100" : "max-w-[40px] opacity-90 scale-x-90"
                    }`}
                  >
                    <form
                      className="form"
                      onSubmit={(event) => event.preventDefault()}
                    >
                      <button
                        type="button"
                        aria-label={t.inbox.search_label}
                        onClick={() => setShowSearch(true)}
                      >
                        <svg
                          width="17"
                          height="16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          role="img"
                          aria-labelledby="search"
                        >
                          <path
                            d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9"
                            stroke="currentColor"
                            strokeWidth="1.333"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <input
                        ref={searchInputRef}
                        className="input"
                        placeholder={t.inbox.search_placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                        required
                      />
                      <button
                        className="reset"
                        type="reset"
                        aria-label={t.inbox.search_clear_label}
                        onClick={() => setSearchQuery("")}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {filteredEmails.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8">
                    <Clock className="size-8 mb-3 opacity-20" />
                    <p className="text-sm">{searchQuery ? t.inbox.no_results : t.inbox.waiting}</p>
                  </div>
                ) : (
                  filteredEmails.map((email) => {
                    const emailIndex = emails.indexOf(email);
                    const senderDomain = getSenderDomain(email.sender);
                    const previewText = getEmailPreview(email);
                    return (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmailId(email.id)}
                      style={{ animationDelay: `${emailIndex * 80}ms` }}
                      className={`p-4 cursor-pointer border-b border-border/40 transition-[background-color,box-shadow,transform,border-color] duration-300 ease-out hover:bg-muted/40 hover:shadow-sm hover:-translate-y-[1px] transform-gpu animate-in fade-in slide-in-from-left-4 ${
                        selectedEmailId === email.id ? 'bg-primary/5 border-l-2 border-l-primary shadow-sm' : 'border-l-2 border-l-transparent bg-card'
                      }`}
                      data-testid={`email-item-${email.id}`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span
                          className={`text-xs font-semibold ${!email.isRead ? 'text-primary' : 'text-foreground/80'}`}
                          title={email.sender}
                        >
                          {senderDomain}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{formatTime(email.receivedAt)}</span>
                      </div>
                      <h4 className={`text-sm mb-1 leading-tight ${!email.isRead ? 'font-medium text-foreground' : 'font-normal text-muted-foreground'}`}>
                        {email.subject}
                      </h4>
                      <p className="text-xs text-muted-foreground/70 line-clamp-1">
                        {previewText}
                      </p>
                    </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col h-full bg-card min-h-0">
              {selectedEmail ? (
                <>
                  <div className="p-6 border-b border-border/40">
                    <div className="flex justify-between items-start mb-6">
                      <h2 className="text-lg font-semibold leading-tight pr-8" data-testid="text-email-subject">{selectedEmail.subject}</h2>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label={t.inbox.print_label}
                          title={t.inbox.print_label}
                          onClick={() => handlePrintEmail(selectedEmail)}
                        >
                          <Printer className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label={t.inbox.download_label}
                          title={t.inbox.download_label}
                          onClick={() => handleDownloadEmail(selectedEmail)}
                        >
                          <Download className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-sm bg-gradient-to-br from-gray-100 to-gray-200 border flex items-center justify-center text-gray-700 font-bold text-sm">
                      {selectedEmail.sender[0].toUpperCase()}
                    </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground" data-testid="text-email-sender">{selectedEmail.sender}</p>
                        </div>
                        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                          <div className="space-y-1">
                            <span className="uppercase tracking-widest text-[10px]">{t.inbox.from_label}</span>
                            <div className="font-mono break-all text-foreground/80">{selectedEmail.sender}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="uppercase tracking-widest text-[10px]">{t.inbox.to}</span>
                            <div className="font-mono break-all text-foreground/80">{currentEmail}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="uppercase tracking-widest text-[10px]">{t.inbox.received_label}</span>
                            <div>{formatDateTime(selectedEmail.receivedAt)}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="uppercase tracking-widest text-[10px]">{t.inbox.message_id_label}</span>
                            <div className="font-mono break-all">{selectedEmail.cybertempId || selectedEmail.id}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="uppercase tracking-widest text-[10px]">{t.inbox.format_label}</span>
                            <div>{detectEmailFormat(selectedEmail.body)}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="uppercase tracking-widest text-[10px]">{t.inbox.size_label}</span>
                            <div>{formatEmailSize(selectedEmail.body)}</div>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <span className="uppercase tracking-widest text-[10px]">{t.inbox.preview_label}</span>
                            <p className="text-muted-foreground/80 line-clamp-2">
                              {getEmailPreview(selectedEmail)}
                            </p>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
                  
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div 
                      className="inbox-email-body p-8 prose prose-sm max-w-none text-foreground/90 leading-relaxed [&_*]:max-w-full [&_img]:max-w-full [&_a]:text-blue-600 [&_a]:underline [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:bg-muted [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded [&_code]:text-sm" 
                      data-testid="text-email-body"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                    />
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                  <div className="size-16 rounded-sm bg-muted/20 flex items-center justify-center mb-4">
                    <Mail className="size-6 opacity-30" />
                  </div>
                  <p className="text-sm font-medium">{t.inbox.select_msg}</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="size-5 text-amber-500" />
              {t.inbox.save_dialog_title}
            </DialogTitle>
            <DialogDescription>
              {t.inbox.save_dialog_desc}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 font-mono text-sm">
              {currentEmail}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.inbox.save_dialog_alias_label}</label>
              <Input
                value={saveAlias}
                onChange={(e) => setSaveAlias(e.target.value)}
                placeholder={t.inbox.save_dialog_alias_placeholder}
                data-testid="input-save-alias"
              />
              <p className="text-xs text-muted-foreground">
                {t.inbox.save_dialog_alias_help}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t.inbox.save_dialog_cancel}
            </Button>
            <Button 
              onClick={handleSaveInbox}
              disabled={saveInboxMutation.isPending || !saveAlias.trim()}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-confirm-save"
            >
              {saveInboxMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t.inbox.save_dialog_saving}
                </>
              ) : (
                <>
                  <Bookmark className="size-4 mr-2" />
                  {t.inbox.save_dialog_confirm}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function DashboardAdPlaceholder({ slot, content }: { slot: string; content?: string }) {
  const hasContent = Boolean(content && content.trim());
  return (
    <div
      className="dashboard-ad-placeholder"
      data-ad-slot={slot}
      aria-hidden={!hasContent}
    >
      {hasContent && (
        <div className="dashboard-ad-content" dangerouslySetInnerHTML={{ __html: content || "" }} />
      )}
    </div>
  );
}
