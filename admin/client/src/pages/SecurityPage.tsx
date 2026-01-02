import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { Shield, Plus, Trash2, Smartphone, Loader2, CheckCircle, XCircle } from "lucide-react";

interface WhitelistedIp {
  id: string;
  ipAddress: string;
  label?: string;
  createdAt: string;
}

export default function SecurityPage() {
  const { slug } = useAuth();
  const queryClient = useQueryClient();
  const [newIp, setNewIp] = useState("");
  const [newIpLabel, setNewIpLabel] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [show2FASetup, setShow2FASetup] = useState(false);

  const { data: myIp } = useQuery({
    queryKey: ["my-ip", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/my-ip`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch IP");
      const data = await res.json();
      return data.ip as string;
    },
  });

  const { data: whitelistedIps = [], isLoading } = useQuery({
    queryKey: ["whitelist", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/whitelist`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch whitelist");
      return res.json() as Promise<WhitelistedIp[]>;
    },
  });

  const { data: twoFactorStatus } = useQuery({
    queryKey: ["2fa-status", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/2fa/status`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch 2FA status");
      const data = await res.json();
      return data.enabled as boolean;
    },
  });

  const { data: twoFactorSetup, refetch: refetch2FASetup } = useQuery({
    queryKey: ["2fa-setup", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/2fa/setup`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to setup 2FA");
      return res.json() as Promise<{ secret: string; qrCode: string; otpauthUrl: string }>;
    },
    enabled: false,
  });

  const addIpMutation = useMutation({
    mutationFn: async ({ ip, label }: { ip: string; label?: string }) => {
      const res = await fetch(`/api/admin/whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress: ip, label }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add IP");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whitelist"] });
      setNewIp("");
      setNewIpLabel("");
    },
  });

  const deleteIpMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/whitelist/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete IP");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whitelist"] });
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: async ({ secret, code }: { secret: string; code: string }) => {
      const res = await fetch(`/api/admin/2fa/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to enable 2FA");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setShow2FASetup(false);
      setTwoFactorCode("");
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/admin/2fa/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to disable 2FA");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setTwoFactorCode("");
    },
  });

  const handleAddIp = () => {
    if (!newIp.trim()) return;
    addIpMutation.mutate({ ip: newIp.trim(), label: newIpLabel.trim() || undefined });
  };

  const handleDeleteIp = (id: string, ipAddress: string) => {
    if (window.confirm(`Estas seguro de eliminar la IP ${ipAddress}?`)) {
      deleteIpMutation.mutate(id);
    }
  };

  const handleSetup2FA = () => {
    refetch2FASetup();
    setShow2FASetup(true);
  };

  const handleEnable2FA = () => {
    if (!twoFactorSetup || !twoFactorCode) return;
    enable2FAMutation.mutate({ secret: twoFactorSetup.secret, code: twoFactorCode });
  };

  const handleDisable2FA = () => {
    if (!twoFactorCode) return;
    if (window.confirm("Estas seguro de desactivar 2FA?")) {
      disable2FAMutation.mutate(twoFactorCode);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuracion de Seguridad</h1>
        <p className="text-zinc-400">Gestion de acceso y autenticacion de dos factores</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-white">IP Whitelist</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Solo las IPs en esta lista podran acceder al panel admin
          </p>

          {myIp && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">Tu IP actual: <span className="font-mono font-semibold">{myIp}</span></p>
            </div>
          )}

          <div className="space-y-3 mb-4">
            <input
              type="text"
              placeholder="IP Address (ej: 192.168.1.1)"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Etiqueta (opcional)"
              value={newIpLabel}
              onChange={(e) => setNewIpLabel(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddIp}
              disabled={!newIp.trim() || addIpMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {addIpMutation.isPending ? "Anadiendo..." : "Anadir IP"}
            </button>
          </div>

          {addIpMutation.isError && (
            <p className="mb-4 text-sm text-red-400">{addIpMutation.error?.message}</p>
          )}

          <div className="space-y-2">
            {whitelistedIps.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                No hay IPs en la lista blanca. Cualquier IP puede acceder.
              </p>
            ) : (
              whitelistedIps.map((ip) => (
                <div
                  key={ip.id}
                  className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white font-mono">{ip.ipAddress}</p>
                    {ip.label && <p className="text-xs text-zinc-500">{ip.label}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteIp(ip.id, ip.ipAddress)}
                    disabled={deleteIpMutation.isPending}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-white">Autenticacion de Dos Factores</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Anade una capa extra de seguridad con Google Authenticator o similar
          </p>

          <div className="mb-4 p-4 bg-zinc-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Estado</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {twoFactorStatus ? "2FA esta activado" : "2FA esta desactivado"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {twoFactorStatus ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-zinc-500" />
                )}
              </div>
            </div>
          </div>

          {!twoFactorStatus ? (
            <div className="space-y-4">
              {!show2FASetup ? (
                <button
                  onClick={handleSetup2FA}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  Configurar 2FA
                </button>
              ) : twoFactorSetup ? (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-800 rounded-lg">
                    <p className="text-sm text-zinc-400 mb-3">Escanea este codigo QR:</p>
                    <img
                      src={twoFactorSetup.qrCode}
                      alt="QR Code"
                      className="w-48 h-48 mx-auto bg-white p-2 rounded"
                    />
                    <p className="text-xs text-zinc-500 mt-3 text-center">
                      O ingresa manualmente: <span className="font-mono">{twoFactorSetup.secret}</span>
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="Codigo de 6 digitos"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleEnable2FA}
                    disabled={!twoFactorCode || enable2FAMutation.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {enable2FAMutation.isPending ? "Activando..." : "Activar 2FA"}
                  </button>
                  {enable2FAMutation.isError && (
                    <p className="text-sm text-red-400">{enable2FAMutation.error?.message}</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Codigo de 6 digitos para desactivar"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={handleDisable2FA}
                disabled={!twoFactorCode || disable2FAMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {disable2FAMutation.isPending ? "Desactivando..." : "Desactivar 2FA"}
              </button>
              {disable2FAMutation.isError && (
                <p className="text-sm text-red-400">{disable2FAMutation.error?.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
