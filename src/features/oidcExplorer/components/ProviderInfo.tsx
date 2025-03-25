// ProviderInfo component imports
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, ExternalLink, StarIcon } from 'lucide-react';
import { providerInfoData } from '../data/provider-info';

interface ProviderInfoProps {
  providerName: string | null;
  issuerUrl: string;
}

export function ProviderInfo({ providerName, issuerUrl }: ProviderInfoProps) {
  if (!providerName || !providerInfoData[providerName]) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="h-5 w-5" />
            Provider Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              {issuerUrl 
                ? "Could not identify the provider from the issuer URL." 
                : "Enter an issuer URL to see provider information."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const providerInfo = providerInfoData[providerName];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <InfoIcon className="h-5 w-5" />
          Provider Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold mb-1">
              {providerInfo.name}
            </h3>
            <p className="text-muted-foreground">
              {providerInfo.description}
            </p>
          </div>

          {providerInfo.specialFeatures && providerInfo.specialFeatures.length > 0 && (
            <div>
              <h4 className="font-medium flex items-center gap-1 mb-2">
                <StarIcon className="h-4 w-4 text-yellow-500" />
                Special Features
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {providerInfo.specialFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5">
                      {feature}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <a
              href={providerInfo.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Documentation
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
