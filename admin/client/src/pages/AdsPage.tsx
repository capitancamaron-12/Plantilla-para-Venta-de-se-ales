import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { CheckCircle, XCircle, Loader2, Save, Trash2, Pencil } from "lucide-react";

interface AdSlot {
  id: string;
  slot: string;
  html: string;
  isActive: boolean;
  updatedAt: string;
}

const DEFAULT_SLOTS = [
  "home-gap-0",
  "home-gap-0b",
  "home-gap-1",
  "home-gap-2",
  "dashboard-top-0",
  "dashboard-top-1",
];

export default function AdsPage() {
  const { slug } = useAuth();
  const queryClient = useQueryClient();
  const [slot, setSlot] = useState("");
  const [html, setHtml] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: ads = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ads", slug],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);
      const res = await fetch("/api/admin/ads", {
        credentials: "include",
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Failed to fetch ads");
      return res.json() as Promise<AdSlot[]>;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const saveAdMutation = useMutation({
    mutationFn: async (payload: { slot: string; html: string; isActive: boolean }) => {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save ad");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      setSlot("");
      setHtml("");
      setIsActive(true);
      setEditingId(null);
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete ad");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads"] });
    },
  });

  const handleEdit = (ad: AdSlot) => {
    setSlot(ad.slot);
    setHtml(ad.html);
    setIsActive(ad.isActive);
    setEditingId(ad.id);
  };

  const isSlotValid = DEFAULT_SLOTS.includes(slot.trim());

  const handleSave = () => {
    if (!slot.trim() || !isSlotValid || !html.trim()) return;
    saveAdMutation.mutate({ slot: slot.trim(), html: html.trim(), isActive });
  };

  const handleDelete = (ad: AdSlot) => {
    if (window.confirm(`Delete ad slot ${ad.slot}?`)) {
      deleteAdMutation.mutate(ad.id);
    }
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
        <p className="text-sm">Error cargando publicidad.</p>
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
        <h1 className="text-3xl font-bold text-white mb-2">Ads Manager</h1>
        <p className="text-zinc-400">Manage HTML for ad slots used on the public site.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {editingId ? "Edit Ad Slot" : "Create Ad Slot"}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un slot</option>
              {DEFAULT_SLOTS.map((slotKey) => (
                <option key={slotKey} value={slotKey}>
                  {slotKey}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                id="ad-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="ad-active">Active</label>
            </div>
            <button
              onClick={handleSave}
              disabled={!slot.trim() || !isSlotValid || !html.trim() || saveAdMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveAdMutation.isPending ? "Saving..." : "Save"}
            </button>
            {saveAdMutation.isError && (
              <p className="text-sm text-red-400">{saveAdMutation.error?.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">HTML / iframe code</label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={10}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              placeholder="<iframe ...></iframe>"
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Known Slots</h2>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_SLOTS.map((slotKey) => (
            <span key={slotKey} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
              {slotKey}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Current Ads</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {ads.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500">No ads configured</div>
          ) : (
            ads.map((ad) => (
              <div key={ad.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{ad.slot}</span>
                    {ad.isActive ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Updated: {new Date(ad.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(ad)}
                    className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ad)}
                    disabled={deleteAdMutation.isPending}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
