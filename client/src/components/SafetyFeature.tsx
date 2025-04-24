import { Check } from "lucide-react";

interface SafetyFeatureProps {
  title: string;
  description: string;
}

export default function SafetyFeature({ title, description }: SafetyFeatureProps) {
  return (
    <div className="flex items-start mb-3">
      <div className="bg-green-100 p-1.5 rounded-full mr-3">
        <Check className="h-4 w-4 text-green-600" />
      </div>
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
