import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Mail,
  Globe,
  Cloud,
  Shield,
  FileText,
  Settings,
  Megaphone,
  LogOut
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  slug: string;
}

export default function Layout({ children, slug }: LayoutProps) {
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const navigation = [
    { name: "Dashboard", href: `/secure/${slug}`, icon: LayoutDashboard },
    { name: "Usuarios", href: `/secure/${slug}/users`, icon: Users },
    { name: "Inboxes", href: `/secure/${slug}/inboxes`, icon: Mail },
    { name: "Dominios", href: `/secure/${slug}/domains`, icon: Globe },
    { name: "CyberTemp", href: `/secure/${slug}/cybertemp`, icon: Cloud },
    { name: "Seguridad", href: `/secure/${slug}/security`, icon: Shield },
    { name: "Logs", href: `/secure/${slug}/logs`, icon: FileText },
    { name: "Publicidad", href: `/secure/${slug}/ads`, icon: Megaphone },
    { name: "Configuracion", href: `/secure/${slug}/settings`, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex h-screen">
        <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="p-6 border-b border-zinc-800">
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-zinc-500 mt-1">TCorp Management</p>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Cerrar sesion</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
