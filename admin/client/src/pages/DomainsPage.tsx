import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { Globe, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface EmailDomain {
  id: string;
  domain: string;
  isActive: string;
  createdAt: string;
}

export default function DomainsPage() {
  const { slug } = useAuth();
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState("");
  const [isCheckingBlacklist, setIsCheckingBlacklist] = useState(false);

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["domains", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/domains`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch domains");
      return res.json() as Promise<EmailDomain[]>;
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await fetch(`/api/admin/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add domain");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      setNewDomain("");
    },
  });

  const toggleDomainMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: string }) => {
      const res = await fetch(`/api/admin/domains/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update domain");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/domains/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete domain");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
  });

  const handleAddDomain = () => {
    if (!newDomain.trim()) return;
    addDomainMutation.mutate(newDomain.trim());
  };

  const handleToggleDomain = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "true" ? "false" : "true";
    toggleDomainMutation.mutate({ id, isActive: newStatus });
  };

  const handleDeleteDomain = (id: string, domain: string) => {
    if (window.confirm(`Estas seguro de eliminar el dominio ${domain}?`)) {
      deleteDomainMutation.mutate(id);
    }
  };

  const handleCheckBlacklist = async () => {
    setIsCheckingBlacklist(true);
    try {
      const res = await fetch(`/api/admin/domains/check-blacklist`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to check blacklist");
      const data = await res.json();
      alert(data.message || "Verificacion completada");
      queryClient.invalidateQueries({ queryKey: ["domains"] });
    } catch (error: any) {
      alert(error.message || "Error al verificar blacklist");
    } finally {
      setIsCheckingBlacklist(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const activeDomains = domains.filter((d) => d.isActive === "true");
  const inactiveDomains = domains.filter((d) => d.isActive === "false");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Gestion de Dominios</h1>
        <p className="text-zinc-400">
          Total de dominios: <span className="text-white font-medium">{domains.length}</span> (
          <span className="text-emerald-500">{activeDomains.length} activos</span>)
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Anadir Nuevo Dominio</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="ejemplo.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddDomain}
            disabled={!newDomain.trim() || addDomainMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {addDomainMutation.isPending ? "Anadiendo..." : "Anadir"}
          </button>
          <button
            onClick={handleCheckBlacklist}
            disabled={isCheckingBlacklist}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingBlacklist ? "animate-spin" : ""}`} />
            {isCheckingBlacklist ? "Verificando..." : "Verificar Blacklist"}
          </button>
        </div>
        {addDomainMutation.isError && (
          <p className="mt-2 text-sm text-red-400">
            {addDomainMutation.error?.message || "Error al anadir dominio"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Dominios Activos ({activeDomains.length})
            </h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {activeDomains.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500">No hay dominios activos</div>
            ) : (
              activeDomains.map((domain) => (
                <div key={domain.id} className="px-6 py-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <p className="text-sm font-medium text-white truncate">{domain.domain}</p>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Anadido el {format(new Date(domain.createdAt), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleDomain(domain.id, domain.isActive)}
                        disabled={toggleDomainMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50"
                      >
                        Desactivar
                      </button>
                      <button
                        onClick={() => handleDeleteDomain(domain.id, domain.domain)}
                        disabled={deleteDomainMutation.isPending}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-zinc-500" />
              Dominios Inactivos ({inactiveDomains.length})
            </h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {inactiveDomains.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500">No hay dominios inactivos</div>
            ) : (
              inactiveDomains.map((domain) => (
                <div key={domain.id} className="px-6 py-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        <p className="text-sm font-medium text-zinc-400 truncate">{domain.domain}</p>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Anadido el {format(new Date(domain.createdAt), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleDomain(domain.id, domain.isActive)}
                        disabled={toggleDomainMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        Activar
                      </button>
                      <button
                        onClick={() => handleDeleteDomain(domain.id, domain.domain)}
                        disabled={deleteDomainMutation.isPending}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-500 mb-1">Verificacion de Blacklist</h3>
            <p className="text-sm text-zinc-400">
              El sistema verifica automaticamente cada 24 horas si los dominios estan en listas negras. Tambien
              puedes ejecutar una verificacion manual usando el boton "Verificar Blacklist".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
