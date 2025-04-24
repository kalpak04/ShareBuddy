import { useState } from 'react';
import { useP2P } from '@/hooks/use-p2p';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Wifi, WifiOff, Database, Shield, Server } from 'lucide-react';
import { formatSizeForDisplay } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function P2PControls() {
  const { user } = useAuth();
  const { 
    isConnected, 
    isConnecting, 
    connect, 
    disconnect, 
    registerNode,
    nodeId,
    peers,
    discoverPeers
  } = useP2P();
  
  const [storageAmount, setStorageAmount] = useState(1024); // 1GB default
  const [reliability, setReliability] = useState(3); // Medium reliability by default
  const [isPeerDiscovering, setIsPeerDiscovering] = useState(false);
  const [isProviderMode, setIsProviderMode] = useState(false);
  
  const handleConnectToggle = async () => {
    if (isConnected) {
      disconnect();
    } else {
      try {
        await connect();
      } catch (error) {
        console.error("Connection error:", error);
      }
    }
  };
  
  const handleDiscoverPeers = async () => {
    try {
      setIsPeerDiscovering(true);
      await discoverPeers();
    } catch (error) {
      console.error("Peer discovery error:", error);
    } finally {
      setIsPeerDiscovering(false);
    }
  };
  
  const handleRegisterNode = async () => {
    try {
      // Get approximate geolocation (in a real app, this would be more precise)
      const geolocation = "Unknown";
      
      await registerNode(storageAmount, geolocation);
      setIsProviderMode(true);
    } catch (error) {
      console.error("Node registration error:", error);
    }
  };
  
  const getConnectionStatus = () => {
    if (isConnecting) return "connecting";
    if (isConnected) return "connected";
    return "disconnected";
  };
  
  const getReliabilityLabel = () => {
    if (reliability <= 1) return "Low";
    if (reliability <= 3) return "Medium";
    if (reliability <= 4) return "High";
    return "Maximum";
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-gray-400" />}
            P2P Connection
          </CardTitle>
          <CardDescription>
            Connect to the ShareBuddy P2P network to access distributed storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span>Connection Status:</span>
              <Badge 
                variant={
                  getConnectionStatus() === "connected" ? "default" :
                  getConnectionStatus() === "connecting" ? "outline" : 
                  "destructive"
                }
                className={getConnectionStatus() === "connected" ? "bg-green-100 text-green-800 hover:bg-green-200 border-green-400" : ""}
              >
                {getConnectionStatus() === "connected" ? "Connected" :
                 getConnectionStatus() === "connecting" ? "Connecting..." : 
                 "Disconnected"}
              </Badge>
            </div>
            
            {nodeId && (
              <div className="flex items-center justify-between">
                <span>Node ID:</span>
                <Badge variant="outline" className="font-mono">
                  {nodeId.substring(0, 6)}...{nodeId.substring(nodeId.length - 4)}
                </Badge>
              </div>
            )}
            
            {isConnected && (
              <div className="flex items-center justify-between">
                <span>Available Peers:</span>
                <Badge>{peers.length}</Badge>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant={isConnected ? "outline" : "default"}
            onClick={handleConnectToggle}
            disabled={isConnecting}
          >
            {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
          
          {isConnected && (
            <Button
              variant="outline"
              onClick={handleDiscoverPeers}
              disabled={isPeerDiscovering}
            >
              {isPeerDiscovering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Server className="mr-2 h-4 w-4" />
              )}
              Discover Peers
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {user && user.role !== "renter" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Storage Provider
            </CardTitle>
            <CardDescription>
              Share your unused storage with the network and earn rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="providerMode">Provider Mode</Label>
                  <Switch
                    id="providerMode"
                    checked={isProviderMode}
                    onCheckedChange={setIsProviderMode}
                    disabled={isProviderMode && !!nodeId}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable this to share your storage and earn rewards
                </p>
              </div>
              
              {isProviderMode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="storageSlider">
                      Storage to Share: {formatSizeForDisplay(storageAmount)}
                    </Label>
                    <Slider
                      id="storageSlider"
                      min={512}
                      max={102400}
                      step={512}
                      value={[storageAmount]}
                      onValueChange={(value) => setStorageAmount(value[0])}
                      disabled={!!nodeId}
                    />
                    <p className="text-sm text-muted-foreground">
                      Select how much storage you want to share with the network
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-md bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Estimated Earnings</span>
                    </div>
                    <p className="text-sm">
                      You can earn approximately ₹{(storageAmount * 0.01).toFixed(2)} per month by sharing {formatSizeForDisplay(storageAmount)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
          <CardFooter>
            {isProviderMode && !nodeId && (
              <Button 
                onClick={handleRegisterNode}
                disabled={!isConnected}
                className="w-full"
              >
                Register as Storage Provider
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Configure redundancy and encryption settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reliabilitySlider">
                Data Reliability: {getReliabilityLabel()} ({reliability}/5)
              </Label>
              <Slider
                id="reliabilitySlider"
                min={1}
                max={5}
                step={1}
                value={[reliability]}
                onValueChange={(value) => setReliability(value[0])}
              />
              <p className="text-sm text-muted-foreground">
                Higher reliability means more redundancy but uses more storage
              </p>
            </div>
            
            <div className="flex justify-between items-center p-4 border rounded-md bg-muted/50">
              <div className="space-y-1">
                <p className="text-sm font-medium">End-to-End Encryption</p>
                <p className="text-xs text-muted-foreground">
                  All files are encrypted before being stored on the network
                </p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}