import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import FilesPage from "@/pages/files-page";
import BackupPage from "@/pages/backup-page";
import ProfilePage from "@/pages/profile-page";
import AuthPage from "@/pages/auth-page";
import ProviderSettingsPage from "@/pages/provider-settings-page";
import P2PSettingsPage from "@/pages/p2p-settings-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AppShell from "@/components/layouts/AppShell";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={() => (
        <AppShell>
          <HomePage />
        </AppShell>
      )} />
      <ProtectedRoute path="/files" component={() => (
        <AppShell>
          <FilesPage />
        </AppShell>
      )} />
      <ProtectedRoute path="/backup" component={() => (
        <AppShell>
          <BackupPage />
        </AppShell>
      )} />
      <ProtectedRoute path="/profile" component={() => (
        <AppShell>
          <ProfilePage />
        </AppShell>
      )} />
      <ProtectedRoute path="/provider-settings" component={() => (
        <AppShell>
          <ProviderSettingsPage />
        </AppShell>
      )} />
      <ProtectedRoute path="/p2p-settings" component={() => (
        <AppShell>
          <P2PSettingsPage />
        </AppShell>
      )} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
