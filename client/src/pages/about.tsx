import { Layout } from "@/components/layout";
import { useLanguage } from "@/lib/i18n";
import { Users, Server, Lock } from "lucide-react";
import { ElectricGrid } from "@/components/ui/electric-grid";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="relative pt-32 pb-20 overflow-hidden border-b border-border/40">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-['Orbitron'] font-bold tracking-tight text-foreground mb-6">
              {t.about.title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              {t.about.subtitle}
            </p>
          </div>
        </div>
        <ElectricGrid className="opacity-30" />
      </div>

      <div className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <h2 className="text-3xl font-['Outfit'] font-bold">{t.about.mission}</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {t.about.story}
            </p>
          </div>
          
          <div className="grid gap-6">
            {t.about.values.map((value: any, i: number) => (
              <div key={i} className="p-6 rounded-lg border border-border/60 hover:border-primary/50 transition-colors bg-card/50">
                <div className="mb-4 text-primary">
                  {i === 0 ? <Lock className="size-6" /> : i === 1 ? <Users className="size-6" /> : <Server className="size-6" />}
                </div>
                <h3 className="text-xl font-bold font-['Outfit'] mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
