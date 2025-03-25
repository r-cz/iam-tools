import { useState } from "react";
import { ValidationResult, TokenType } from "../utils/types";
import { getClaimDescription } from "../data/claim-descriptions";
import { getProviderSpecificClaimInfo } from "../data/provider-claims";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";

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
      return <span className="ml-2 inline-flex items-center rounded-full border border-transparent bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">Error</span>;
    }
    
    if (results.some(r => r.severity === 'warning' && !r.valid)) {
      return <span className="ml-2 inline-flex items-center rounded-full border border-transparent bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">Warning</span>;
    }
    
    if (results.every(r => r.valid)) {
      return <span className="ml-2 inline-flex items-center rounded-full border border-transparent bg-green-500 px-2.5 py-0.5 text-xs font-semibold text-white">Valid</span>;
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
              {relevantResults.map((result, index) => (
                <div key={index} className={`p-2 rounded-md text-sm ${result.severity === 'error' ? 'bg-destructive/10 text-destructive' : result.severity === 'warning' ? 'bg-amber-500/10 text-amber-700' : 'bg-blue-500/10 text-blue-700'}`}>
                  {result.message}
                  {result.details && (
                    <p className="mt-1 text-xs opacity-80">{result.details}</p>
                  )}
                </div>
              ))}
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
              <div className="bg-blue-500/10 text-blue-700 p-2 rounded-md text-sm">
                  Provider-specific: {providerSpecificInfo.provider} - {providerSpecificInfo.description}
              </div>
            )}
            
            {/* Additional helpful info for specific claims */}
            {key === "aud" && Array.isArray(value) && value.length > 1 && (
              <div className="bg-amber-500/10 text-amber-700 p-2 rounded-md text-sm">
                Multiple audiences detected. The "azp" claim should be present when there are multiple audiences.
              </div>
            )}
            
            {key === "scope" && typeof value === "string" && (
              <div className="mt-1">
                <p>Scopes:</p>
                {value.trim() === "" ? (
                  <div className="bg-amber-500/10 text-amber-700 p-2 rounded-md text-sm mt-1">
                    Empty scope value. This token has no defined permissions.
                  </div>
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
