import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { Activity, Filter, Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Log {
  id: string;
  type: string;
  action: string;
  adminId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
  success: string;
  createdAt: string;
}

export default function LogsPage() {
  const { slug } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["logs", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/logs`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json() as Promise<{ logs: Log[]; total: number }>;
    },
  });

  const logs = logsData?.logs || [];
  const totalLogs = logsData?.total ?? logs.length;

  const filteredLogs = logs.filter((log) => {
    if (typeFilter === "all") return true;
    return log.type === typeFilter;
  });

  const logTypes = Array.from(new Set(logs.map((log) => log.type)));

  const getTypeColor = (type: string) => {
    switch (type) {
      case "auth_attempt":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "security":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "admin_action":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "system":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  const getActionIcon = (success: string) => {
    if (success === "true") {
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
    return <XCircle className="w-4 h-4 text-red-500" />;
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
        <h1 className="text-3xl font-bold text-white mb-2">Logs de Actividad</h1>
        <p className="text-zinc-400">
          Total de logs: <span className="text-white font-medium">{totalLogs}</span>
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-zinc-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los tipos</option>
            {logTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="divide-y divide-zinc-800 max-h-[700px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500">
              No hay logs disponibles
            </div>
          ) : (
            filteredLogs.map((log) => {
              let details: any = log.details;
              if (typeof details === "string") {
                try {
                  details = JSON.parse(details);
                } catch {
                  details = null;
                }
              }

              return (
              <div key={log.id} className="px-6 py-4 hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{getActionIcon(log.success)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded border ${getTypeColor(
                          log.type
                        )}`}
                      >
                        {log.type}
                      </span>
                      <span className="text-sm font-medium text-white">{log.action}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-400">
                      {log.ip && (
                        <div>
                          <span className="text-zinc-500">IP:</span> {log.ip}
                        </div>
                      )}
                      {log.adminId && (
                        <div>
                          <span className="text-zinc-500">Admin ID:</span> {log.adminId.slice(0, 8)}...
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-500">Fecha:</span>{" "}
                        {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}
                      </div>
                      {log.userAgent && (
                        <div className="md:col-span-2 truncate">
                          <span className="text-zinc-500">User Agent:</span> {log.userAgent}
                        </div>
                      )}
                    </div>
                    {details && Object.keys(details).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-blue-400 hover:text-blue-300">
                          Ver detalles
                        </summary>
                        <pre className="mt-2 p-3 bg-zinc-800 rounded text-xs text-zinc-300 overflow-x-auto">
                          {JSON.stringify(details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {filteredLogs.length > 0 && (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <p>
            Mostrando {filteredLogs.length} de {totalLogs} logs
          </p>
        </div>
      )}
    </div>
  );
}
