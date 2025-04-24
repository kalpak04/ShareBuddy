import { getCategoryColor } from "@/lib/utils";

interface FolderItemProps {
  title: string;
  fileCount: number;
  usedSpace: number; // in MB
  icon: React.ReactNode;
  category: string;
}

export default function FolderItem({ title, fileCount, usedSpace, icon, category }: FolderItemProps) {
  const usedSpaceFormatted = usedSpace >= 1024 
    ? `${(usedSpace / 1024).toFixed(1)} GB` 
    : `${usedSpace.toFixed(0)} MB`;
  
  const percentage = Math.min(Math.max(usedSpace / 10240 * 100, 1), 100); // Assuming max of 10GB per folder
  const colorName = getCategoryColor(category);
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center mb-2">
        <div className={`h-10 w-10 rounded-lg bg-${colorName}-100 flex items-center justify-center mr-3`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{fileCount} files</p>
        </div>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-${colorName}-500`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{usedSpaceFormatted} used</p>
    </div>
  );
}
