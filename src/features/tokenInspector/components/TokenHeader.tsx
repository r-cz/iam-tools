
import { ValidationResult } from "../utils/types";
import { CodeBlock } from "@/components/ui/code-block";

interface TokenHeaderProps {
  header: any;
  validationResults: ValidationResult[];
}

export function TokenHeader({ header, validationResults }: TokenHeaderProps) {
  // Get validation badge for a claim
  const getValidationBadge = (key: string) => {
    const results = validationResults.filter(
      result => result.claim === `header.${key}` || result.claim === key
    );
    
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

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-4">
          <CodeBlock code={JSON.stringify(header, null, 2)} language="json" />
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-md font-medium">Header Claims</h3>
        
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(header).map(([key, value]) => {
            const relevantResults = validationResults.filter(
              result => result.claim === `header.${key}` || result.claim === key
            );
            
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
                    <div className="text-sm text-muted-foreground">
                      {typeof value === 'string' && value}
                      {typeof value !== 'string' && JSON.stringify(value)}
                    </div>
                  </div>
                  
                  {relevantResults.length > 0 && (
                    <div className="space-y-2">
                      {relevantResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-md text-sm ${
                            result.severity === 'error' 
                              ? 'bg-destructive/10 text-destructive' 
                              : result.severity === 'warning'
                                ? 'bg-amber-500/10 text-amber-700'
                                : 'bg-blue-500/10 text-blue-700'
                          }`}
                        >
                          {result.message}
                          {result.details && (
                            <p className="mt-1 text-xs opacity-80">{result.details}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Common header field explanations */}
                  {key === 'alg' && (
                    <div className="text-xs text-muted-foreground">
                      The algorithm used to sign the token
                    </div>
                  )}
                  {key === 'typ' && (
                    <div className="text-xs text-muted-foreground">
                      Token type (usually "JWT")
                    </div>
                  )}
                  {key === 'kid' && (
                    <div className="text-xs text-muted-foreground">
                      Key ID used to identify which key to use for validation
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
