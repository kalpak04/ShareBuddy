import { useLocation, Link } from "wouter";
import { ReactNode } from "react";
import StatusBar from "./StatusBar";
import { Home, FolderOpen, Upload, User, Store } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <StatusBar />
      
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
      
      <div className="bg-white border-t border-gray-200">
        <nav className="flex justify-around items-center h-16">
          <Link href="/">
            <div className={`flex flex-col items-center justify-center w-full h-full ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">Home</span>
            </div>
          </Link>
          
          <Link href="/files">
            <div className={`flex flex-col items-center justify-center w-full h-full ${location === '/files' ? 'text-primary' : 'text-muted-foreground'}`}>
              <FolderOpen className="h-5 w-5" />
              <span className="text-xs mt-1">Files</span>
            </div>
          </Link>
          
          <Link href="/backup">
            <div className={`flex flex-col items-center justify-center w-full h-full ${location === '/backup' ? 'text-primary' : 'text-muted-foreground'}`}>
              <Upload className="h-5 w-5" />
              <span className="text-xs mt-1">Backup</span>
            </div>
          </Link>
          
          <Link href="/marketplace">
            <div className={`flex flex-col items-center justify-center w-full h-full ${location === '/marketplace' ? 'text-primary' : 'text-muted-foreground'}`}>
              <Store className="h-5 w-5" />
              <span className="text-xs mt-1">Market</span>
            </div>
          </Link>
          
          <Link href="/profile">
            <div className={`flex flex-col items-center justify-center w-full h-full ${location === '/profile' ? 'text-primary' : 'text-muted-foreground'}`}>
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Profile</span>
            </div>
          </Link>
        </nav>
      </div>
    </div>
  );
}
