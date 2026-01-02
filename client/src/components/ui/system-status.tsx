import { useState, useEffect } from "react";

export function SystemStatus() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const checkTheme = () => {
      const dashboardRoot = document.querySelector(".dashboard-theme");
      if (dashboardRoot?.classList.contains("dashboard-dark")) {
        setTheme("dark");
        return;
      }
      setTheme("light");
    };

    checkTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          checkTheme();
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex items-center min-w-[250px] min-h-[30px]">
      <img
        src={`/api/status-badge?theme=${theme}`}
        width="250"
        height="30"
        loading="eager"
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
