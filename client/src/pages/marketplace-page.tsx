import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StorageMarketplace from '@/components/StorageMarketplace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Upload, HardDrive, ArrowRight } from 'lucide-react';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('rent');
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  // Handler for changing tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Check if user can be a provider (they have the provider or both role)
  const canBeProvider = user?.role === 'provider' || user?.role === 'both';

  // Redirect to provider settings if user tries to access provide tab but isn't a provider
  if (activeTab === 'provide' && !canBeProvider) {
    navigate('/provider-settings');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Storage Marketplace</h1>
      <Tabs defaultValue="rent" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="rent">Rent Storage</TabsTrigger>
          <TabsTrigger value="provide" disabled={!canBeProvider}>Provide Storage</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rent">
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-none mb-8">
              <CardHeader>
                <CardTitle>Find Perfect Storage Providers</CardTitle>
                <CardDescription>
                  Browse reliable storage providers in your region and rent space at affordable rates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/20 p-2 rounded-full">
                      <HardDrive className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Flexible Storage</h3>
                      <p className="text-sm text-muted-foreground">Rent exactly what you need, from 100MB to 100GB</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/20 p-2 rounded-full">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Pay-as-you-go</h3>
                      <p className="text-sm text-muted-foreground">No contracts, pay only for what you use</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/20 p-2 rounded-full">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Secure Backups</h3>
                      <p className="text-sm text-muted-foreground">End-to-end encrypted with redundancy</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <StorageMarketplace />
        </TabsContent>
        
        <TabsContent value="provide">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Provider Dashboard</CardTitle>
                <CardDescription>
                  Manage your storage offerings and track earnings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Shared</CardDescription>
                      <CardTitle>{user?.storageShared || 0} MB</CardTitle>
                    </CardHeader>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Current Rentals</CardDescription>
                      <CardTitle>0 Active</CardTitle>
                    </CardHeader>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Earnings</CardDescription>
                      <CardTitle>₹{((user?.earnings || 0) / 100).toFixed(2)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Provider Settings</h3>
                  <p className="text-muted-foreground">
                    Adjust how much storage you want to share and configure your node settings.
                  </p>
                  <Button 
                    onClick={() => navigate('/provider-settings')}
                    className="w-full md:w-auto"
                  >
                    Configure Node Settings
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Active Rentals</CardTitle>
                <CardDescription>
                  People currently renting storage space from you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center text-muted-foreground">
                  <p>No active rentals yet.</p>
                  <p className="text-sm mt-1">
                    When someone rents storage from you, they will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}