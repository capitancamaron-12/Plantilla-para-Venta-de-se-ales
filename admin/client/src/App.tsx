import { useEffect, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import InboxesPage from "./pages/InboxesPage";
import DomainsPage from "./pages/DomainsPage";
import CybertempPage from "./pages/CybertempPage";
import SecurityPage from "./pages/SecurityPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import AdsPage from "./pages/AdsPage";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import LoadingScreen from "./components/LoadingScreen";

function App() {
  const [location] = useLocation();
  const { admin, loading } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const pathMatch = location.match(/^\/secure\/([^/]+)/);
    if (pathMatch) {
      setSlug(pathMatch[1]);
    }
  }, [location]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!admin || !slug) {
    return <LoginPage />;
  }

  return (
    <Layout slug={slug}>
      <Switch>
        <Route path="/secure/:slug" component={DashboardPage} />
        <Route path="/secure/:slug/users" component={UsersPage} />
        <Route path="/secure/:slug/inboxes" component={InboxesPage} />
        <Route path="/secure/:slug/domains" component={DomainsPage} />
        <Route path="/secure/:slug/cybertemp" component={CybertempPage} />
        <Route path="/secure/:slug/security" component={SecurityPage} />
        <Route path="/secure/:slug/logs" component={LogsPage} />
        <Route path="/secure/:slug/ads" component={AdsPage} />
        <Route path="/secure/:slug/settings" component={SettingsPage} />
        <Route>
          <DashboardPage />
        </Route>
      </Switch>
    </Layout>
  );
}

export default App;
