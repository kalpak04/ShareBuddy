import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { ProgressCircle } from "./ui/progress-circle";
import { formatSizeForDisplay } from "@/lib/utils";

interface StorageStatusProps {
  usedStorage: number; // in MB
  totalStorage: number; // in MB
  showAlert?: boolean;
}

export default function StorageStatus({ usedStorage, totalStorage, showAlert = true }: StorageStatusProps) {
  const usedPercentage = totalStorage > 0 ? Math.round((usedStorage / totalStorage) * 100) : 0;
  const remainingStorage = totalStorage - usedStorage;
  const isLow = remainingStorage < 2048; // less than 2GB remaining
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-medium">Your Storage</h2>
        <span className="text-sm text-accent font-medium">
          {formatSizeForDisplay(usedStorage)} used
        </span>
      </div>
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full bg-gradient-to-r from-primary to-accent`}
          style={{ width: `${usedPercentage}%` }}
        ></div>
      </div>
      <div className="text-sm text-muted-foreground flex justify-between">
        <span>{formatSizeForDisplay(totalStorage)} Total</span>
        <span className={`font-medium ${isLow ? 'text-destructive' : 'text-muted-foreground'}`}>
          {formatSizeForDisplay(remainingStorage)} left
        </span>
      </div>

      {showAlert && isLow && (
        <Alert variant="destructive" className="mt-4 bg-red-50 border border-red-100">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle className="text-sm font-medium text-error">Storage almost full</AlertTitle>
          <AlertDescription className="text-xs text-text-secondary">
            Rent more space for only ₹1/GB-month
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
