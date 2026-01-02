import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, KeyRound, Mail } from "lucide-react";
import { Link } from "@/components/ui/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";

export default function VerifyPage() {
  const [verificationCode, setVerificationCode] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const { verify, isVerifying, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");

    if (emailParam) setUserEmail(emailParam);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/inbox");
    }
  }, [isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode) {
      toast({
        title: t.verify.toast.error_title,
        description: t.verify.toast.missing_code,
        variant: "destructive",
      });
      return;
    }

    try {
      await verify(verificationCode);
      toast({
        title: t.verify.toast.verified_title,
        description: t.verify.toast.verified_desc,
      });
      setLocation("/inbox");
    } catch (error: any) {
      toast({
        title: t.verify.toast.error_title,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResendCode = async () => {
    if (!userEmail || isResending) return;

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.verify.toast.resend_error);
      }

      toast({
        title: t.verify.toast.resend_title,
        description: t.verify.toast.resend_desc,
      });
    } catch (error: any) {
      toast({
        title: t.verify.toast.error_title,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 auth-panel relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <Link href="/" className="inline-block">
              <span className="text-3xl font-bold tracking-tight auth-panel-text font-['Orbitron']">
                TCorp Business
              </span>
            </Link>
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ShieldCheck className="size-16 text-primary mb-6" />
              <h1 className="text-4xl font-bold auth-panel-text leading-tight">
                {t.verify.hero_title}
                <br />
                <span className="text-primary">{t.verify.hero_title_highlight}</span>
              </h1>
              <p className="mt-4 text-lg auth-panel-muted max-w-md">{t.verify.hero_desc}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="auth-panel-card backdrop-blur-sm rounded-lg p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <Mail className="size-5 text-primary" />
                <p className="text-sm auth-panel-soft">{t.verify.hero_card_title}</p>
              </div>
              <p className="text-xs auth-panel-dim">{t.verify.hero_card_desc}</p>
            </motion.div>
          </div>

          <div className="text-sm auth-panel-dim">{t.verify.footer}</div>
        </div>

        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background overflow-y-auto relative">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="lg:hidden text-center mb-6">
            <Link href="/">
              <span className="text-3xl font-bold tracking-tight text-foreground font-['Orbitron']">
                TCorp Business
              </span>
            </Link>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{t.verify.title}</h2>
            <p className="text-muted-foreground">
              {userEmail ? (
                <>
                  {t.verify.subtitle_with_email}{" "}
                  <span className="font-medium text-foreground">{userEmail}</span>
                </>
              ) : (
                t.verify.subtitle_default
              )}
            </p>
          </div>

          <div className="lg:hidden bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="size-4 text-primary" />
              <p className="text-sm font-medium text-foreground">{t.verify.mobile_card_title}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t.verify.mobile_card_desc}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t.verify.code_label}</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\\D/g, "").slice(0, 6))}
                  className="pl-11 h-12 bg-muted/50 border-border/50 focus:border-primary text-center text-2xl font-mono tracking-[0.5em]"
                  required
                  maxLength={6}
                  data-testid="input-verification-code"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isVerifying || verificationCode.length !== 6}
              data-testid="button-verify"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  {t.verify.submitting}
                </>
              ) : (
                t.verify.submit
              )}
            </Button>
          </form>

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {t.verify.resend_prompt}{" "}
              <button
                className="font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                onClick={handleResendCode}
                disabled={isResending || !userEmail}
                data-testid="button-resend-code"
              >
                {isResending ? t.verify.resend_sending : t.verify.resend_button}
              </button>
            </p>

            <p className="text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
                data-testid="link-back-login"
              >
                {t.verify.back_login}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
