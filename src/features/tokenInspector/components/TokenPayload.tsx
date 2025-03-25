import { useState } from "react";
import { ValidationResult, TokenType } from "../utils/types";
import { getClaimDescription } from "../data/claim-descriptions";
import { getProviderSpecificClaimInfo } from "../data/provider-claims";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface TokenPayloadProps {
  payload: any;
  tokenType: TokenType;
  validationResults: ValidationResult[];
}

export function TokenPayload({ 
  payload, 
  tokenType,
  validationResults 
}: TokenPayloadProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Claims to show first based on token type
  const standardClaims = tokenType === "id_token" ? [
    "iss", "sub", "aud", "exp", "iat", "auth_time", "nonce",
    "acr", "amr", "azp", "at_hash", "c_hash"
  ] : [
    "iss", "sub", "aud", "exp", "iat", "client_id", "jti", 
    "scope", "scp", "roles", "groups", "entitlements"
  ];
  
  // Keep track of validation results
  validationResults.map(result => result.claim);

  // Categorize claims
  const commonClaims = Object.keys(payload).filter(key => 
    standardClaims.includes(key)
  );
  
  const otherClaims = Object.keys(payload).filter(key => 
    !standardClaims.includes(key)
  );

  // Format display value for different claim types
  const formatClaimValue = (key: string, value: any) => {
    // Format timestamps as human-readable dates
    if (["exp", "iat", "auth_time", "nbf"].includes(key) && 
        typeof value === "number") {
      return (
        <div>
          <span className="font-mono">{value}</span>
          <span className="ml-2 text-muted-foreground">
            ({new Date(value * 1000).toLocaleString()})
          </span>
        </div>
      );
    }
    
    // Handle arrays and objects
    if (typeof value === "object" && value !== null) {
      return (
        <CodeBlock code={JSON.stringify(value, null, 2)} language="json" className="p-1" />
      );
    }
    
    // Default string/number display
    return <span className="font-mono">{String(value)}</span>;
  };

  // Get status badge for validation result
  const getValidationBadge = (key: string) => {
    const results = validationResults.filter(result => result.claim === key);
    
    if (results.length === 0) return null;
    
    if (results.some(r => r.severity === 'error' && !r.valid)) {
      return <Badge variant="destructive" className="ml-2">Error</Badge>;
    }
    
    if (results.some(r => r.severity === 'warning' && !r.valid)) {
      return <Badge variant="outline" className="ml-2 bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">Warning</Badge>;
    }
    
    if (results.every(r => r.valid)) {
      return <Badge variant="outline" className="ml-2 bg-green-500/20 text-green-700 hover:bg-green-500/20">Valid</Badge>;
    }
    
    return null;
  };

  // Render a single claim
  const renderClaim = (key: string, value: any) => {
    const relevantResults = validationResults.filter(
      result => result.claim === key
    );
    
    const claimDescription = getClaimDescription(key);
    const providerSpecificInfo = getProviderSpecificClaimInfo(key);
    
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
            <div className="text-sm">
              {formatClaimValue(key, value)}
            </div>
          </div>
          
          {/* Validation results */}
          {relevantResults.length > 0 && (
            <div className="space-y-2">
              {relevantResults.map((result, index) => {
                // Determine the appropriate variant based on the severity
                const variant = result.severity === 'error' ? 'destructive' : 'default';
                const className = result.severity === 'warning' 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-700' 
                  : result.severity === 'info' 
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-700'
                    : result.severity === 'error'
                      ? 'bg-red-500/10 border-red-500/20 text-destructive'
                      : '';
                
                return (
                  <Alert key={index} variant={variant} className={className}>
                    <AlertTitle>{result.message}</AlertTitle>
                    {result.details && (
                      <AlertDescription>{result.details}</AlertDescription>
                    )}
                  </Alert>
                );
              })}
            </div>
          )}
          
          {/* Claim description and info */}
          <div className="text-xs text-muted-foreground space-y-1">
            {claimDescription && (
              <>
                <p>{claimDescription.description}</p>
                <p className="opacity-80">
                  {claimDescription.specification} 
                  {claimDescription.required && tokenType === "id_token" && 
                    " (Required for ID tokens)"}
                  {claimDescription.required && tokenType === "access_token" && claimDescription.specification.includes("RFC9068") && 
                    " (Required for RFC9068 JWT access tokens)"}
                </p>
                {claimDescription.specification.includes("RFC9068") && tokenType === "access_token" && (
                  <p className="mt-1 text-xs text-blue-600">This claim is defined in the JWT Profile for OAuth 2.0 Access Tokens (RFC9068)</p>
                )}
              </>
            )}
            
            {providerSpecificInfo && (
              <Alert className="mt-2 bg-blue-500/10 border-blue-500/20 text-blue-700">
                <AlertTitle>Provider-specific</AlertTitle>
                <AlertDescription>{providerSpecificInfo.provider} - {providerSpecificInfo.description}</AlertDescription>
              </Alert>
            )}
            
            {/* Additional helpful info for specific claims */}
            {key === "aud" && Array.isArray(value) && value.length > 1 && (
              <Alert className="mt-2 bg-amber-500/10 border-amber-500/20 text-amber-700">
                <AlertTitle>Multiple audiences detected</AlertTitle>
                <AlertDescription>The "azp" claim should be present when there are multiple audiences.</AlertDescription>
              </Alert>
            )}
            
            {key === "scope" && typeof value === "string" && (
              <div className="mt-1">
                <p>Scopes:</p>
                {value.trim() === "" ? (
                  <Alert className="mt-2 bg-amber-500/10 border-amber-500/20 text-amber-700">
                    <AlertTitle>Empty scope value</AlertTitle>
                    <AlertDescription>This token has no defined permissions.</AlertDescription>
                  </Alert>
                ) : (
                  <ul className="list-disc list-inside">
                    {value.split(" ").map((scope, i) => (
                      <li key={i}>{scope}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-4">
          <CodeBlock code={JSON.stringify(payload, null, 2)} language="json" />
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-md font-medium">{tokenType === "id_token" ? "Common OIDC Claims" : "Common OAuth/JWT Claims"}</h3>
        
        <div className="grid grid-cols-1 gap-3">
          {commonClaims.map(key => renderClaim(key, payload[key]))}
        </div>
      </div>
      
      {otherClaims.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium">Additional Claims</h3>
            <Button 
              onClick={() => setShowAll(!showAll)}
              variant="ghost"
              size="sm"
            >
              {showAll ? 'Show Less' : `Show All (${otherClaims.length})`}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {(showAll ? otherClaims : otherClaims.slice(0, 3)).map(key => 
              renderClaim(key, payload[key])
            )}
          </div>
        </div>
      )}
    </div>
  );
}
