import { useAuth } from "@/hooks/use-auth";
import AppShell from "@/components/layouts/AppShell";
import P2PControls from "@/components/P2PControls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Server, Layers, Radio } from "lucide-react";

export default function P2PSettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground">Please log in to access P2P settings</p>
      </div>
    );
  }

  return (
      <div className="container px-4 py-8 mx-auto max-w-6xl">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold">P2P & Security Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure your distributed storage and security preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <P2PControls />
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-orange-500" />
                    Security Features
                  </CardTitle>
                  <CardDescription>
                    Built-in security features protecting your data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium">End-to-End Encryption</h3>
                      <p className="text-sm text-muted-foreground">
                        All data is encrypted before leaving your device
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Layers className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Erasure Coding</h3>
                      <p className="text-sm text-muted-foreground">
                        Data is split into chunks with redundancy for reliability
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Server className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Provider Reputation</h3>
                      <p className="text-sm text-muted-foreground">
                        Only trusted providers store your data
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Radio className="h-5 w-5 text-pink-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Geographic Distribution</h3>
                      <p className="text-sm text-muted-foreground">
                        Data spread across multiple locations for safety
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                  <CardDescription>
                    Understanding ShareBuddy's P2P technology
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li className="text-sm">
                      <span className="font-medium">Split & Encrypt:</span> Your files are split into chunks, encrypted, and distributed
                    </li>
                    <li className="text-sm">
                      <span className="font-medium">Redundancy:</span> Additional parity chunks ensure recovery even if some are lost
                    </li>
                    <li className="text-sm">
                      <span className="font-medium">Distribution:</span> Chunks are stored across multiple provider devices
                    </li>
                    <li className="text-sm">
                      <span className="font-medium">Recovery:</span> When needed, chunks are retrieved and reassembled
                    </li>
                  </ol>

                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium">Provider Mode</p>
                    <p className="text-muted-foreground mt-1">
                      Share your unused storage and earn ₹1 per GB per month - that's 30-60% cheaper than conventional cloud storage!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
  );
}