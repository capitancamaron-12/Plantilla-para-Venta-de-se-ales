import { Layout } from "@/components/layout";
import { useLanguage } from "@/lib/i18n";
import { Link } from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, BookOpen, ShieldCheck, Rss } from "lucide-react";
import { ElectricGrid } from "@/components/ui/electric-grid";
import { useLocation } from "wouter";
import { SystemStatus } from "@/components/ui/system-status";

export default function SimplePage() {
  const { t } = useLanguage();
  const [location] = useLocation();
  const routeKey = location.split("?")[0].replace("/", "") || "status";
  type SimplePageKey = keyof typeof t.simple_pages;
  type IconType = typeof Activity;
  const pageKey = (Object.prototype.hasOwnProperty.call(t.simple_pages, routeKey) ? routeKey : "status") as SimplePageKey;
  const pages = t.simple_pages as Record<string, any>;
  const page = pages[pageKey];

  const pageMeta: Record<SimplePageKey, { icon: IconType; ctaHref: string; ctaExternal: boolean }> = {
    status: { icon: Activity, ctaHref: "https://status.tcorp.email", ctaExternal: true },
    docs: { icon: BookOpen, ctaHref: "/contact", ctaExternal: false },
    security: { icon: ShieldCheck, ctaHref: "/contact", ctaExternal: false },
    blog: { icon: Rss, ctaHref: "/contact", ctaExternal: false },
  };
  const { icon: Icon, ctaHref, ctaExternal } = pageMeta[pageKey] ?? pageMeta.status;

  const secondaryPanel = (() => {
    if (pageKey === "docs") {
      return { title: page.endpoints_title, items: page.endpoints };
    }
    if (pageKey === "security") {
      return { title: page.practices_title, items: page.practices };
    }
    return { title: page.info_title, desc: page.info_desc };
  })();

  return (
    <Layout>
      <div className="relative min-h-[80vh] px-6 overflow-hidden">
        <div className="relative z-10 container mx-auto py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="size-6" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-['Outfit'] font-bold tracking-tight">
                  {page.title}
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                  {page.subtitle}
                </p>
              </div>
            </div>
            {pageKey === "status" && (
              <div className="flex justify-start md:justify-end">
                <SystemStatus />
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">{page.highlights_title}</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {page.highlights.map((item: string) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">{secondaryPanel.title}</h2>
              {"items" in secondaryPanel ? (
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {secondaryPanel.items.map((item: string) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">{secondaryPanel.desc}</p>
              )}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {ctaExternal ? (
              <a href={ctaHref} target="_blank" rel="noopener noreferrer">
                <Button>{page.cta_label}</Button>
              </a>
            ) : (
              <Link href={ctaHref}>
                <Button>{page.cta_label}</Button>
              </Link>
            )}
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="size-4" />
                {t.common.back_home}
              </Button>
            </Link>
          </div>
        </div>
        <ElectricGrid className="opacity-20" />
      </div>
    </Layout>
  );
}
