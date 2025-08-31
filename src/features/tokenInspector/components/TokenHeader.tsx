import { ValidationResult } from '../utils/types'
import { getProviderSpecificClaimInfo } from '../data/provider-claims'
import { CodeBlock } from '@/components/ui/code-block'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { JsonDisplay } from '@/components/common'

interface TokenHeaderProps {
  header: any
  validationResults: ValidationResult[]
}

export function TokenHeader({ header, validationResults }: TokenHeaderProps) {
  // Get validation badge for a claim
  const getValidationBadge = (key: string) => {
    const results = validationResults.filter(
      (result) => result.claim === `header.${key}` || result.claim === key
    )

    if (results.length === 0) return null

    if (results.some((r) => r.severity === 'error' && !r.valid)) {
      return (
        <Badge variant="destructive" className="ml-2">
          Error
        </Badge>
      )
    }

    if (results.some((r) => r.severity === 'warning' && !r.valid)) {
      return (
        <Badge
          variant="outline"
          className="ml-2 bg-amber-500/20 text-amber-700 hover:bg-amber-500/20"
        >
          Warning
        </Badge>
      )
    }

    if (results.every((r) => r.valid)) {
      return (
        <Badge
          variant="outline"
          className="ml-2 bg-green-500/20 text-green-700 hover:bg-green-500/20"
        >
          Valid
        </Badge>
      )
    }

    return null
  }

  // Format display value for different claim types
  const formatClaimValue = (value: any) => {
    // Handle objects
    if (typeof value === 'object' && value !== null) {
      return <CodeBlock code={JSON.stringify(value, null, 2)} language="json" className="p-1" />
    }

    // Default string/number display
    return <span className="font-mono">{String(value)}</span>
  }

  return (
    <div className="space-y-4">
      <JsonDisplay data={header} containerClassName="relative" />

      <div className="space-y-3">
        <h3 className="text-md font-medium">Header Claims</h3>

        <div className="grid grid-cols-1 gap-3">
          {Object.entries(header).map(([key, value]) => {
            const relevantResults = validationResults.filter(
              (result) => result.claim === `header.${key}` || result.claim === key
            )

            return (
              <div
                key={key}
                className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <span className="font-mono text-sm font-medium">{key}</span>
                      {getValidationBadge(key)}
                    </div>
                    <div className="text-sm">{formatClaimValue(value)}</div>
                  </div>

                  {relevantResults.length > 0 && (
                    <div className="space-y-2">
                      {relevantResults.map((result, index) => {
                        const variant = result.severity === 'error' ? 'destructive' : 'default'
                        const className =
                          result.severity === 'warning'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-700'
                            : result.severity === 'info'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-700'
                              : result.severity === 'error'
                                ? 'bg-red-500/10 border-red-500/20 text-destructive'
                                : ''

                        return (
                          <Alert key={index} variant={variant} className={className}>
                            <AlertTitle>{result.message}</AlertTitle>
                            {result.details && (
                              <AlertDescription>{result.details}</AlertDescription>
                            )}
                          </Alert>
                        )
                      })}
                    </div>
                  )}

                  {/* Common header field explanations */}
                  {key === 'alg' && (
                    <div className="text-xs text-muted-foreground">
                      The algorithm used to sign the token
                    </div>
                  )}
                  {key === 'typ' && (
                    <div className="text-xs text-muted-foreground">Token type (usually "JWT")</div>
                  )}
                  {key === 'kid' && (
                    <div className="text-xs text-muted-foreground">
                      Key ID used to identify which key to use for validation
                    </div>
                  )}

                  {/* Provider-specific claim information */}
                  {getProviderSpecificClaimInfo(key) && (
                    <Alert className="mt-2 bg-blue-500/10 border-blue-500/20 text-blue-700">
                      <AlertTitle>Provider-specific</AlertTitle>
                      <AlertDescription>
                        {getProviderSpecificClaimInfo(key)?.provider} -{' '}
                        {getProviderSpecificClaimInfo(key)?.description}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
