import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Settings, PlusCircle, Image, Video, FileText, Package, Zap, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatSizeForDisplay } from "@/lib/utils";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { File } from "@shared/schema";
import { useState } from "react";

export default function BackupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [backupInProgress, setBackupInProgress] = useState(false);
  
  // Fetch files
  const { data: files } = useQuery<File[]>({
    queryKey: ['/api/files'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Upload a mock file for testing
  const uploadFileMutation = useMutation({
    mutationFn: async (category: string) => {
      const mockFile = {
        name: `Test${category.charAt(0).toUpperCase() + category.slice(1)}_${Date.now()}.${category === 'photos' ? 'jpg' : category === 'videos' ? 'mp4' : 'pdf'}`,
        size: Math.floor(Math.random() * 1000000) + 100000, // Between 100KB and 1MB
        type: category === 'photos' ? 'image/jpeg' : category === 'videos' ? 'video/mp4' : 'application/pdf',
        category: category,
        path: `/user_files/${category}/`,
      };
      
      const res = await apiRequest("POST", "/api/files", mockFile);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded and is being backed up.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start backup
  const handleBackupNow = () => {
    if (!user || user.storageReserved === 0) {
      toast({
        title: "Storage not reserved",
        description: "Please reserve storage space before backing up files.",
        variant: "destructive",
      });
      return;
    }
    
    setBackupInProgress(true);
    
    // Mock backup of each category
    Promise.all([
      uploadFileMutation.mutateAsync('photos'),
      uploadFileMutation.mutateAsync('videos'),
      uploadFileMutation.mutateAsync('documents')
    ]).finally(() => {
      setBackupInProgress(false);
    });
  };

  // Calculate backup stats
  const backedUpFiles = files?.filter(f => f.status === 'backed_up') || [];
  const backedUpSize = backedUpFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024); // Convert to MB
  const backupPercentage = user?.storageReserved ? Math.min(100, Math.round((backedUpSize / user.storageReserved) * 100)) : 0;
  const lastBackupDate = backedUpFiles.length > 0 
    ? new Date(Math.max(...backedUpFiles.map(f => new Date(f.createdAt).getTime())))
    : null;
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Backup</h1>
        <button className="text-muted-foreground">
          <Settings className="h-6 w-6" />
        </button>
      </div>

      {/* Backup Status */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Backup Status</h2>
          <div className="flex items-center bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-medium">
            <div className="h-1.5 w-1.5 bg-green-600 rounded-full mr-1"></div>
            Active
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Last backup: {lastBackupDate ? lastBackupDate.toLocaleString() : 'No backups yet'}
        </p>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary" style={{ width: `${backupPercentage}%` }}></div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mb-4">
          <span>{formatSizeForDisplay(backedUpSize)} backed up</span>
          <span>{formatSizeForDisplay(user?.storageReserved || 0)} reserved</span>
        </div>
        <div className="flex justify-between">
          <Button 
            className="bg-primary text-white py-2 px-4 rounded-lg text-sm font-medium flex-1 mr-2"
            onClick={handleBackupNow}
            disabled={backupInProgress || uploadFileMutation.isPending}
          >
            {backupInProgress || uploadFileMutation.isPending ? "Backing up..." : "Backup Now"}
          </Button>
          <Button variant="outline" className="flex-1">Settings</Button>
        </div>
      </div>

      {/* Backup Plan */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <h2 className="font-medium mb-3">Your Backup Plan</h2>
        <div className="bg-green-50 border border-green-100 p-3 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-700">Basic Plan</h3>
            <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">Active</span>
          </div>
          <div className="flex items-center text-green-600 mb-2">
            <PlusCircle className="h-5 w-5 mr-1.5" />
            <p className="text-sm">{formatSizeForDisplay(user?.storageReserved || 0)} Storage</p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="mb-1">Cost: ₹{(user?.storageReserved || 0) / 1024}/month (₹1/GB-month)</p>
            <p>Renews on: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
          </div>
        </div>
        <Button className="w-full flex items-center justify-center">
          <PlusCircle className="h-5 w-5 mr-1.5" />
          Upgrade Plan
        </Button>
      </div>

      {/* Backup Categories */}
      <h2 className="font-medium mb-3">What to Backup</h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-5">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
              <Image className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Photos</h3>
              <p className="text-xs text-muted-foreground">
                {formatSizeForDisplay(
                  files
                    ?.filter(f => f.category === 'photos')
                    .reduce((sum, f) => sum + f.size, 0) / (1024 * 1024) || 0
                )}
              </p>
            </div>
          </div>
          <Switch id="photos-backup" defaultChecked />
        </div>
        
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center mr-3">
              <Video className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Videos</h3>
              <p className="text-xs text-muted-foreground">
                {formatSizeForDisplay(
                  files
                    ?.filter(f => f.category === 'videos')
                    .reduce((sum, f) => sum + f.size, 0) / (1024 * 1024) || 0
                )}
              </p>
            </div>
          </div>
          <Switch id="videos-backup" defaultChecked />
        </div>
        
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Documents</h3>
              <p className="text-xs text-muted-foreground">
                {formatSizeForDisplay(
                  files
                    ?.filter(f => f.category === 'documents')
                    .reduce((sum, f) => sum + f.size, 0) / (1024 * 1024) || 0
                )}
              </p>
            </div>
          </div>
          <Switch id="documents-backup" defaultChecked />
        </div>
        
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Apps</h3>
              <p className="text-xs text-muted-foreground">
                {formatSizeForDisplay(
                  files
                    ?.filter(f => f.category === 'apps')
                    .reduce((sum, f) => sum + f.size, 0) / (1024 * 1024) || 0
                )}
              </p>
            </div>
          </div>
          <Switch id="apps-backup" />
        </div>
      </div>

      {/* Encryption Status */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <div className="flex items-center mb-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-medium">End-to-End Encryption</h2>
            <p className="text-sm text-muted-foreground">Your data is secure</p>
          </div>
        </div>
        <div className="bg-primary/5 p-3 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Your backup is encrypted with a secure key that only you have access to. No one can view your data without this key.</p>
          <Button variant="link" className="p-0 h-auto text-primary text-sm font-medium">Manage Encryption Keys</Button>
        </div>
      </div>

      {/* Auto-Backup Settings */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <h2 className="font-medium mb-3">Auto-Backup Settings</h2>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Zap className="h-5 w-5 text-muted-foreground mr-2" />
            <Label htmlFor="wifi-only" className="text-sm">Backup on WiFi only</Label>
          </div>
          <Switch id="wifi-only" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-muted-foreground mr-2" />
            <Label htmlFor="schedule" className="text-sm">Daily backup schedule</Label>
          </div>
          <Switch id="schedule" defaultChecked />
        </div>
      </div>
    </div>
  );
}
