// ProviderInfo component imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Removed unused Badge import
import { InfoIcon, ExternalLink } from 'lucide-react' // Removed unused StarIcon import
import { providerInfoData } from '../data/provider-info'
// import { OidcConfiguration } from '../utils/types'; // Removed unused import

interface ProviderInfoProps {
  providerName: string | null
  issuerUrl: string
  // config: OidcConfiguration | null; // Remove unused config prop
  reasons: string[] // Add reasons prop
}

export function ProviderInfo({
  providerName,
  issuerUrl,
  /* config, */ reasons,
}: ProviderInfoProps) {
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
                ? 'Could not identify the provider from the issuer URL.'
                : 'Enter an issuer URL to see provider information.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const providerInfo = providerInfoData[providerName]

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
            <h3 className="text-xl font-bold mb-1">{providerInfo.name}</h3>
            <p className="text-muted-foreground">{providerInfo.description}</p>
          </div>

          {/* Add explanation for provider identification */}
          <div className="text-sm text-muted-foreground italic">
            <p>
              This provider was identified based on analysis of the OIDC configuration fetched from{' '}
              <code className="bg-muted px-1 rounded">{issuerUrl}</code>. The identification logic
              checks for provider-specific markers in the configuration data and known patterns in
              the issuer URL.
            </p>
          </div>

          {/* Display identification reasons */}
          {reasons && reasons.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium mb-1">Identification Logic:</h4>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                {reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
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
  )
}
