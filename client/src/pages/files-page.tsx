import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, FolderIcon, Image, Video, FileText, Package } from "lucide-react";
import { File } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import FileItem from "@/components/FileItem";
import FolderItem from "@/components/FolderItem";
import { Skeleton } from "@/components/ui/skeleton";

export default function FilesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch all files
  const { data: files, isLoading } = useQuery<File[]>({
    queryKey: ['/api/files'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // File category icons
  const categoryIcons = {
    all: <div className="h-6 w-6 text-blue-600"><FolderIcon /></div>,
    photos: <div className="h-6 w-6 text-purple-600"><Image /></div>,
    videos: <div className="h-6 w-6 text-red-600"><Video /></div>,
    documents: <div className="h-6 w-6 text-green-600"><FileText /></div>,
    apps: <div className="h-6 w-6 text-yellow-600"><Package /></div>
  };

  // Helper function to get file icon
  const getFileIcon = (file: File) => {
    switch (file.category) {
      case 'photos':
        return <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center"><Image className="h-5 w-5 text-purple-600" /></div>;
      case 'videos':
        return <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center"><Video className="h-5 w-5 text-red-600" /></div>;
      case 'documents':
        return <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><FileText className="h-5 w-5 text-green-600" /></div>;
      case 'apps':
        return <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center"><Package className="h-5 w-5 text-yellow-600" /></div>;
      default:
        return <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><FolderIcon className="h-5 w-5 text-blue-600" /></div>;
    }
  };

  // Filter files based on selected category
  const filteredFiles = selectedCategory 
    ? files?.filter(file => file.category === selectedCategory) 
    : files;

  // Calculate folder statistics
  const folderStats = files ? files.reduce((acc, file) => {
    const category = file.category || 'other';
    if (!acc[category]) {
      acc[category] = { count: 0, size: 0 };
    }
    acc[category].count += 1;
    acc[category].size += file.size / (1024 * 1024); // Convert bytes to MB
    return acc;
  }, {} as Record<string, { count: number, size: number }>) : {};

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">My Files</h1>
        <div className="flex items-center space-x-3">
          <button className="text-muted-foreground">
            <Search className="h-6 w-6" />
          </button>
          <button className="text-muted-foreground">
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* File Categories */}
      <div className="flex overflow-x-auto space-x-3 pb-3 mb-5 -mx-4 px-4 scrollbar-hide">
        <div 
          className="flex-shrink-0 flex flex-col items-center cursor-pointer"
          onClick={() => setSelectedCategory(null)}
        >
          <div className={`h-14 w-14 rounded-full ${selectedCategory === null ? 'bg-blue-600' : 'bg-blue-100'} flex items-center justify-center mb-1`}>
            <FolderIcon className={`h-6 w-6 ${selectedCategory === null ? 'text-white' : 'text-blue-600'}`} />
          </div>
          <span className="text-xs font-medium">All Files</span>
        </div>
        
        <div 
          className="flex-shrink-0 flex flex-col items-center cursor-pointer"
          onClick={() => setSelectedCategory('photos')}
        >
          <div className={`h-14 w-14 rounded-full ${selectedCategory === 'photos' ? 'bg-purple-600' : 'bg-purple-100'} flex items-center justify-center mb-1`}>
            <Image className={`h-6 w-6 ${selectedCategory === 'photos' ? 'text-white' : 'text-purple-600'}`} />
          </div>
          <span className="text-xs font-medium">Photos</span>
        </div>
        
        <div 
          className="flex-shrink-0 flex flex-col items-center cursor-pointer"
          onClick={() => setSelectedCategory('videos')}
        >
          <div className={`h-14 w-14 rounded-full ${selectedCategory === 'videos' ? 'bg-red-600' : 'bg-red-100'} flex items-center justify-center mb-1`}>
            <Video className={`h-6 w-6 ${selectedCategory === 'videos' ? 'text-white' : 'text-red-600'}`} />
          </div>
          <span className="text-xs font-medium">Videos</span>
        </div>
        
        <div 
          className="flex-shrink-0 flex flex-col items-center cursor-pointer"
          onClick={() => setSelectedCategory('documents')}
        >
          <div className={`h-14 w-14 rounded-full ${selectedCategory === 'documents' ? 'bg-green-600' : 'bg-green-100'} flex items-center justify-center mb-1`}>
            <FileText className={`h-6 w-6 ${selectedCategory === 'documents' ? 'text-white' : 'text-green-600'}`} />
          </div>
          <span className="text-xs font-medium">Documents</span>
        </div>
        
        <div 
          className="flex-shrink-0 flex flex-col items-center cursor-pointer"
          onClick={() => setSelectedCategory('apps')}
        >
          <div className={`h-14 w-14 rounded-full ${selectedCategory === 'apps' ? 'bg-yellow-600' : 'bg-yellow-100'} flex items-center justify-center mb-1`}>
            <Package className={`h-6 w-6 ${selectedCategory === 'apps' ? 'text-white' : 'text-yellow-600'}`} />
          </div>
          <span className="text-xs font-medium">Apps</span>
        </div>
      </div>

      {/* File List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-3 border-b border-gray-100 flex justify-between items-center">
          <span className="text-sm font-medium">Recent Files</span>
          <button className="text-primary text-xs font-medium">Select</button>
        </div>
        
        {isLoading ? (
          // Loading skeleton
          Array(4).fill(0).map((_, index) => (
            <div key={index} className="p-4 border-b border-gray-100 flex items-center">
              <Skeleton className="h-10 w-10 rounded-lg mr-3" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : filteredFiles && filteredFiles.length > 0 ? (
          // File list
          filteredFiles.map(file => (
            <FileItem 
              key={file.id} 
              file={file} 
              icon={getFileIcon(file)} 
            />
          ))
        ) : (
          // Empty state
          <div className="p-6 text-center">
            <FolderIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No files found</p>
            {selectedCategory && (
              <p className="text-xs text-muted-foreground mt-1">
                Try selecting a different category or uploading new files
              </p>
            )}
          </div>
        )}
      </div>

      {/* Folders */}
      <h2 className="font-medium mb-3">My Folders</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {Object.entries(folderStats).map(([category, stats]) => (
          <FolderItem
            key={category}
            title={category.charAt(0).toUpperCase() + category.slice(1)}
            fileCount={stats.count}
            usedSpace={stats.size}
            icon={getFileIcon({ category } as File)}
            category={category}
          />
        ))}
        
        {/* Show empty folder items if we don't have all categories */}
        {!folderStats.photos && (
          <FolderItem
            title="Photos"
            fileCount={0}
            usedSpace={0}
            icon={<Image className="h-5 w-5 text-purple-600" />}
            category="photos"
          />
        )}
        
        {!folderStats.videos && (
          <FolderItem
            title="Videos"
            fileCount={0}
            usedSpace={0}
            icon={<Video className="h-5 w-5 text-red-600" />}
            category="videos"
          />
        )}
        
        {!folderStats.documents && (
          <FolderItem
            title="Documents"
            fileCount={0}
            usedSpace={0}
            icon={<FileText className="h-5 w-5 text-green-600" />}
            category="documents"
          />
        )}
        
        {!folderStats.apps && (
          <FolderItem
            title="Apps"
            fileCount={0}
            usedSpace={0}
            icon={<Package className="h-5 w-5 text-yellow-600" />}
            category="apps"
          />
        )}
      </div>
    </div>
  );
}
