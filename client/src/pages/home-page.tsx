import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Upload, Cloud, DollarSign } from "lucide-react";
import { Link, useLocation } from "wouter";
import StorageStatus from "@/components/StorageStatus";
import StorageOption from "@/components/StorageOption";
import SafetyFeature from "@/components/SafetyFeature";
import FileItem from "@/components/FileItem";
import { File } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatSizeForDisplay } from "@/lib/utils";

export default function HomePage() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Helper to determine file icon based on type/category
  const getFileIcon = (file: File) => {
    switch (file.category) {
      case 'photos':
        return <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><Upload className="h-5 w-5 text-blue-600" /></div>;
      case 'videos':
        return <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center"><Upload className="h-5 w-5 text-red-600" /></div>;
      case 'documents':
        return <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><Upload className="h-5 w-5 text-green-600" /></div>;
      default:
        return <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center"><Upload className="h-5 w-5 text-purple-600" /></div>;
    }
  };

  // Fetch recent files
  const { data: files, isLoading: filesLoading } = useQuery<File[]>({
    queryKey: ['/api/files'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Mutation to reserve storage
  const reserveStorageMutation = useMutation({
    mutationFn: (reservedStorage: number) => 
      apiRequest("PATCH", "/api/user/storage", { reservedStorage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Storage reserved",
        description: "You have successfully reserved additional storage space.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reserve storage: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Reserve default storage for new users (10 GB)
  const handleReserveDefaultStorage = () => {
    if (user && (!user.storageReserved || user.storageReserved === 0)) {
      reserveStorageMutation.mutate(10240); // 10 GB in MB
    }
  };

  // Handle storage options click
  const handleRenterClick = () => {
    if (user && (!user.storageReserved || user.storageReserved === 0)) {
      handleReserveDefaultStorage();
    }
  };

  const handleProviderClick = () => {
    navigate("/provider-settings");
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-white">
            <Cloud className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold ml-2">ShareBuddy</h1>
        </div>
        <button className="text-muted-foreground">
          <Bell className="h-6 w-6" />
        </button>
      </div>

      {/* Storage Status Card */}
      <StorageStatus 
        usedStorage={user?.storageUsed || 0} 
        totalStorage={user?.storageReserved || 0} 
        showAlert={!!user?.storageReserved && user?.storageReserved > 0}
      />

      {!user?.storageReserved || user?.storageReserved === 0 ? (
        <div className="mb-5">
          <h2 className="font-medium mb-3">Get Started with ShareBuddy</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Reserve your first 10GB of storage space for only ₹10 per month to get started with ShareBuddy.
          </p>
          <Button className="w-full" onClick={handleReserveDefaultStorage}>
            Reserve 10GB for ₹10/month
          </Button>
        </div>
      ) : (
        <>
          {/* P2P Storage Options */}
          <h2 className="font-medium mb-3">Choose Your Option</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StorageOption
              title="Need Storage"
              description="Rent space for your files"
              icon={<Upload className="h-6 w-6 text-primary" />}
              isActive={user?.role === "renter" || user?.role === "both"}
              onClick={handleRenterClick}
              colorScheme="primary"
            />
            <StorageOption
              title="Provide Storage"
              description="Earn by sharing extra space"
              icon={<DollarSign className="h-6 w-6 text-secondary" />}
              isActive={user?.role === "provider" || user?.role === "both"}
              onClick={handleProviderClick}
              colorScheme="secondary"
            />
          </div>

          {/* Quick Access / Recent Files */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-medium">Recent Files</h2>
            <span 
              className="text-xs text-primary font-medium cursor-pointer" 
              onClick={() => navigate("/files")}
            >
              View All
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            {filesLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading files...</div>
            ) : files && files.length > 0 ? (
              files.slice(0, 3).map((file) => (
                <FileItem key={file.id} file={file} icon={getFileIcon(file)} />
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <p className="mb-2">No files uploaded yet</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/backup")}
                >
                  Start Backup
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Safety Features */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h2 className="font-medium mb-3">Your Data is Safe</h2>
        <SafetyFeature 
          title="End-to-End Encryption" 
          description="Your files are encrypted before leaving your device" 
        />
        <SafetyFeature 
          title="Redundant Storage" 
          description="Your files are stored across multiple devices for safety" 
        />
      </div>

      {/* Promotional */}
      <div className="bg-gradient-to-r from-primary to-purple-600 rounded-xl shadow-sm p-4 text-white">
        <h2 className="font-medium mb-1">Invite Friends</h2>
        <p className="text-xs text-white/90 mb-3">Get 1GB free storage for each friend who joins</p>
        <Button variant="secondary" className="w-full bg-white text-primary hover:bg-white/90">
          Share Invite Code
        </Button>
      </div>
    </div>
  );
}
