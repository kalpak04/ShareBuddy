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
import MarketplacePage from "@/pages/marketplace-page";
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
      <ProtectedRoute path="/marketplace" component={() => (
        <AppShell>
          <MarketplacePage />
        </AppShell>
      )} />
      <ProtectedRoute path="/payment-success" component={() => (
        <AppShell>
          <div className="container mx-auto px-4 py-12 max-w-md text-center">
            <div className="bg-green-100 text-green-800 p-4 rounded-full inline-flex mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
            <p className="mb-6">Your storage space has been successfully reserved. You can now start using it for your backups.</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/backup'}
                className="px-4 py-2 border border-primary text-primary rounded hover:bg-primary/10"
              >
                Start Backup
              </button>
            </div>
          </div>
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
