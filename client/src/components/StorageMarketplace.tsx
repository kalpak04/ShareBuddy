import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, StorageNode } from '@shared/schema';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  HardDrive, 
  User as UserIcon, 
  MapPin, 
  Wifi, 
  Clock, 
  Shield, 
  DollarSign 
} from 'lucide-react';
import RazorpayPaymentForm from './RazorpayPaymentForm';

export default function StorageMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRentDialogOpen, setIsRentDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [storageAmount, setStorageAmount] = useState(1024); // 1GB in MB
  const [isPaymentFormVisible, setIsPaymentFormVisible] = useState(false);

  // Query available storage providers
  const { data: providers, isLoading, error } = useQuery<StorageNode[]>({
    queryKey: ['/api/storage-nodes'],
    queryFn: getQueryFn(),
    enabled: !!user,
  });

  // Function to rent storage from a provider
  const handleRentStorage = (provider: any) => {
    setSelectedProvider(provider);
    setIsRentDialogOpen(true);
  };

  // Function to handle payment success
  const handlePaymentSuccess = (result: any) => {
    toast({
      title: 'Storage Rented Successfully',
      description: `You've successfully rented ${storageAmount}MB from provider ${selectedProvider.userId}`,
    });
    
    // Close dialogs
    setIsPaymentFormVisible(false);
    setIsRentDialogOpen(false);
    
    // Invalidate relevant queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
  };

  // Function to proceed to payment
  const handleProceedToPayment = () => {
    if (storageAmount < 100) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum storage rental is 100MB',
        variant: 'destructive',
      });
      return;
    }
    
    setIsPaymentFormVisible(true);
  };

  // Mock data for demo if API data is not available
  // In a real application, this would be fetched from the backend
  const mockProviders = [
    {
      id: 1,
      userId: 2,
      nodeId: 'node_1',
      ipAddress: '192.168.1.1',
      storageTotal: 10240, // 10GB in MB
      storageAvailable: 8192, // 8GB in MB
      status: 'online',
      geolocation: 'Mumbai, India',
      lastSeen: new Date(),
      reputation: 92,
      uptimePercentage: 99,
      performanceMetrics: {
        avgResponseTime: 120,
        successfulTransfers: 245,
        failedTransfers: 3,
        avgBandwidth: 10.5,
      },
    },
    {
      id: 2,
      userId: 4,
      nodeId: 'node_2',
      ipAddress: '192.168.1.2',
      storageTotal: 20480, // 20GB in MB
      storageAvailable: 15360, // 15GB in MB
      status: 'online',
      geolocation: 'Delhi, India',
      lastSeen: new Date(),
      reputation: 88,
      uptimePercentage: 98,
      performanceMetrics: {
        avgResponseTime: 150,
        successfulTransfers: 178,
        failedTransfers: 5,
        avgBandwidth: 8.2,
      },
    },
  ];

  // Use API data if available, otherwise use mock data for demo
  const displayProviders = providers || mockProviders;

  // Format bytes to human readable format
  const formatStorage = (mb: number) => {
    if (mb < 1024) return `${mb} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };
  
  // Calculate price per month based on MB
  const calculatePrice = (mb: number) => {
    const gb = mb / 1024;
    return `₹${gb.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Storage Marketplace</h2>
      </div>
      
      <p className="text-muted-foreground mb-6">
        Rent storage space from trusted providers in your region. Pay only for what you use.
      </p>
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted rounded-xl"></div>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load storage providers.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayProviders.map((provider) => (
            <Card key={provider.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle>Provider #{provider.userId}</CardTitle>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    provider.status === 'online' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {provider.status}
                  </span>
                </div>
                <CardDescription className="flex items-center mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {provider.geolocation}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center">
                    <HardDrive className="h-4 w-4 mr-2 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Available</p>
                      <p className="font-medium">{formatStorage(provider.storageAvailable)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Reputation</p>
                      <p className="font-medium">{provider.reputation}/100</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Wifi className="h-4 w-4 mr-2 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Uptime</p>
                      <p className="font-medium">{provider.uptimePercentage}%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Response</p>
                      <p className="font-medium">{provider.performanceMetrics?.avgResponseTime || 150}ms</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center px-3 py-2 bg-muted rounded-md">
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-medium">₹1.00/GB per month</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleRentStorage(provider)}
                    disabled={user?.id === provider.userId}
                  >
                    Rent Storage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Rent Storage Dialog */}
      <Dialog open={isRentDialogOpen} onOpenChange={setIsRentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rent Storage Space</DialogTitle>
            <DialogDescription>
              {!isPaymentFormVisible ? 
                "Specify how much storage you would like to rent from this provider." :
                "Complete the payment to rent storage space."
              }
            </DialogDescription>
          </DialogHeader>
          
          {!isPaymentFormVisible ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="storage-amount">Storage Amount (MB)</Label>
                <Input
                  id="storage-amount"
                  type="number"
                  min="100"
                  step="100"
                  value={storageAmount}
                  onChange={(e) => setStorageAmount(parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {formatStorage(storageAmount)} will cost you {calculatePrice(storageAmount)} per month.
                </p>
              </div>
              
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setIsRentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleProceedToPayment}
                >
                  Proceed to Payment
                </Button>
              </div>
            </div>
          ) : (
            <RazorpayPaymentForm
              providerId={selectedProvider?.userId}
              storageAmount={storageAmount}
              onPaymentSuccess={handlePaymentSuccess}
              onCancel={() => setIsPaymentFormVisible(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}