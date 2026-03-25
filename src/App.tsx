import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import DashboardsListPage from "@/pages/DashboardsListPage";
import DashboardBuilderPage from "@/pages/DashboardBuilderPage";
import RelayDetailPage from "@/pages/RelayDetailPage";
import RelaysPage from "@/pages/RelaysPage";
import NewRelayPage from "@/pages/NewRelayPage";
import ApiKeysPage from "@/pages/ApiKeysPage";
import AlertsPage from "@/pages/AlertsPage";
import ExplorePage from "@/pages/ExplorePage";
import SharedDashboardPage from "@/pages/SharedDashboardPage";
import UptimePage from "@/pages/UptimePage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import JellyfinPage from "@/pages/JellyfinPage";
import JellyfinUserPage from "@/pages/JellyfinUserPage";
import PlexPage from "@/pages/PlexPage";
import PlexUserPage from "@/pages/PlexUserPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import Onboarding, { isOnboardingComplete } from "@/components/Onboarding";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout>
      {!isOnboardingComplete() && <Onboarding />}
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboards" element={<DashboardsListPage />} />
        <Route path="/dashboards/:id" element={<DashboardBuilderPage />} />
        <Route path="/relays" element={<RelaysPage />} />
        <Route path="/relays/new" element={<NewRelayPage />} />
        <Route path="/relays/:id" element={<RelayDetailPage />} />
        <Route path="/uptime" element={<UptimePage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/setup" element={<Navigate to="/settings?tab=setup" replace />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/jellyfin" element={<JellyfinPage />} />
        <Route path="/jellyfin/user/:username" element={<JellyfinUserPage />} />
        <Route path="/plex" element={<PlexPage />} />
        <Route path="/plex/user/:username" element={<PlexUserPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AuthRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/shared/:token" element={<SharedDashboardPage />} />
            <Route path="/auth" element={<AuthRoutes />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
