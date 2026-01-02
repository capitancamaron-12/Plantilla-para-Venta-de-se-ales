import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import {
  Mail,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Globe,
  Send,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface CybertempSubdomain {
  id: string;
  subdomain: string;
  domain: string;
  status: string;
  createdAt: string;
}

interface TempEmail {
  id: string;
  email: string;
  domain: string;
  status: string;
  createdAt: string;
}

interface CybertempPlan {
  plan: string;
  maxSubdomains: number;
  subdomainsCreated: number;
  creditsRemaining: number;
}

interface Domain {
  domain: string;
  available: boolean;
}

export default function CybertempPage() {
  const { slug } = useAuth();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(3);
  const [newEmailPrefix, setNewEmailPrefix] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedSubdomains, setSelectedSubdomains] = useState<Set<string>>(new Set());

  const { data: plan } = useQuery({
    queryKey: ["cybertemp-plan", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/cybertemp/plan`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch plan");
      return res.json() as Promise<CybertempPlan>;
    },
  });

  const { data: subdomains = [], isLoading: subdomainsLoading } = useQuery({
    queryKey: ["cybertemp-subdomains", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/cybertemp/subdomains`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch subdomains");
      return res.json() as Promise<CybertempSubdomain[]>;
    },
  });

  const { data: domains = [] } = useQuery({
    queryKey: ["cybertemp-domains", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/cybertemp/domains`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch domains");
      return res.json() as Promise<Domain[]>;
    },
  });

  const { data: tempEmails = [] } = useQuery({
    queryKey: ["cybertemp-temp-emails", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/cybertemp/temp-emails`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch temp emails");
      return res.json() as Promise<TempEmail[]>;
    },
  });

  const generateSubdomainsMutation = useMutation({
    mutationFn: async (qty: number) => {
      const res = await fetch(`/api/admin/cybertemp/generate-subdomains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to generate subdomains");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cybertemp-subdomains"] });
      queryClient.invalidateQueries({ queryKey: ["cybertemp-plan"] });
    },
  });

  const createEmailMutation = useMutation({
    mutationFn: async ({ email, domain }: { email: string; domain: string }) => {
      const res = await fetch(`/api/admin/cybertemp/create-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, domain }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cybertemp-temp-emails"] });
      setNewEmailPrefix("");
      setSelectedDomain("");
    },
  });

  const deleteSubdomainMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cybertemp/subdomains/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete subdomain");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cybertemp-subdomains"] });
    },
  });

  const bulkDeleteSubdomainsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      let deleted = 0;
      for (const id of ids) {
        try {
          const res = await fetch(`/api/admin/cybertemp/subdomains/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (res.ok) {
            deleted += 1;
          }
        } catch {
          // Ignore individual delete errors to keep batch moving.
        }
      }
      return { deleted };
    },
    onSuccess: (_data, ids) => {
      const idSet = new Set(ids);
      queryClient.setQueryData(["cybertemp-subdomains", slug], (current: CybertempSubdomain[] | undefined) => {
        if (!current) return current;
        return current.filter((sub) => !idSet.has(sub.id));
      });
      setSelectedSubdomains(new Set());
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["cybertemp-subdomains"] });
      }, 2000);
    },
  });

  const deleteTempEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cybertemp/temp-emails/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete temp email");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cybertemp-temp-emails"] });
    },
  });

  const handleGenerateSubdomains = () => {
    if (quantity < 1 || quantity > 10) {
      alert("La cantidad debe estar entre 1 y 10");
      return;
    }
    generateSubdomainsMutation.mutate(quantity);
  };

  const handleCreateEmail = () => {
    if (!newEmailPrefix.trim() || !selectedDomain) {
      alert("Por favor completa todos los campos");
      return;
    }
    const email = `${newEmailPrefix}@${selectedDomain}`;
    createEmailMutation.mutate({ email, domain: selectedDomain });
  };

  const handleDeleteSubdomain = (id: string, subdomain: string, domain: string) => {
    if (window.confirm(`Estas seguro de eliminar el subdominio ${subdomain}.${domain}?`)) {
      deleteSubdomainMutation.mutate(id);
    }
  };

  const handleToggleSubdomain = (id: string) => {
    setSelectedSubdomains((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAllSubdomains = () => {
    if (selectedSubdomains.size === subdomains.length) {
      setSelectedSubdomains(new Set());
      return;
    }
    setSelectedSubdomains(new Set(subdomains.map((sub) => sub.id)));
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedSubdomains);
    if (ids.length === 0) return;
    if (window.confirm(`Estas seguro de eliminar ${ids.length} subdominios?`)) {
      bulkDeleteSubdomainsMutation.mutate(ids);
    }
  };

  const handleDeleteTempEmail = (id: string, email: string) => {
    if (window.confirm(`Estas seguro de eliminar la señal temporal ${email}?`)) {
      deleteTempEmailMutation.mutate(id);
    }
  };

  useEffect(() => {
    setSelectedSubdomains((prev) => {
      const validIds = new Set(subdomains.map((sub) => sub.id));
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return next;
    });
  }, [subdomains]);

  const selectedCount = selectedSubdomains.size;
  const allSelected = subdomains.length > 0 && selectedCount === subdomains.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Gestion de CyberTemp</h1>
        <p className="text-zinc-400">Administracion de señales temporales y subdominios</p>
      </div>

      {plan && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-medium text-zinc-400">Plan</h3>
            </div>
            <p className="text-2xl font-bold text-white">{plan.plan}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-medium text-zinc-400">Subdominios</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {plan.subdomainsCreated} / {plan.maxSubdomains}
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-medium text-zinc-400">Creditos</h3>
            </div>
            <p className="text-2xl font-bold text-white">{plan.creditsRemaining}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-medium text-zinc-400">Dominios</h3>
            </div>
            <p className="text-2xl font-bold text-white">{domains.length}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Generar Subdominios</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Crea subdominios para preservar los dominios principales
          </p>
          <div className="flex gap-3">
            <input
              type="number"
              min="1"
              max="10"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-24 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleGenerateSubdomains}
              disabled={generateSubdomainsMutation.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${generateSubdomainsMutation.isPending ? "animate-spin" : ""}`}
              />
              {generateSubdomainsMutation.isPending ? "Generando..." : "Generar Subdominios"}
            </button>
          </div>
          {generateSubdomainsMutation.isError && (
            <p className="mt-2 text-sm text-red-400">
              {generateSubdomainsMutation.error?.message}
            </p>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Crear Señal Temporal</h2>
          <p className="text-sm text-zinc-400 mb-4">Genera una nueva señal temporal</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="nombre"
              value={newEmailPrefix}
              onChange={(e) => setNewEmailPrefix(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un dominio</option>
              {domains
                .filter((d) => d.available)
                .map((domain) => (
                  <option key={domain.domain} value={domain.domain}>
                    @{domain.domain}
                  </option>
                ))}
            </select>
            <button
              onClick={handleCreateEmail}
              disabled={!newEmailPrefix || !selectedDomain || createEmailMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {createEmailMutation.isPending ? "Creando..." : "Crear Señal"}
            </button>
          </div>
          {createEmailMutation.isError && (
            <p className="mt-2 text-sm text-red-400">{createEmailMutation.error?.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">
              Subdominios Creados ({subdomains.length})
            </h2>
            {subdomains.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    className="accent-blue-600"
                    checked={allSelected}
                    onChange={handleToggleAllSubdomains}
                  />
                  Seleccionar todo
                </label>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedCount === 0 || bulkDeleteSubdomainsMutation.isPending}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {bulkDeleteSubdomainsMutation.isPending
                    ? "Eliminando..."
                    : `Eliminar (${selectedCount})`}
                </button>
              </div>
            )}
          </div>
          <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
            {subdomainsLoading ? (
              <div className="px-6 py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
              </div>
            ) : subdomains.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500">No hay subdominios creados</div>
            ) : (
              subdomains.map((sub) => (
                <div key={sub.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      className="mt-1 accent-blue-600"
                      checked={selectedSubdomains.has(sub.id)}
                      onChange={() => handleToggleSubdomain(sub.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {sub.subdomain}.{sub.domain}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {format(new Date(sub.createdAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSubdomain(sub.id, sub.subdomain, sub.domain)}
                    disabled={deleteSubdomainMutation.isPending}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              Señales Temporales ({tempEmails.length})
            </h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
            {tempEmails.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500">
                No hay señales temporales creadas
              </div>
            ) : (
              tempEmails.map((email) => (
                <div key={email.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{email.email}</p>
                    <p className="text-xs text-zinc-500">
                      {format(new Date(email.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteTempEmail(email.id, email.email)}
                    disabled={deleteTempEmailMutation.isPending}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
