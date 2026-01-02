import { Switch, Route, useLocation, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Inbox from "@/pages/inbox";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import VerifyPage from "@/pages/verify";
import LegalPage from "@/pages/legal";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import SimplePage from "@/pages/simple-page";
import BannedPage from "@/pages/banned";
import AccountPage from "@/pages/account";
import { useEffect } from "react";

function BanProtector() {
  const [location, setLocation] = useLocation();
  const [, banParams] = useRoute("/banned/:code");

  useEffect(() => {
    const isBannedRoute = location.startsWith("/banned/");

    if (isBannedRoute) {
      const urlParams = new URLSearchParams(window.location.search);
      const isPermanentStr = urlParams.get("isPermanent");
      const bannedUntilStr = urlParams.get("bannedUntil");
      
      sessionStorage.setItem("bannedCode", banParams?.code || "");
      sessionStorage.setItem("isBanPermanent", isPermanentStr === "true" ? "true" : "false");
      if (bannedUntilStr) {
        sessionStorage.setItem("banExpireTime", new Date(bannedUntilStr).getTime().toString());
        sessionStorage.setItem("bannedUntilStr", bannedUntilStr);
      }
      return;
    }

    const bannedCode = sessionStorage.getItem("bannedCode");
    const isBanPermanent = sessionStorage.getItem("isBanPermanent") === "true";
    const banExpireTimeStr = sessionStorage.getItem("banExpireTime");
    const bannedUntilStr = sessionStorage.getItem("bannedUntilStr");
    
    if (!bannedCode) return;

    if (banExpireTimeStr && !isBanPermanent) {
      const expireTime = parseInt(banExpireTimeStr, 10);
      if (Date.now() >= expireTime) {
        sessionStorage.removeItem("bannedCode");
        sessionStorage.removeItem("isBanPermanent");
        sessionStorage.removeItem("banExpireTime");
        sessionStorage.removeItem("bannedUntilStr");
        return;
      }
    }

    if (bannedCode && location !== `/banned/${bannedCode}`) {
      const params = new URLSearchParams({
        isPermanent: isBanPermanent.toString(),
      });
      if (bannedUntilStr) {
        params.set('bannedUntil', bannedUntilStr);
      }
      setLocation(`/banned/${bannedCode}?${params.toString()}`);
    }
  }, [location, banParams, setLocation]);

  return null;
}



function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <BanProtector />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/verify" component={VerifyPage} />
        <Route path="/privacy">
          {() => <LegalPage type="privacy" />}
        </Route>
        <Route path="/terms">
          {() => <LegalPage type="terms" />}
        </Route>
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/status" component={SimplePage} />
        <Route path="/docs" component={SimplePage} />
        <Route path="/security" component={SimplePage} />
        <Route path="/blog" component={SimplePage} />
        <Route path="/banned/:code" component={BannedPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
