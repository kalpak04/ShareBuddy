import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Settings, UserCircle, Lock, CreditCard, Settings2, HelpCircle, Mail, Book, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { formatSizeForDisplay } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/auth");
  };
  
  const handleProviderClick = () => {
    navigate("/provider-settings");
  };
  
  return (
    <div>
      <div className="bg-primary pt-4 pb-8 px-4 rounded-b-2xl">
        <div className="flex justify-end mb-4">
          <button className="text-white">
            <Settings className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-white shadow-md flex items-center justify-center mb-2">
            <span className="text-2xl font-semibold text-primary">
              {user?.fullName ? 
                `${user.fullName.split(' ')[0][0]}${user.fullName.split(' ')[1]?.[0] || ''}` : 
                user?.username?.substring(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
          <h1 className="text-lg font-semibold text-white">{user?.fullName || user?.username}</h1>
          <p className="text-white/80 text-sm">{user?.email}</p>
        </div>
      </div>

      <div className="p-4 -mt-5">
        {/* Account Type */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-medium">Account Type</h2>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-0">
              {user?.storageReserved ? 'Basic' : 'Free'}
            </Badge>
          </div>
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-0.5">
                Storage: {formatSizeForDisplay(user?.storageReserved || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Rate: ₹1/GB-month</p>
            </div>
            <Button size="sm">Upgrade</Button>
          </div>
        </div>

        {/* Storage Role */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
          <h2 className="font-medium mb-4">Your Storage Role</h2>
          
          {/* Renter Role */}
          <div className={`${user?.role === 'renter' || user?.role === 'both' ? 'bg-primary/10 border-l-4 border-primary' : 'bg-gray-100 border-l-4 border-gray-300'} p-3 rounded-lg mb-4`}>
            <div className="flex items-center mb-1">
              <CreditCard className={`h-5 w-5 ${user?.role === 'renter' || user?.role === 'both' ? 'text-primary' : 'text-muted-foreground'} mr-2`} />
              <h3 className={`text-sm font-medium ${user?.role === 'renter' || user?.role === 'both' ? 'text-primary' : ''}`}>Storage Renter</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {user?.role === 'renter' || user?.role === 'both' 
                ? `You're currently renting ${formatSizeForDisplay(user?.storageReserved || 0)} of P2P storage` 
                : 'Rent storage space from others in the network'}
            </p>
          </div>
          
          {/* Provider Role */}
          <div className={`${user?.role === 'provider' || user?.role === 'both' ? 'bg-secondary/10 border-l-4 border-secondary' : 'bg-gray-100 border-l-4 border-gray-300'} p-3 rounded-lg`}>
            <div className="flex items-center mb-1">
              <Settings2 className={`h-5 w-5 ${user?.role === 'provider' || user?.role === 'both' ? 'text-secondary' : 'text-muted-foreground'} mr-2`} />
              <h3 className={`text-sm font-medium ${user?.role === 'provider' || user?.role === 'both' ? 'text-secondary' : ''}`}>Storage Provider</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {user?.role === 'provider' || user?.role === 'both'
                ? `You're sharing ${formatSizeForDisplay(user?.storageShared || 0)} of your storage space`
                : 'Earn money by sharing your unused storage'}
            </p>
            {user?.role !== 'provider' && user?.role !== 'both' && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleProviderClick}
              >
                Become a Provider
              </Button>
            )}
          </div>
        </div>

        {/* Earnings (Will show when user is a provider) */}
        <div className={`bg-white rounded-xl shadow-sm p-4 mb-5 ${user?.role !== 'provider' && user?.role !== 'both' ? 'opacity-50' : ''}`}>
          <h2 className="font-medium mb-3">Earnings</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-xl font-semibold">₹{((user?.earnings || 0) / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-xl font-semibold">₹{((user?.earnings || 0) / 100).toFixed(2)}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            disabled={user?.role !== 'provider' && user?.role !== 'both'}
          >
            View Earnings Details
          </Button>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-5">
          <h2 className="font-medium p-4 border-b border-gray-100">Account Settings</h2>
          
          <div className="p-4 border-b border-gray-100 flex items-center">
            <UserCircle className="h-5 w-5 text-muted-foreground mr-3" />
            <span className="text-sm">Personal Information</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground ml-auto" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="p-4 border-b border-gray-100 flex items-center">
            <Lock className="h-5 w-5 text-muted-foreground mr-3" />
            <span className="text-sm">Security & Privacy</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground ml-auto" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="p-4 border-b border-gray-100 flex items-center">
            <CreditCard className="h-5 w-5 text-muted-foreground mr-3" />
            <span className="text-sm">Payment Methods</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground ml-auto" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="p-4 flex items-center">
            <Settings className="h-5 w-5 text-muted-foreground mr-3" />
            <span className="text-sm">App Settings</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground ml-auto" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-5">
          <h2 className="font-medium p-4 border-b border-gray-100">Help & Support</h2>
          
          <div className="p-4 border-b border-gray-100 flex items-center">
            <HelpCircle className="h-5 w-5 text-muted-foreground mr-3" />
            <span className="text-sm">FAQ</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground ml-auto" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="p-4 border-b border-gray-100 flex items-center">
            <Mail className="h-5 w-5 text-muted-foreground mr-3" />
            <span className="text-sm">Contact Support</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground ml-auto" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="p-4 flex items-center">
            <Book className="h-5 w-5 text-muted-foreground mr-3" />
            <span className="text-sm">How It Works</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground ml-auto" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Logout Button */}
        <Button 
          variant="outline" 
          className="bg-white text-destructive border border-destructive rounded-xl py-3 w-full font-medium mb-8"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Logging out..." : "Log Out"}
        </Button>
      </div>
    </div>
  );
}
