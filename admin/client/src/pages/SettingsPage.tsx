import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { Settings, RefreshCw, Clock, Copy, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface SlugInfo {
  expiresAt: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { slug } = useAuth();
  const queryClient = useQueryClient();
  const [newSlug, setNewSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState(false);

  const { data: slugInfo, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["slug-info", slug],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`/api/admin/slug-info`, {
        credentials: "include",
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Failed to fetch slug info");
      return res.json() as Promise<SlugInfo>;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const rotateSlugMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/rotate-slug`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to rotate slug");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["slug-info"] });
      if (data.newSlug) {
        setNewSlug(data.newSlug);
      }
    },
  });

  const handleRotateSlug = () => {
    if (
      window.confirm(
        "Estas seguro de generar un nuevo slug? El slug actual dejara de funcionar y tendras que usar el nuevo para acceder."
      )
    ) {
      rotateSlugMutation.mutate();
    }
  };

  const handleCopySlug = () => {
    if (newSlug) {
      const fullUrl = `${window.location.origin}/secure/${newSlug}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    }
  };

  const isValidDate = (value?: string) => {
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  };

  const formatDateSafe = (value?: string) => {
    if (!isValidDate(value)) return "-";
    return format(new Date(value!), "dd/MM/yyyy HH:mm:ss");
  };

  const formatDistanceSafe = (value?: string) => {
    if (!isValidDate(value)) return "-";
    return formatDistanceToNow(new Date(value!), { addSuffix: true, locale: es });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 2;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-300">
        <p className="text-sm">Error cargando configuracion.</p>
        <p className="text-xs text-zinc-500 mt-1">{(error as Error)?.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuracion General</h1>
        <p className="text-zinc-400">Gestion de acceso y configuraciones del sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-white">Informacion del Slug Actual</h2>
          </div>

          {slugInfo && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Estado</span>
                  {isExpiringSoon(slugInfo.expiresAt) ? (
                    <span className="px-2 py-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                      Expirando pronto
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      Activo
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-zinc-500">Creado:</span>
                    <p className="text-white mt-1">
                      {formatDateSafe(slugInfo.createdAt)}
                    </p>
                    <p className="text-zinc-400 text-xs mt-1">
                      {formatDistanceSafe(slugInfo.createdAt)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-700">
                    <span className="text-zinc-500">Expira:</span>
                    <p className="text-white mt-1">
                      {formatDateSafe(slugInfo.expiresAt)}
                    </p>
                    <p className="text-zinc-400 text-xs mt-1">
                      {formatDistanceSafe(slugInfo.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>

              {isExpiringSoon(slugInfo.expiresAt) && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-amber-500 mb-1">
                        Slug expirando pronto
                      </h3>
                      <p className="text-sm text-zinc-400">
                        Tu slug actual expirara pronto. Rota el slug para generar uno nuevo y
                        mantener el acceso al panel admin.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-white">Rotacion de Slug</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Genera un nuevo slug de acceso. El slug actual dejara de funcionar inmediatamente.
          </p>

          <button
            onClick={handleRotateSlug}
            disabled={rotateSlugMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${rotateSlugMutation.isPending ? "animate-spin" : ""}`}
            />
            {rotateSlugMutation.isPending ? "Generando..." : "Generar Nuevo Slug"}
          </button>

          {rotateSlugMutation.isError && (
            <p className="mt-3 text-sm text-red-400">{rotateSlugMutation.error?.message}</p>
          )}

          {newSlug && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-emerald-500 mb-2">
                    Nuevo slug generado
                  </h3>
                  <p className="text-sm text-zinc-400 mb-3">
                    Guarda esta URL. La necesitaras para acceder al panel:
                  </p>
                  <div className="p-3 bg-zinc-900 rounded border border-zinc-700">
                    <p className="text-xs text-white font-mono break-all mb-2">
                      {window.location.origin}/secure/{newSlug}
                    </p>
                    <button
                      onClick={handleCopySlug}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors text-sm"
                    >
                      {copiedSlug ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copiar URL
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-amber-400 mt-3">
                    El slug anterior ya no es valido. Actualiza tus marcadores.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <Settings className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-500 mb-1">Acerca de los Slugs</h3>
            <p className="text-sm text-zinc-400">
              Los slugs son URLs de acceso temporal que rotan automaticamente cada 24 horas por
              seguridad. Cuando un slug expira, uno nuevo se genera automaticamente y se envia
              por email. Tambien puedes generar uno manualmente en cualquier momento usando el
              boton de arriba.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
