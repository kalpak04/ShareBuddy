import { cn } from "@/lib/utils";

interface StorageOptionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  colorScheme?: "primary" | "secondary";
}

export default function StorageOption({ 
  title, 
  description, 
  icon, 
  isActive = false,
  onClick,
  colorScheme = "primary"
}: StorageOptionProps) {
  const activeColor = colorScheme === "primary" ? "primary" : "secondary";
  const inactiveColor = colorScheme === "primary" ? "primary/10" : "secondary/10";
  
  return (
    <div 
      className={cn(
        "bg-white rounded-xl shadow-sm p-4 cursor-pointer",
        isActive && `border-2 border-${activeColor}`
      )}
      onClick={onClick}
    >
      <div className={`h-12 w-12 rounded-full bg-${isActive ? activeColor : inactiveColor} flex items-center justify-center mb-3 mx-auto`}>
        {icon}
      </div>
      <h3 className="text-center text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground text-center">{description}</p>
    </div>
  );
}
