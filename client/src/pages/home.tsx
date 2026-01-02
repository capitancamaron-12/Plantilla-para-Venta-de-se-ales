import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Check, Globe, Shield, Zap, Lock, Database } from "lucide-react";
import { Link } from "@/components/ui/link";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

type SubscriptionResponse = {
  isPremium: boolean;
};

export default function Home() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [adSlots, setAdSlots] = useState<Record<string, string>>({});
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        throw new Error("Failed to fetch subscription");
      }
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60,
  });
  const showAds = !isAuthenticated || subscriptionData?.isPremium === false;
  const adSlotKeys = ["home-gap-0", "home-gap-0b", "home-gap-1", "home-gap-2"];

  useEffect(() => {
    if (!showAds) {
      setAdSlots({});
      return;
    }

    const controller = new AbortController();
    const slotsParam = adSlotKeys.join(",");

    fetch(`/api/ads?slots=${encodeURIComponent(slotsParam)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch ads");
        }
        return res.json() as Promise<{ slot: string; html: string }[]>;
      })
      .then((data) => {
        const mapping: Record<string, string> = {};
        data.forEach((ad) => {
          if (ad.slot) {
            mapping[ad.slot] = ad.html || "";
          }
        });
        setAdSlots(mapping);
      })
      .catch(() => {
        setAdSlots({});
      });

    return () => controller.abort();
  }, [showAds, adSlotKeys.join(",")]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal-card]"));
    if (elements.length === 0) return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      elements.forEach((el) => {
        el.style.setProperty("--card-opacity", "1");
        el.style.setProperty("--card-translate", "0px");
        el.style.setProperty("--content-opacity", "1");
        el.style.setProperty("--content-translate", "0px");
      });
      return;
    }

    let ticking = false;
    const update = () => {
      ticking = false;
      const viewHeight = window.innerHeight || 0;
      const start = viewHeight * 0.9;
      const end = viewHeight * 0.3;
      const range = Math.max(1, start - end);

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const rawProgress = (start - rect.top) / range;
        const delayValue = parseFloat(getComputedStyle(el).getPropertyValue("--reveal-delay")) || 0;
        const delayShift = delayValue / 1200;
        const progress = Math.min(1, Math.max(0, rawProgress - delayShift));
        const cardOpacity = 0.2 + progress * 0.8;
        const cardTranslate = (1 - progress) * 18;
        const contentProgress = Math.min(1, Math.max(0, (progress - 0.65) / 0.35));
        const contentOpacity = contentProgress;
        const contentTranslate = (1 - contentProgress) * 10;

        el.style.setProperty("--card-opacity", cardOpacity.toFixed(3));
        el.style.setProperty("--card-translate", `${cardTranslate.toFixed(2)}px`);
        el.style.setProperty("--content-opacity", contentOpacity.toFixed(3));
        el.style.setProperty("--content-translate", `${contentTranslate.toFixed(2)}px`);
      });
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <Layout>
      {/* Hero Section with full-screen video background (covers header area) */}
      <section className="relative min-h-screen -mt-16 pt-16 flex items-center border-b border-border/40 overflow-hidden">
        {/* Background video */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/248691.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        {/* Theme-aware overlay for readability and color tone */}
        <div className="absolute inset-0 hero-video-overlay" />
        <div className="home-hero-fade" aria-hidden="true" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10 py-24 md:py-32 lg:py-40">
          <div className="max-w-4xl">
            <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-6 md:p-10 backdrop-blur-md shadow-lg border border-white/30 dark:border-slate-700/40 max-w-3xl -mt-12 md:-mt-16 lg:-mt-20 ml-0 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-8 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {t.home.new_feature}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-['Outfit'] font-bold tracking-tight text-foreground leading-[1.1] mb-8">
              {t.home.title_1} <br/>
              <span className="text-muted-foreground">{t.home.title_2}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
              {t.home.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Link href="/inbox">
                <Button size="lg" className="h-14 px-8 text-base rounded-sm shadow-none">
                  {t.home.start_btn}
                </Button>
              </Link>
            </div>
              </div>
            </div>
        </div>
      </section>

      <div className="home-continuation">
        {/* Stats / Trust Section */}
        <section className="home-section border-b border-border/40">
          <div className="container mx-auto px-4 md:px-6">
            <div className="home-login-panel p-6 md:p-8">
              <div className="home-stats-grid">
              <div
                className="home-login-card home-stat-card home-reveal-card"
                data-reveal-card
                style={{ "--reveal-delay": "0ms" } as CSSProperties}
              >
                <div className="home-reveal-content">
                  <div className="home-stat-icon">
                    <Shield className="size-5 text-primary" />
                  </div>
                  <span className="home-stat-text">{t.home.encryption}</span>
                </div>
              </div>
              <div
                className="home-login-card home-stat-card home-reveal-card"
                data-reveal-card
                style={{ "--reveal-delay": "80ms" } as CSSProperties}
              >
                <div className="home-reveal-content">
                  <div className="home-stat-icon">
                    <Globe className="size-5 text-primary" />
                  </div>
                  <span className="home-stat-text">{t.home.uptime}</span>
                </div>
              </div>
              <div
                className="home-login-card home-stat-card home-reveal-card"
                data-reveal-card
                style={{ "--reveal-delay": "160ms" } as CSSProperties}
              >
                <div className="home-reveal-content">
                  <div className="home-stat-icon">
                    <Database className="size-5 text-primary" />
                  </div>
                  <span className="home-stat-text">{t.home.retention}</span>
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>

        {showAds && (
          <div className="home-ad-strip">
            <div className="container mx-auto px-4 md:px-6">
              <div className="home-ad-grid">
                <AdPlaceholder slot="home-gap-0" size={t.home.ads.square_label} delay={0} content={adSlots["home-gap-0"]} />
                <AdPlaceholder slot="home-gap-0b" size={t.home.ads.square_label} delay={120} content={adSlots["home-gap-0b"]} />
              </div>
            </div>
          </div>
        )}

        {/* Features Section - Clean Layout */}
        <section id="features" className="home-section">
          <div className="container mx-auto px-4 md:px-6">
            <div className="home-login-panel p-6 md:p-10">
              <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8 lg:gap-12 items-start">
                <div className="space-y-6">
                  <div className="home-panel-line" />
                  <h2 className="text-3xl md:text-4xl font-['Outfit'] font-bold tracking-tight">
                    {t.home.control_title}
                  </h2>
                  <p className="home-login-muted text-lg leading-relaxed">
                    {t.home.control_desc}
                  </p>
                  
                  <ul className="space-y-4 mt-8">
                    {t.home.features.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 home-login-soft">
                        <div className="size-6 rounded-full auth-panel-chip flex items-center justify-center text-primary">
                          <Check className="size-3.5" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="home-feature-grid">
                  <FeatureCard 
                    icon={<Lock className="size-4" />}
                    title={t.home.cards.privacy.title}
                    desc={t.home.cards.privacy.desc}
                    delay={0}
                  />
                  <FeatureCard 
                    icon={<Zap className="size-4" />}
                    title={t.home.cards.speed.title}
                    desc={t.home.cards.speed.desc}
                    delay={90}
                  />
                  <FeatureCard 
                    icon={<Database className="size-4" />}
                    title={t.home.cards.scale.title}
                    desc={t.home.cards.scale.desc}
                    delay={180}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {showAds && (
          <div className="home-ad-strip">
            <div className="container mx-auto px-4 md:px-6">
              <div className="home-ad-grid">
                <AdPlaceholder slot="home-gap-1" size={t.home.ads.wide_label} wide delay={0} content={adSlots["home-gap-1"]} />
                <AdPlaceholder slot="home-gap-2" size={t.home.ads.square_label} delay={120} content={adSlots["home-gap-2"]} />
              </div>
            </div>
          </div>
        )}

        {/* Pricing Section - Corporate Clean */}
        <section id="pricing" className="home-section">
          <div className="container mx-auto px-4 md:px-6">
            <div className="home-login-panel p-6 md:p-10">
              <div className="mb-12 md:mb-16">
                <h2 className="text-3xl md:text-5xl font-['Outfit'] font-bold mb-6">{t.home.pricing_title}</h2>
                <p className="home-login-muted max-w-xl text-lg">
                  {t.home.pricing_subtitle}
                </p>
              </div>

              <div className="home-card-rail">
                <div className="home-pricing-grid max-w-5xl">
                {/* Free Tier */}
                <div
                  className="home-login-card home-pricing-card p-6 md:p-12 home-reveal-card"
                  data-reveal-card
                  style={{ "--reveal-delay": "0ms" } as CSSProperties}
                >
                  <div className="home-reveal-content">
                    <h3 className="text-2xl font-bold mb-2">{t.home.free_tier.title}</h3>
                    <div className="mb-8 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">$0</span>
                      <span className="home-login-muted">/mes</span>
                    </div>
                    <p className="home-login-soft mb-8 h-12">
                      {t.home.free_tier.desc}
                    </p>
                    <ul className="space-y-4 mb-10 text-sm">
                      {t.home.free_tier.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-3 home-login-soft">
                          <Check className="size-4" /> {feat}
                        </li>
                      ))}
                    </ul>
                    <Link href="/inbox">
                      <Button variant="secondary" className="pricing-button w-full h-12 rounded-sm">
                        {t.home.free_tier.btn}
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Pro Tier */}
                <div
                  className="home-login-card home-pricing-card home-pricing-card-pro p-6 md:p-12 relative overflow-hidden home-reveal-card"
                  data-reveal-card
                  style={{ "--reveal-delay": "120ms" } as CSSProperties}
                >
                   <div className="absolute top-0 right-0 p-4 opacity-20">
                     <Globe className="size-32 rotate-12" />
                   </div>
                  <div className="home-reveal-content">
                    <h3 className="text-2xl font-bold mb-2">{t.home.pro_tier.title}</h3>
                    <div className="mb-8 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">$5</span>
                      <span className="home-login-muted">/mes</span>
                    </div>
                    <p className="home-login-soft mb-8 h-12 font-medium">
                      {t.home.pro_tier.desc}
                    </p>
                    <ul className="space-y-4 mb-10 text-sm">
                      {t.home.pro_tier.features.map((feat, i) => (
                         <li key={i} className="flex items-center gap-3 home-login-soft">
                          <Check className="size-4" /> <strong>{feat}</strong>
                        </li>
                      ))}
                    </ul>
                    <Link href="/account">
                      <Button variant="secondary" className="w-full h-12 rounded-sm shadow-lg border-0 text-primary">
                        {t.home.pro_tier.btn}
                      </Button>
                    </Link>
                    <p className="mt-4 text-xs home-login-muted text-center">
                      {t.home.pro_tier.note}
                    </p>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function FeatureCard({ title, desc, icon, delay }: { title: string; desc: string; icon: ReactNode; delay?: number }) {
  return (
    <div
      className="home-login-card home-card-stack p-6 home-reveal-card"
      data-reveal-card
      style={{ "--reveal-delay": `${delay ?? 0}ms` } as CSSProperties}
    >
      <div className="home-reveal-content">
        <div className="home-card-icon">{icon}</div>
        <h4 className="font-semibold text-lg">{title}</h4>
        <p className="text-sm home-login-muted">{desc}</p>
      </div>
    </div>
  );
}

function AdPlaceholder({ slot, size, wide, delay, content }: { slot: string; size: string; wide?: boolean; delay?: number; content?: string }) {
  const hasContent = Boolean(content && content.trim());
  return (
    <div
      className={`home-ad-placeholder ${wide ? "home-ad-placeholder-wide" : ""}`}
      data-ad-slot={slot}
      data-ad-size={size}
      aria-hidden={!hasContent}
    >
      {hasContent && (
        <div className="home-ad-content" dangerouslySetInnerHTML={{ __html: content || "" }} />
      )}
    </div>
  );
}
