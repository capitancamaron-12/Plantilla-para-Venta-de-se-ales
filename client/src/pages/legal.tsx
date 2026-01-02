import { Layout } from "@/components/layout";
import { useLanguage } from "@/lib/i18n";
import { Shield, FileText } from "lucide-react";
import { ElectricGrid } from "@/components/ui/electric-grid";

export default function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const { t } = useLanguage();
  const content = type === 'privacy' ? t.privacy : t.terms;

  return (
    <Layout>
      <div className="relative pt-32 pb-20 overflow-hidden border-b border-border/40">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-['Orbitron'] font-bold tracking-tight text-foreground mb-6">
              {content.title}
            </h1>
            <p className="text-muted-foreground text-lg">{content.last_updated}</p>
          </div>
        </div>
        <ElectricGrid className="opacity-30" />
      </div>

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-3xl prose prose-gray prose-theme">
          <p className="text-xl text-foreground font-medium mb-12 leading-relaxed">
            {content.intro}
          </p>
          
          <div className="space-y-12">
            {content.sections.map((section: any, i: number) => (
              <div key={i} className="space-y-4">
                <h3 className="text-2xl font-bold font-['Outfit'] text-foreground">
                  {section.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
