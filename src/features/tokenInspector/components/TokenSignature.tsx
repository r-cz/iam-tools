
import { JSONWebKeySet } from "jose";
import { TokenJwksResolver } from "./TokenJwksResolver";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface TokenSignatureProps {
  token: string;
  header: any;
  signatureValid: boolean;
  signatureError?: string;
  jwks: JSONWebKeySet | null;
  issuerUrl: string;
  setIssuerUrl: (url: string) => void;
  onJwksResolved: (jwks: JSONWebKeySet) => void;
}

export function TokenSignature({ 
  token, 
  header, 
  signatureValid, 
  signatureError, 
  jwks,
  issuerUrl,
  setIssuerUrl,
  onJwksResolved
}: TokenSignatureProps) {
  const parts = token.split('.');
  // Extract the signature part for display
  const signaturePart = parts.length === 3 ? parts[2] : '';
  
  const matchingKey = jwks?.keys.find(key => key.kid === header.kid);
  
  return (
    <div className="space-y-4">
      {/* JWKS Configuration */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="px-4 py-3 border-b">
          <h3 className="text-md font-medium leading-none tracking-tight">JWKS Configuration</h3>
        </div>
        <div className="p-4">
          <TokenJwksResolver 
            issuerUrl={issuerUrl}
            setIssuerUrl={setIssuerUrl}
            onJwksResolved={onJwksResolved} 
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <Badge 
          variant={signatureValid ? "outline" : "outline"} 
          className={signatureValid 
            ? "bg-green-500/20 text-green-700 hover:bg-green-500/20" 
            : "bg-amber-500/20 text-amber-700 hover:bg-amber-500/20"
          }
        >
          {signatureValid 
            ? 'Signature Valid' 
            : jwks 
              ? 'Signature Invalid' 
              : 'Signature Not Verified'
          }
        </Badge>
      </div>
      
      {signatureError && (
        <Alert variant="destructive">
          <AlertTitle>Signature Verification Error</AlertTitle>
          <AlertDescription>{signatureError}</AlertDescription>
        </Alert>
      )}
      
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="px-4 py-3 border-b">
          <h3 className="text-md font-medium leading-none tracking-tight">Signature Information</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1">Algorithm:</h4>
            <p className="text-sm font-mono">
              {header.alg || 'Not specified'}
            </p>
          </div>
          
          <hr className="h-px my-3 bg-border" />
          
          <div>
            <h4 className="text-sm font-medium mb-1">Key ID (kid):</h4>
            <p className="text-sm font-mono">
              {header.kid || 'Not specified'}
            </p>
          </div>
          
          <hr className="h-px my-3 bg-border" />
          
          <div>
            <h4 className="text-sm font-medium mb-1">Raw Signature:</h4>
            <CodeBlock code={signaturePart} language="text" className="p-2 text-xs" />
          </div>
        </div>
      </div>
      
      {jwks && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="px-4 py-3 border-b">
            <h3 className="text-md font-medium leading-none tracking-tight">JWKS Information</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-1">Total Keys in JWKS:</h4>
              <p className="text-sm">
                {jwks.keys.length} {jwks.keys.length === 1 ? 'key' : 'keys'}
              </p>
            </div>
            
            <hr className="h-px my-3 bg-border" />
            
            {matchingKey ? (
              <div>
                <h4 className="text-sm font-medium mb-1">Matching Key Found:</h4>
                <CodeBlock code={JSON.stringify(matchingKey, null, 2)} language="json" className="p-2 text-xs" />
              </div>
            ) : header.kid ? (
              <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-700">
                <AlertTitle>No matching key found</AlertTitle>
                <AlertDescription>
                  No key with matching key ID "{header.kid}" found in the JWKS.
                  This could indicate a key rotation issue or an incorrect JWKS.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-700">
                <AlertTitle>Missing key ID</AlertTitle>
                <AlertDescription>
                  Token header does not contain a key ID (kid),
                  making it difficult to identify the correct key for validation.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
