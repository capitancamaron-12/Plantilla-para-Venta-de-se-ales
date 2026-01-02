import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export interface Admin {
  id: string;
  email: string;
  createdAt: string;
  twoFactorEnabled?: string;
}

export function useAuth() {
  const [location] = useLocation();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const pathMatch = location.match(/^\/secure\/([^/]+)/);
    if (pathMatch) {
      setSlug(pathMatch[1]);
    } else {
      setSlug(null);
    }
  }, [location]);

  const {
    data: adminData,
    isLoading,
    error,
    refetch,
  } = useQuery<Admin | null>({
    queryKey: ["admin", slug],
    queryFn: async () => {
      // Sin slug no hay sesion valida.
      if (!slug) return null;

      const res = await fetch(`/api/admin/me?slug=${slug}`, {
        credentials: "include",
      });

      // 401 = no autenticado o slug invalido: tratamos como no admin.
      if (res.status === 401) {
        return null;
      }

      if (!res.ok) {
        // Otros errores si se reportan como error real.
        throw new Error("Error de autenticacion");
      }

      return res.json();
    },
    enabled: !!slug,
    retry: false,
  });

  // Si hubo error o no hay datos, no exponemos ningun admin.
  const admin = error ? undefined : adminData ?? undefined;

  return {
    admin,
    loading: isLoading,
    error,
    refetch,
    slug,
  };
}
