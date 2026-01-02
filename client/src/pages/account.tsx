import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, Crown, Trash2, Edit2, Check, X, 
  Clock, Shield, LogOut, Bell, Eye, Download, KeyRound
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SavedInboxWithInbox {
  id: string;
  userId: string;
  inboxId: string;
  alias: string;
  createdAt: string;
  inbox: {
    id: string;
    email: string;
    createdAt: string;
    expiresAt: string;
  };
}

interface SavedInboxesResponse {
  savedInboxes: SavedInboxWithInbox[];
  count: number;
  limit: number | null;
  isPremium: boolean;
}

interface SubscriptionResponse {
  subscription: {
    id: string;
    userId: string;
    tier: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  isPremium: boolean;
  priceUsd: number;
}

type AccountPreferences = {
  twoFactorEnabled: boolean;
  securityAlertsEnabled: boolean;
  privacyModeEnabled: boolean;
};

export default function AccountPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState("");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorDialog, setShowTwoFactorDialog] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    otpauthUrl: string;
  } | null>(null);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState("");
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);
  const [privacyModeEnabled, setPrivacyModeEnabled] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast({
        title: "Pago procesado",
        description: "Tu suscripción Premium está siendo activada. Puede tomar unos minutos.",
      });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["saved-inboxes"] });
      window.history.replaceState({}, "", "/account");
    } else if (params.get("payment") === "cancelled") {
      toast({
        title: "Pago cancelado",
        description: "El proceso de pago fue cancelado.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/account");
    }
  }, [toast, queryClient]);

  const { data: savedInboxesData, isLoading: loadingSaved } = useQuery<SavedInboxesResponse>({
    queryKey: ["saved-inboxes"],
    queryFn: async () => {
      const res = await fetch("/api/saved-inboxes");
      if (!res.ok) throw new Error("Error al cargar señales guardadas");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: subscriptionData, isLoading: loadingSub } = useQuery<SubscriptionResponse>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscription");
      if (!res.ok) throw new Error("Error al cargar suscripción");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: preferencesData } = useQuery<AccountPreferences>({
    queryKey: ["account-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/account/preferences");
      if (!res.ok) throw new Error("Error al cargar preferencias");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const updateAliasMutation = useMutation({
    mutationFn: async ({ id, alias }: { id: string; alias: string }) => {
      const res = await fetch(`/api/saved-inboxes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-inboxes"] });
      setEditingId(null);
      toast({ description: "Alias actualizado" });
    },
    onError: () => {
      toast({ description: "Error al actualizar alias", variant: "destructive" });
    },
  });

  const deleteSavedMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/saved-inboxes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-inboxes"] });
      toast({ description: "Señal eliminada de tu cuenta" });
    },
    onError: () => {
      toast({ description: "Error al eliminar", variant: "destructive" });
    },
  });

  const preferencesMutation = useMutation({
    mutationFn: async (updates: Partial<AccountPreferences>) => {
      const res = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al guardar preferencias");
      }
      return res.json() as Promise<AccountPreferences>;
    },
    onSuccess: (data) => {
      setTwoFactorEnabled(data.twoFactorEnabled);
      setSecurityAlertsEnabled(data.securityAlertsEnabled);
      setPrivacyModeEnabled(data.privacyModeEnabled);
      queryClient.invalidateQueries({ queryKey: ["account-preferences"] });
      toast({ description: "Preferencias actualizadas" });
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const setupTwoFactorMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account/2fa/setup", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al configurar 2FA");
      }
      return res.json() as Promise<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string }>;
    },
    onSuccess: (data) => {
      setTwoFactorSetup(data);
      setTwoFactorSetupCode("");
      setShowTwoFactorDialog(true);
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const confirmTwoFactorMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/account/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al confirmar 2FA");
      }
      return res.json() as Promise<{ twoFactorEnabled: boolean }>;
    },
    onSuccess: (data) => {
      setTwoFactorEnabled(!!data.twoFactorEnabled);
      setShowTwoFactorDialog(false);
      setTwoFactorSetup(null);
      setTwoFactorSetupCode("");
      queryClient.invalidateQueries({ queryKey: ["account-preferences"] });
      toast({ description: "2FA activado correctamente" });
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const disableTwoFactorMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account/2fa/disable", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al desactivar 2FA");
      }
      return res.json() as Promise<{ twoFactorEnabled: boolean }>;
    },
    onSuccess: (data) => {
      setTwoFactorEnabled(!!data.twoFactorEnabled);
      queryClient.invalidateQueries({ queryKey: ["account-preferences"] });
      toast({ description: "2FA desactivado" });
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al cambiar contrasena");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Contrasena actualizada" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordDialog(false);
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/subscription/checkout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al iniciar pago");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, "_blank");
        setShowUpgradeDialog(false);
        toast({
          title: "Pago iniciado",
          description: "Se abrió una ventana para completar el pago con criptomonedas.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al eliminar la cuenta");
      }
    },
    onSuccess: async () => {
      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta fue eliminada correctamente.",
      });
      try {
        await logout();
      } catch {
        // ignore logout errors after account deletion
      }
      setLocation("/login", { replace: true });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (preferencesData) {
      setTwoFactorEnabled(preferencesData.twoFactorEnabled);
      setSecurityAlertsEnabled(preferencesData.securityAlertsEnabled);
      setPrivacyModeEnabled(preferencesData.privacyModeEnabled);
    }
  }, [preferencesData]);

  const handleLogout = async () => {
    await logout();
    setLocation("/login", { replace: true });
  };

  const startEditing = (saved: SavedInboxWithInbox) => {
    setEditingId(saved.id);
    setEditAlias(saved.alias);
  };

  const saveEdit = () => {
    if (editingId && editAlias.trim()) {
      updateAliasMutation.mutate({ id: editingId, alias: editAlias.trim() });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAlias("");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAccountEmail = (email?: string | null) => {
    if (!email) return "";
    if (!privacyModeEnabled) return email;
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const visible = local.slice(0, 2);
    const masked = `${visible}${"*".repeat(Math.max(1, local.length - 2))}`;
    return `${masked}@${domain}`;
  };

  if (authLoading || !isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const isPremium = subscriptionData?.isPremium || false;
  const savedCount = savedInboxesData?.count || 0;
  const limit = savedInboxesData?.limit;
  const savedInboxes = savedInboxesData?.savedInboxes || [];

  return (
    <Layout>
      <div className="min-h-[calc(100vh-64px)] bg-background">
        <div className="container mx-auto px-6 py-8 max-w-5xl">
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Mi cuenta</h1>
              <p className="text-muted-foreground text-sm mt-1">Gestiona tu información y señales guardadas</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/inbox")}
                data-testid="button-go-inbox"
                className="group transition-[color,background-color,transform] duration-300 ease-out"
              >
                <Mail className="size-4 mr-2 transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.05]" />
                <span className="transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.03]">Inbox</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
                className="group transition-[color,background-color,transform] duration-300 ease-out"
              >
                <LogOut className="size-4 mr-2 transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.05]" />
                <span className="transition-transform duration-300 ease-out transform-gpu group-hover:scale-[1.03]">Salir</span>
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="space-y-5">
                <div className="flex items-start justify-between pb-5 border-b border-border/50">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Perfil</h2>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Señal</p>
                    <p className="text-sm text-foreground break-all" data-testid="text-user-email">
                      {formatAccountEmail(user?.email)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Plan</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={isPremium ? "default" : "secondary"} data-testid="badge-plan">
                        {isPremium ? "Premium" : "Gratis"}
                      </Badge>
                      {isPremium && subscriptionData?.subscription?.currentPeriodEnd && (
                        <span className="text-xs text-muted-foreground">
                          hasta {formatDate(subscriptionData.subscription.currentPeriodEnd)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Señales guardadas</p>
                    <p className="text-sm text-foreground" data-testid="text-saved-count">
                      {savedCount} {limit !== null ? `/ ${limit}` : "ilimitados"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {!isPremium && (
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="flex items-start justify-between pb-6 border-b border-border/50 mb-4">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Suscripción Premium</h2>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Señales guardadas ilimitadas</p>
                    <p className="text-2xl font-bold text-foreground">${subscriptionData?.priceUsd || 2} <span className="text-base font-normal text-muted-foreground">USD/mes</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Pago con criptomonedas</p>
                  </div>
                  <Button 
                    onClick={() => setShowUpgradeDialog(true)}
                    data-testid="button-upgrade"
                    className="w-full md:w-auto"
                  >
                    Obtener Premium
                  </Button>
                </div>
              </div>
            )}

            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-start justify-between pb-6 border-b border-border/50 mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configuracion y seguridad</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Autenticacion con app</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Configura una app de autenticacion para generar codigos al iniciar sesion.</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
                      {twoFactorEnabled ? "Activo" : "Desactivado"}
                    </Badge>
                    {twoFactorEnabled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disableTwoFactorMutation.mutate()}
                        disabled={disableTwoFactorMutation.isPending || setupTwoFactorMutation.isPending || confirmTwoFactorMutation.isPending}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setupTwoFactorMutation.mutate()}
                        disabled={setupTwoFactorMutation.isPending || confirmTwoFactorMutation.isPending}
                      >
                        Configurar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bell className="size-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Alertas de inicio de sesion</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Recibe notificaciones cuando tu cuenta se usa en otro dispositivo.</p>
                  </div>
                  <Switch
                    checked={securityAlertsEnabled}
                    onCheckedChange={(value) => {
                      setSecurityAlertsEnabled(value);
                      preferencesMutation.mutate({ securityAlertsEnabled: value });
                    }}
                    disabled={preferencesMutation.isPending}
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Eye className="size-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Modo privado</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Oculta tu correo en listados y paneles compartidos.</p>
                  </div>
                  <Switch
                    checked={privacyModeEnabled}
                    onCheckedChange={(value) => {
                      setPrivacyModeEnabled(value);
                      preferencesMutation.mutate({ privacyModeEnabled: value });
                    }}
                    disabled={preferencesMutation.isPending}
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Download className="size-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Descargar datos</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Exporta tus señales guardadas y preferencias.</p>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-export-data" onClick={async () => {
                    try {
                      const res = await fetch("/api/account/export");
                      if (!res.ok) throw new Error("Error al exportar datos");
                      const data = await res.json();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      const date = new Date().toISOString().slice(0, 10);
                      link.href = url;
                      link.download = `tcorp-datos-${date}.json`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      URL.revokeObjectURL(url);
                    } catch (error: any) {
                      toast({ description: error.message || "Error al exportar", variant: "destructive" });
                    }
                  }}>
                    Exportar
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setShowPasswordDialog(true);
                  }}
                  data-testid="button-change-password"
                >
                  <KeyRound className="size-4 mr-2" />
                  Cambiar contrasena
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  data-testid="button-close-sessions"
                >
                  Cerrar sesion en este dispositivo
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-start justify-between pb-6 border-b border-border/50 mb-4">
                <h2 className="text-sm font-semibold text-destructive uppercase tracking-wide">Acciones de cuenta</h2>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <p className="text-sm font-medium text-foreground">Eliminar cuenta</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta accion es permanente. Se eliminarán tu cuenta, señales guardadas e historial del panel.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteConfirmText("");
                    setShowDeleteDialog(true);
                  }}
                  data-testid="button-delete-account"
                >
                  Eliminar cuenta
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-start justify-between pb-6 border-b border-border/50 mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Señales Guardadas</h2>
              </div>
              {loadingSaved ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : savedInboxes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="size-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-sm">No tienes señales guardadas</p>
                  <p className="text-xs mt-1">Ve al panel de señales y guarda una señal para verla aquí</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/inbox")}>
                    Ir al Inbox
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedInboxes.map((saved) => (
                    <div
                      key={saved.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      data-testid={`saved-inbox-${saved.id}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {editingId === saved.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editAlias}
                                onChange={(e) => setEditAlias(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                data-testid="input-edit-alias"
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit} data-testid="button-save-alias">
                                <Check className="size-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit} data-testid="button-cancel-edit">
                                <X className="size-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium text-sm truncate" data-testid={`text-alias-${saved.id}`}>{saved.alias}</p>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {formatAccountEmail(saved.inbox.email)}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground hidden md:block">
                          <Clock className="size-3 inline mr-1" />
                          {formatDate(saved.createdAt)}
                        </span>
                        {editingId !== saved.id && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => startEditing(saved)}
                              data-testid={`button-edit-${saved.id}`}
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteSavedMutation.mutate(saved.id)}
                              data-testid={`button-delete-${saved.id}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <Dialog
        open={showTwoFactorDialog}
        onOpenChange={(open) => {
          setShowTwoFactorDialog(open);
          if (!open) {
            setTwoFactorSetup(null);
            setTwoFactorSetupCode("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-muted-foreground" />
              Configurar autenticador
            </DialogTitle>
            <DialogDescription>
              Escanea el QR en Google Authenticator, Authy o similar y luego escribe el codigo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3">
              {twoFactorSetup?.qrCodeDataUrl ? (
                <img
                  src={twoFactorSetup.qrCodeDataUrl}
                  alt="QR 2FA"
                  className="h-40 w-40 rounded-lg border border-border/60 bg-white p-2"
                />
              ) : (
                <div className="h-40 w-40 rounded-lg border border-border/60 flex items-center justify-center text-xs text-muted-foreground">
                  Generando QR...
                </div>
              )}

              {twoFactorSetup?.secret && (
                <div className="w-full text-xs text-muted-foreground">
                  Secreto manual
                  <div className="mt-1 rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-foreground break-all">
                    {twoFactorSetup.secret}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Codigo del autenticador</label>
              <Input
                value={twoFactorSetupCode}
                onChange={(e) => setTwoFactorSetupCode(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                data-testid="input-2fa-code"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTwoFactorDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => confirmTwoFactorMutation.mutate(twoFactorSetupCode)}
              disabled={!twoFactorSetupCode.trim() || confirmTwoFactorMutation.isPending || setupTwoFactorMutation.isPending}
              data-testid="button-confirm-2fa"
            >
              {confirmTwoFactorMutation.isPending ? "Confirmando..." : "Confirmar 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Eliminar cuenta
            </DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminaran tu cuenta, inboxes y datos guardados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Para confirmar, escribe <span className="font-semibold text-foreground">ELIMINAR</span>.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder="ELIMINAR"
              data-testid="input-delete-confirm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteConfirmText !== "ELIMINAR" || deleteAccountMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "Eliminando..." : "Eliminar cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-muted-foreground" />
              Cambiar contrasena
            </DialogTitle>
            <DialogDescription>
              Actualiza tu contrasena para mantener tu cuenta segura.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Contrasena actual</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nueva contrasena</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Confirmar contrasena</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => passwordMutation.mutate()}
              disabled={
                passwordMutation.isPending ||
                !currentPassword ||
                newPassword.length < 6 ||
                newPassword !== confirmPassword
              }
              data-testid="button-confirm-password"
            >
              {passwordMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="size-5 text-amber-500" />
              Actualizar a Premium
            </DialogTitle>
            <DialogDescription>
              Obtén almacenamiento ilimitado de correos temporales
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-semibold">Plan Premium Mensual</p>
                <p className="text-sm text-muted-foreground">Señales guardadas ilimitadas</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${subscriptionData?.priceUsd || 2}</p>
                <p className="text-xs text-muted-foreground">USD / mes</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-green-600" />
                <span>Señales guardadas ilimitadas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-green-600" />
                <span>Sin expiración de señales guardadas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-green-600" />
                <span>Pago mensual voluntario</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
              <Shield className="size-4 text-muted-foreground shrink-0" />
              <p className="text-muted-foreground">
                Pago seguro con criptomonedas. Se aceptan Bitcoin, Ethereum, USDT y más.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              data-testid="button-confirm-upgrade"
            >
              {checkoutMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                "Pagar con Cripto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
