import { useLocation } from "wouter";
import { Link } from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { SystemStatus } from "@/components/ui/system-status";
import { 
  Menu,
  Languages,
  ChevronDown,
  LogOut,
  User,
  ArrowRight
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isInbox = location === "/inbox";
  const isHome = location === "/";
  const isDashboard = location === "/inbox" || location === "/account";
  const { t, language, setLanguage } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [headerMode, setHeaderMode] = useState<"transparent" | "glass" | "solid">("solid");

  useEffect(() => {
    if (!isHome) {
      setHeaderMode("solid");
      return;
    }

    const handleScroll = () => {
      const y = window.scrollY;
      const secondSectionThreshold = window.innerHeight - 80;

      if (y < 20) {
        setHeaderMode("transparent");
      } else if (y < secondSectionThreshold) {
        setHeaderMode("glass");
      } else {
        setHeaderMode("solid");
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const toggleLanguage = (lang: 'es' | 'en') => {
    setLanguage(lang);
    setIsLangOpen(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const dashboardThemeClass = isDashboard && isAuthenticated ? "dashboard-theme" : "";

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased bg-background text-foreground ${dashboardThemeClass}`}>
      <header
        className={`sticky top-0 z-50 w-full ${
          isHome && headerMode === "solid"
            ? "border-b border-border/40"
            : !isHome
              ? "border-b border-border/40"
              : ""
        }`}
      >
        <div className="relative">
          <div
            className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
              isHome
                ? headerMode === "transparent"
                  ? "opacity-0 bg-transparent"
                  : headerMode === "glass"
                    ? "opacity-100 bg-background/40 backdrop-blur-sm supports-[backdrop-filter]:bg-background/30"
                    : "opacity-100 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                : "opacity-100 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            }`}
          />
          <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between relative">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
                <span className="text-xl font-bold tracking-wider text-foreground group-hover:opacity-80 transition-opacity font-['Orbitron']">
                  TCorp Business
                </span>
            </Link>

            {/* Desktop Nav */}
            {!isAuthenticated && (
              <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer relative group py-2">
                  {t.nav.overview}
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
                </Link>
                <Link href="/#features" className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer relative group py-2">
                  {t.nav.infrastructure}
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
                </Link>
                <Link href="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer relative group py-2">
                  {t.nav.pricing}
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
                </Link>
              </nav>
            )}

            <div className="hidden md:flex items-center gap-4">
            {/* Smooth Language Dropdown (CSS Transition) */}
            <div className="relative" onMouseLeave={() => setIsLangOpen(false)}>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsLangOpen(!isLangOpen)}
                onMouseEnter={() => setIsLangOpen(true)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Languages className="size-4" />
                <span className="uppercase">{language}</span>
                <ChevronDown className={`size-3 transition-transform duration-300 ${isLangOpen ? 'rotate-180' : ''}`} />
              </Button>
              
              <div 
                className={`absolute top-full right-0 pt-2 w-32 z-50 transition-all duration-300 ease-out origin-top ${
                  isLangOpen 
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
                    : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                }`}
              >
                <div className="bg-card border border-border shadow-lg rounded-sm overflow-hidden p-1">
                  <button 
                    onClick={() => toggleLanguage('es')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-sm transition-colors flex items-center justify-between ${language === 'es' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                  >
                    Español
                    {language === 'es' && <div className="size-1.5 rounded-full bg-primary" />}
                  </button>
                  <button 
                    onClick={() => toggleLanguage('en')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-sm transition-colors flex items-center justify-between ${language === 'en' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                  >
                    English
                    {language === 'en' && <div className="size-1.5 rounded-full bg-primary" />}
                  </button>
                </div>
              </div>
            </div>

            {isAuthenticated && !authLoading ? (
              <div className="flex items-center gap-3 pl-3 border-l border-border/40 animate-in fade-in slide-in-from-right-2 duration-300">
                <Link href="/account">
                  <Button variant="ghost" size="sm" className="group text-muted-foreground hover:text-foreground gap-2 transition-[color,background-color] duration-300 ease-out active:scale-95" data-testid="button-account">
                    <User className="size-4" />
                    <span className="text-xs transition-transform duration-300 ease-out transform-gpu origin-left group-hover:scale-[1.03] will-change-transform">{user?.email}</span>
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="group text-muted-foreground hover:text-foreground transition-[color,background-color] duration-300 ease-out active:scale-95"
                  data-testid="button-logout"
                >
                  <LogOut className="size-4 transition-transform duration-300 ease-out transform-gpu origin-center group-hover:scale-[1.03] will-change-transform" />
                </Button>
              </div>
            ) : (
              <Link href={isInbox ? "/account" : "/inbox"}>
                <Button 
                  variant={isInbox ? "secondary" : "default"} 
                  className="group font-medium px-6 shadow-none rounded-sm transition-[color,background-color,transform] duration-300 ease-out relative overflow-hidden active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2 transition-transform duration-300 ease-out transform-gpu group-hover:-translate-x-2 group-hover:scale-[1.03]">
                    {isInbox ? t.nav.dashboard : t.nav.access_dashboard}
                  </span>
                  <ArrowRight className="absolute right-4 size-4 opacity-0 scale-50 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100" />
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Nav */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col h-full border-l border-border/40 pt-16">
              <div className="flex-1 flex flex-col gap-8">
                {isAuthenticated && !authLoading ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground px-2 mb-2">{user?.email}</p>
                    <Link href="/account">
                      <Button variant="ghost" className="w-full justify-start gap-3 text-base font-medium px-2 hover:bg-muted/50 h-12">
                        <User className="size-5" />
                        Mi Cuenta
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 text-base font-medium px-2 hover:bg-muted/50 h-12 text-destructive hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-5" />
                      Cerrar sesión
                    </Button>
                  </div>
                ) : (
                  <nav className="flex flex-col gap-2">
                    <Link href="/" className="flex items-center justify-between py-3 px-2 text-lg font-medium hover:text-primary transition-colors group border-b border-border/40">
                      {t.nav.overview}
                      <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </Link>
                    <Link href="/#features" className="flex items-center justify-between py-3 px-2 text-lg font-medium hover:text-primary transition-colors group border-b border-border/40">
                      {t.nav.infrastructure}
                      <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </Link>
                    <Link href="/#pricing" className="flex items-center justify-between py-3 px-2 text-lg font-medium hover:text-primary transition-colors group border-b border-border/40">
                      {t.nav.pricing}
                      <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </Link>
                  </nav>
                )}
              </div>

              <div className="mt-auto flex flex-col gap-6 pt-6 pb-4">
                {!isAuthenticated && (
                  <Link href="/inbox">
                    <Button className="w-full h-12 text-base font-medium shadow-none rounded-sm">
                      {t.nav.access_dashboard}
                    </Button>
                  </Link>
                )}

                <div className="flex flex-col gap-3 px-2 pt-6 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleLanguage('es')}
                      className={`h-8 px-3 font-medium ${language === 'es' ? 'text-foreground bg-muted/50' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      ES
                    </Button>
                    <div className="h-4 w-px bg-border/60 mx-1" />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleLanguage('en')}
                      className={`h-8 px-3 font-medium ${language === 'en' ? 'text-foreground bg-muted/50' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      EN
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      </header>

      <main className="flex-1 selection:bg-primary/20">
        <div key={location}>
          {children}
        </div>
      </main>

      <footer className="border-t border-border/40 bg-muted/20 py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-['Orbitron'] font-bold text-lg">
                TCorp Business
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {language === 'es' ? 'Infraestructura de privacidad digital para equipos que valoran la seguridad y la eficiencia.' : 'Digital privacy infrastructure for teams valuing security and efficiency.'}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground/80">{t.nav.product}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="https://status.tcorp.email" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{t.nav.status}</a></li>
                <li><Link href="/security" className="hover:text-foreground transition-colors">{t.nav.security}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground/80">{t.nav.company}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">{t.nav.about}</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition-colors">{t.nav.blog}</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">{t.nav.contact}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground/80">{t.nav.legal}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">{t.nav.privacy}</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">{t.nav.terms}</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2024 TCorp Business Inc. {t.nav.rights}</p>
            <div className="flex gap-6">
               <SystemStatus />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
