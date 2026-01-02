import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Eye, EyeOff, Tag } from "lucide-react";
import { Link } from "@/components/ui/link";
import { useLanguage } from "@/lib/i18n";
import { motion } from "framer-motion";
import { SimpleCaptcha } from "@/components/ui/simple-captcha";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, isRegistering, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t, language, setLanguage } = useLanguage();

  if (isAuthenticated) {
    setLocation("/inbox");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaVerified) {
      toast({
        title: t.register.toast.verification_required_title,
        description: t.register.toast.verification_required_desc,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t.register.toast.error_title,
        description: t.register.toast.password_mismatch,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await register({ email, password });
      if (response.requiresVerification) {
        toast({
          title: t.register.toast.account_created_title,
          description: t.register.toast.account_created_desc,
        });
        setLocation(`/verify?email=${encodeURIComponent(email)}`);
      } else {
        setLocation("/inbox");
      }
    } catch (error: any) {
      toast({
        title: t.register.toast.error_title,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const benefits = t.register.benefits;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 pt-4">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
          <span className="text-xl font-bold tracking-wider text-foreground group-hover:opacity-80 transition-opacity font-['Orbitron']">
            TCorp Business
          </span>
        </Link>

        <div className="notfound-lang">
          <button
            type="button"
            onClick={() => setLanguage("es")}
            className={`notfound-lang-btn ${language === "es" ? "active" : ""}`}
            data-testid="button-lang-es"
          >
            ES
          </button>
          <span className="notfound-lang-sep">/</span>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`notfound-lang-btn ${language === "en" ? "active" : ""}`}
            data-testid="button-lang-en"
          >
            EN
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)] gap-10 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:flex auth-panel auth-panel-gif rounded-[40px] overflow-hidden relative lg:-ml-16 xl:-ml-24 2xl:-ml-32"
          >
            <div className="relative z-10 flex flex-col justify-center w-full px-8 py-12">
              <div className="space-y-6">
                <h1 className="text-3xl md:text-4xl font-bold auth-panel-text leading-tight">
                  {t.register.hero_title}
                  <br />
                  <span className="text-primary">{t.register.hero_title_highlight}</span>
                </h1>
                <p className="mt-3 text-base md:text-lg auth-panel-muted">{t.register.hero_desc}</p>

                <div className="space-y-4">
                  {benefits.slice(0, 3).map((benefit) => (
                    <div key={benefit} className="flex items-center gap-3 auth-panel-soft">
                      <Shield className="size-5" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg mx-auto lg:ml-auto lg:border-l lg:border-border/40 lg:pl-10"
          >
            <form onSubmit={handleSubmit} className="login-form form">
              <p id="heading">{t.register.form_heading}</p>
              <div className="field">
                <svg
                  className="input-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z"></path>
                </svg>
                <input
                  autoComplete="off"
                  placeholder={t.register.email_placeholder}
                  className="input-field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="field">
                <svg
                  className="input-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
                </svg>
                <input
                  placeholder={t.register.password_placeholder}
                  className="input-field"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t.register.hide_password : t.register.show_password}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <div className="field">
                <svg
                  className="input-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
                </svg>
                <input
                  placeholder={t.register.confirm_password_placeholder}
                  className="input-field"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? t.register.hide_password : t.register.show_password}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <div className="field">
                <Tag className="input-icon" />
                <input
                  placeholder={`${t.register.promo_label} ${t.register.promo_optional}`}
                  className="input-field"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  data-testid="input-promo-code"
                />
              </div>

              <div className="login-captcha">
                <label className="login-captcha-label">{t.register.security_label}</label>
                <SimpleCaptcha onVerify={setCaptchaVerified} className="login-captcha-box" />
              </div>

              <div className="btn">
                <button
                  className="button1"
                  type="submit"
                  disabled={isRegistering || !captchaVerified}
                  data-testid="button-register"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t.register.submitting}
                    </>
                  ) : (
                    t.register.submit
                  )}
                </button>
                <button
                  className="button2"
                  type="button"
                  onClick={() => setLocation("/login")}
                  data-testid="button-login"
                >
                  {t.register.login_link}
                </button>
              </div>
              <button
                className="button3"
                type="button"
                onClick={() => setLocation("/contact")}
                data-testid="button-forgot"
              >
                {t.register.forgot_password}
              </button>
              <p className="login-terms">
                {t.register.terms_prefix}{" "}
                <Link href="/terms" className="login-terms-link">
                  {t.register.terms}
                </Link>{" "}
                {t.register.terms_joiner}{" "}
                <Link href="/privacy" className="login-terms-link">
                  {t.register.privacy}
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </main>

      <footer className="px-6 pb-4 text-center text-xs text-muted-foreground">
        {t.register.footer}
      </footer>
    </div>
  );
}
