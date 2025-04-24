import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { ArrowLeft, DollarSign, CheckCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { formatSizeForDisplay } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProviderSettingsPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // State for storage slider
  const [sharedStorage, setSharedStorage] = useState(20000); // 20GB in MB
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Calculate available storage (total - used)
  const deviceStorage = 48 * 1024; // 48GB in MB
  const usedByUser = user?.storageUsed || 0;
  const availableToShare = deviceStorage - usedByUser;
  
  // Calculate percentages for progress bar
  const usedPercentage = (usedByUser / deviceStorage) * 100;
  
  // Estimate monthly earnings (₹0.80 per GB per month)
  const estimatedEarnings = (sharedStorage / 1024) * 0.80;

  // Become provider mutation
  const becomeProviderMutation = useMutation({
    mutationFn: () => {
      return apiRequest("PATCH", "/api/user/role", { 
        role: "provider",
        storageShared: sharedStorage 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Success!",
        description: "You are now a storage provider on ShareBuddy.",
      });
      navigate("/profile");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to become a provider: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleStartSharing = () => {
    if (!termsAccepted) {
      toast({
        title: "Terms not accepted",
        description: "Please accept the Terms of Service and Privacy Policy.",
        variant: "destructive",
      });
      return;
    }
    
    becomeProviderMutation.mutate();
  };
  
  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <button className="mr-3" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Become a Provider</h1>
      </div>

      {/* Provider Info */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mr-3">
            <DollarSign className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h2 className="font-medium">Earn Money Sharing Storage</h2>
            <p className="text-sm text-muted-foreground">Share your unused storage space</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          You can earn approximately ₹0.80 per GB per month by sharing your unused storage with others in the network.
        </p>
        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
            <p className="text-sm text-green-800">
              Your device meets the requirements to become a provider.
            </p>
          </div>
        </div>
      </div>

      {/* Available Storage */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <h2 className="font-medium mb-3">Available Storage</h2>
        <div className="flex items-center mb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-gray-300 mr-2"></div>
          <span className="text-sm">System Storage</span>
          <span className="text-sm ml-auto">{formatSizeForDisplay(deviceStorage)}</span>
        </div>
        <div className="flex items-center mb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-primary mr-2"></div>
          <span className="text-sm">Used by You</span>
          <span className="text-sm ml-auto">{formatSizeForDisplay(usedByUser)}</span>
        </div>
        <div className="flex items-center mb-4">
          <div className="h-2.5 w-2.5 rounded-full bg-secondary mr-2"></div>
          <span className="text-sm">Available to Share</span>
          <span className="text-sm font-medium ml-auto">{formatSizeForDisplay(availableToShare)}</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-primary" style={{ width: `${usedPercentage}%` }}></div>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1.5">
            How much storage would you like to share?
          </label>
          <div className="flex items-center">
            <Slider
              value={[sharedStorage]}
              max={availableToShare}
              step={1024} // 1GB steps
              onValueChange={(values) => setSharedStorage(values[0])}
              className="flex-1 mr-3"
            />
            <span className="text-sm font-medium">
              {formatSizeForDisplay(sharedStorage)}
            </span>
          </div>
        </div>
        <div className="bg-secondary/10 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-secondary">Estimated Monthly Earnings</h3>
            <span className="text-sm font-medium text-secondary">₹{estimatedEarnings.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on current network demand and your uptime
          </p>
        </div>
      </div>

      {/* Provider Requirements */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <h2 className="font-medium mb-3">Provider Requirements</h2>
        <div className="flex items-start mb-3">
          <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Stable Internet Connection</h3>
            <p className="text-xs text-muted-foreground">
              Your device has a stable internet connection
            </p>
          </div>
        </div>
        <div className="flex items-start mb-3">
          <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Device Storage</h3>
            <p className="text-xs text-muted-foreground">
              Your device has enough free storage
            </p>
          </div>
        </div>
        <div className="flex items-start">
          <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Charging Status</h3>
            <p className="text-xs text-muted-foreground">
              App will only share storage when charging
            </p>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <h2 className="font-medium mb-3">Payment Information</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Earnings are calculated daily and paid monthly. You'll need to add a payment method to receive your earnings.
        </p>
        <Button className="w-full flex items-center justify-center">
          <CreditCard className="h-5 w-5 mr-1.5" />
          Add Payment Method
        </Button>
      </div>

      {/* Terms and Privacy */}
      <div className="mb-5">
        <div className="flex items-start mb-4">
          <Checkbox 
            id="terms" 
            className="mt-1 mr-2" 
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(!!checked)}
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground">
            I agree to the <a href="#" className="text-primary">Terms of Service</a> and <a href="#" className="text-primary">Privacy Policy</a> for providing storage on the ShareBuddy network.
          </label>
        </div>
        <Button 
          variant="secondary" 
          className="w-full"
          disabled={!termsAccepted || becomeProviderMutation.isPending}
          onClick={handleStartSharing}
        >
          {becomeProviderMutation.isPending ? "Processing..." : "Start Sharing Storage"}
        </Button>
      </div>
    </div>
  );
}
