import { useLocation, Link } from "wouter";
import { ReactNode } from "react";
import StatusBar from "./StatusBar";
import { Home, FolderOpen, Upload, User } from "lucide-react";

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
            <a className={`flex flex-col items-center justify-center w-full h-full ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
              <Home className="h-6 w-6" />
              <span className="text-xs mt-1">Home</span>
            </a>
          </Link>
          
          <Link href="/files">
            <a className={`flex flex-col items-center justify-center w-full h-full ${location === '/files' ? 'text-primary' : 'text-muted-foreground'}`}>
              <FolderOpen className="h-6 w-6" />
              <span className="text-xs mt-1">Files</span>
            </a>
          </Link>
          
          <Link href="/backup">
            <a className={`flex flex-col items-center justify-center w-full h-full ${location === '/backup' ? 'text-primary' : 'text-muted-foreground'}`}>
              <Upload className="h-6 w-6" />
              <span className="text-xs mt-1">Backup</span>
            </a>
          </Link>
          
          <Link href="/profile">
            <a className={`flex flex-col items-center justify-center w-full h-full ${location === '/profile' ? 'text-primary' : 'text-muted-foreground'}`}>
              <User className="h-6 w-6" />
              <span className="text-xs mt-1">Profile</span>
            </a>
          </Link>
        </nav>
      </div>
    </div>
  );
}
