import { useEffect } from "react";
import { Link } from "@/components/ui/link";
import { LayoutDashboard, Home } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function NotFound() {
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const handleKey = () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const labels = t.notfound;

  return (
    <div className="notfound-wrapper">
      {/* Top bar outside the blue rectangle */}
      <header className="notfound-topbar">
        <div className="notfound-logo">TCorp Business</div>

        <div className="notfound-top-center">
          <Link href="/" className="notfound-icon-button" aria-label={labels.home_label}>
            <Home className="notfound-icon" />
          </Link>
          <span className="notfound-top-divider" />
          <Link href="/inbox" className="notfound-icon-button" aria-label={labels.dashboard_label}>
            <LayoutDashboard className="notfound-icon" />
          </Link>
        </div>

        <div className="notfound-lang">
          <button
            type="button"
            onClick={() => setLanguage("es")}
            className={`notfound-lang-btn ${language === "es" ? "active" : ""}`}
          >
            ES
          </button>
          <span className="notfound-lang-sep">/</span>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`notfound-lang-btn ${language === "en" ? "active" : ""}`}
          >
            EN
          </button>
        </div>
      </header>

      {/* Blue BSOD-style rectangle */}
      <main className="notfound-main">
        <div className="notfound-card">
          <div className="notfound">
            <div className="centered">
              <span className="bsod-404-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;
            </div>
            <div className="centered">
              <span
                className="bsod-404-block"
                style={{ color: "#000084", backgroundColor: "#bbb" }}
              >
                &nbsp;4&nbsp;0&nbsp;4&nbsp;
              </span>
              <span className="bsod-404-shadow">&nbsp;</span>
            </div>
            <div className="centered">
              <span className="bsod-404-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span className="bsod-404-shadow">&nbsp;</span>
            </div>
            <div className="centered">
              &nbsp;<span className="bsod-404-shadow">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </div>
            <div className="row">&nbsp;</div>
            <div className="row">{labels.lines.fatal}</div>
            <div className="row">{labels.lines.terminated}</div>
            <div className="row">&nbsp;</div>
            <div className="row">{labels.lines.press_return}</div>
            <div className="row">{labels.lines.press_ctrl}</div>
            <div className="row">{labels.lines.lose_info}</div>
            <div className="row">&nbsp;</div>
            <div className="centered">
              {labels.lines.continue}
              <span className="blink">&#9608;</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer text outside the blue rectangle */}
      <footer className="notfound-footer">{labels.footer}</footer>
    </div>
  );
}
