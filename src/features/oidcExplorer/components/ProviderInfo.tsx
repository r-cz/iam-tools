// ProviderInfo component imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Removed unused Badge import
import { InfoIcon, ExternalLink } from 'lucide-react'
import { providerInfoData } from '../data/provider-info'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia } from '@/components/ui/item'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

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
          <Empty className="border border-dashed border-border/60 bg-muted/20 p-8">
            <EmptyMedia variant="icon" className="bg-primary/10 text-primary">
              <InfoIcon className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle>No provider detected</EmptyTitle>
            <EmptyDescription>
              {issuerUrl
                ? 'We could not match this issuer to a known provider. Review the configuration details or try another URL.'
                : 'Enter an issuer URL to detect provider-specific insights and documentation links.'}
            </EmptyDescription>
          </Empty>
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
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Identification Logic</h4>
              <ItemGroup>
                {reasons.map((reason, index) => (
                  <Item key={index} className="border-none bg-muted/30">
                    <ItemMedia variant="icon" className="bg-primary/10 text-primary">
                      <InfoIcon className="h-4 w-4" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemDescription className="text-sm leading-snug text-muted-foreground">
                        {reason}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
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
