import { useQuery } from "@tanstack/react-query";
import { Users, Mail, Activity } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function DashboardPage() {
  const { slug } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["stats", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: systemStats } = useQuery({
    queryKey: ["system-stats", slug],
    queryFn: async () => {
      const res = await fetch(`/api/admin/system-stats`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch system stats");
      return res.json();
    },
  });

  const cards = [
    {
      title: "Total Usuarios",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Usuarios Verificados",
      value: stats?.verifiedUsers || 0,
      icon: Users,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Total Inboxes",
      value: stats?.totalInboxes || 0,
      icon: Mail,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Emails Totales",
      value: systemStats?.totalEmails || 0,
      icon: Activity,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-zinc-400">Vista general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-zinc-400 mb-1">
                {card.title}
              </h3>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      {stats?.usagePurposeStats && stats.usagePurposeStats.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Estadisticas de Uso
          </h2>
          <div className="space-y-3">
            {stats.usagePurposeStats.map((stat: any) => (
              <div key={stat.purpose} className="flex items-center justify-between">
                <span className="text-zinc-400">{stat.purpose || "No especificado"}</span>
                <span className="text-white font-medium">{stat.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Informacion del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-zinc-500">Dominios Activos</p>
            <p className="text-lg font-medium text-white">
              {systemStats?.activeDomains || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Subdominios CyberTemp</p>
            <p className="text-lg font-medium text-white">
              {systemStats?.cybertempSubdomains || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
