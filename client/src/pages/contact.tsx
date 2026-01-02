import { Layout } from "@/components/layout";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Send } from "lucide-react";
import { ElectricGrid } from "@/components/ui/electric-grid";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "TCorp Business Market Relay",
        description: t.contact.form.success,
      });
    }, 1500);
  };

  return (
    <Layout>
      <div className="relative pt-32 pb-20 overflow-hidden border-b border-border/40">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-['Orbitron'] font-bold tracking-tight text-foreground mb-6">
              {t.contact.title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              {t.contact.subtitle}
            </p>
          </div>
        </div>
        <ElectricGrid className="opacity-30" />
      </div>

      <div className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Form */}
          <div className="p-8 rounded-lg border border-border bg-card/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.contact.form.name}</label>
                <Input required className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.contact.form.email}</label>
                <Input type="email" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.contact.form.message}</label>
                <Textarea required className="min-h-[150px] bg-background/50" />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <div className="size-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="size-4 mr-2" />
                    {t.contact.form.submit}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Info */}
          <div className="space-y-12">
            <div>
              <h3 className="text-2xl font-['Outfit'] font-bold mb-6">{t.contact.info.title}</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Mail className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Email Encrypted PGP</h4>
                    <p className="text-muted-foreground font-mono text-sm">{t.contact.info.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <MapPin className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">HQ</h4>
                    <p className="text-muted-foreground">{t.contact.info.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
