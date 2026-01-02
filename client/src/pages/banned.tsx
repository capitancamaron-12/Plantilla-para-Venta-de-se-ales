import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Lock } from "lucide-react";

interface BanInfo {
  isPermanent: boolean;
  bannedUntil?: string;
}

export default function BannedPage() {
  const [, params] = useRoute("/banned/:code");
  const [, setLocation] = useLocation();
  const [timeRemaining, setTimeRemaining] = useState(5);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [banExpired, setBanExpired] = useState(false);

  const code = params?.code || "";

  useEffect(() => {
    const bannedUntilStr = new URLSearchParams(window.location.search).get("bannedUntil");
    const isPermanentStr = new URLSearchParams(window.location.search).get("isPermanent");
    
    sessionStorage.setItem("bannedCode", code);
    sessionStorage.setItem("isBanPermanent", isPermanentStr === "true" ? "true" : "false");
    if (bannedUntilStr) {
      sessionStorage.setItem("banExpireTime", new Date(bannedUntilStr).getTime().toString());
    }
    
    if (bannedUntilStr) {
      const bannedUntil = new Date(bannedUntilStr).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((bannedUntil - now) / 1000));
      setTimeRemaining(remaining);
    }
    
    setBanInfo({
      isPermanent: isPermanentStr === "true",
      bannedUntil: bannedUntilStr || undefined,
    });
  }, [code]);

  useEffect(() => {
    if (banInfo?.isPermanent) {
      return;
    }

    if (timeRemaining <= 0) {
      setBanExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, banInfo?.isPermanent]);

  return (
    <Layout>
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <div className="mx-auto size-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-8 animate-pulse">
            <Lock className="size-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-['Orbitron'] font-bold tracking-tight mb-4 text-destructive">
            ACCESO BLOQUEADO
          </h1>
          
          {banInfo?.isPermanent ? (
            <>
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                Tu dirección IP ha sido baneada permanentemente por superar el límite máximo de intentos fallidos en el captcha.
              </p>
              <div className="bg-destructive/10 rounded-lg p-4 mb-8 border border-destructive/30">
                <p className="text-sm text-muted-foreground mb-2">No se puede revertir este baneo.</p>
                <p className="text-xs text-muted-foreground">Si crees que esto es un error, contacta con soporte.</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                Has superado el número máximo de intentos en el captcha (2 intentos).
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-8 border border-muted-foreground/20">
                <p className="text-sm text-muted-foreground mb-2">Tu baneo es temporal.</p>
              </div>
              {banExpired ? (
                <>
                  <p className="text-lg text-muted-foreground mb-6">
                    Tu baneo ha expirado. Puedes intentar nuevamente.
                  </p>
                  <button
                    onClick={() => setLocation("/")}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Volver al Inicio
                  </button>
                </>
              ) : (
                <>
                  <p className="text-lg text-muted-foreground mb-2">
                    Serás redirigido al inicio en:
                  </p>
                  <p className="text-5xl font-bold text-destructive animate-pulse">
                    {timeRemaining}s
                  </p>
                </>
              )}
            </>
          )}

          <div className="bg-muted/50 rounded-lg p-4 mt-8 border border-muted-foreground/20">
            <p className="text-sm text-muted-foreground mb-2">Código de bloqueo:</p>
            <p className="text-2xl font-mono font-bold text-foreground">{code}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
