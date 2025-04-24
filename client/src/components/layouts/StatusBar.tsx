import { Battery, Signal, Wifi } from "lucide-react";
import { useState, useEffect } from "react";

export default function StatusBar() {
  const [time, setTime] = useState("");
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }));
    };
    
    updateTime();
    const timer = setInterval(updateTime, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="bg-primary text-white px-4 py-1.5 text-xs flex justify-between items-center">
      <div>{time}</div>
      <div className="flex items-center space-x-1">
        <Signal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <Battery className="h-3 w-3" />
        <div className="ml-1 font-semibold">78%</div>
      </div>
    </div>
  );
}
