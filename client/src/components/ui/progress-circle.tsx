import { cn } from "@/lib/utils";

interface ProgressCircleProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  bgClassName?: string;
  valueClassName?: string;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
}

export function ProgressCircle({
  value,
  size = 36,
  strokeWidth = 3,
  className,
  bgClassName = "stroke-muted",
  valueClassName = "stroke-primary",
  showValue = false,
  valuePrefix = "",
  valueSuffix = "%",
}: ProgressCircleProps) {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;
  
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg
        className="rotate-[-90deg]"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className={bgClassName}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn(
            valueClassName,
            "transition-all duration-500 ease-in-out"
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showValue && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
          {valuePrefix}{normalizedValue}{valueSuffix}
        </span>
      )}
    </div>
  );
}
