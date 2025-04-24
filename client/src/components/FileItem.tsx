import { MoreVertical } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { File } from "@shared/schema";
import { formatBytes, getStatusColor, getStatusDisplay } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FileItemProps {
  file: File;
  icon: React.ReactNode;
}

export default function FileItem({ file, icon }: FileItemProps) {
  const { toast } = useToast();

  const deleteFileMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/files/${file.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete file: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this file?")) {
      deleteFileMutation.mutate();
    }
  };

  return (
    <div className="p-4 border-b border-gray-100 flex items-center">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center mr-3">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate">{file.name}</h3>
        <p className="text-xs text-muted-foreground">
          {formatBytes(file.size)} · {getStatusDisplay(file.status)}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <div className={`h-2 w-2 bg-${getStatusColor(file.status)}-500 rounded-full`}></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground focus:outline-none">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
            <DropdownMenuItem>Download</DropdownMenuItem>
            <DropdownMenuItem>Share</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
