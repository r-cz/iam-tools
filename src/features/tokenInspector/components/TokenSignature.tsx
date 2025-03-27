
import { JSONWebKeySet } from "jose";
import { TokenJwksResolver } from "./TokenJwksResolver";
import { CodeBlock } from "@/components/ui/code-block";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, ShieldCheck } from "lucide-react";

interface TokenSignatureProps {
  token: string;
  header: any;
  payload: any;
  signatureError?: string;
  jwks: JSONWebKeySet | null;
  issuerUrl: string;
  setIssuerUrl: (url: string) => void;
  onJwksResolved: (jwks: JSONWebKeySet) => void;
  signatureValid?: boolean;
}

export function TokenSignature({ 
  token, 
  header, 
  payload,
  signatureError, 
  jwks,
  issuerUrl,
  setIssuerUrl,
  onJwksResolved,
  signatureValid
}: TokenSignatureProps) {
  const parts = token.split('.');
  // Extract the signature part for display
  const signaturePart = parts.length === 3 ? parts[2] : '';
  
  const matchingKey = jwks?.keys.find(key => key.kid === header.kid);
  
  // Check if this is a demo token
  const isDemoToken = payload && payload.iss && 
    (payload.iss.includes(window.location.host) || payload.is_demo_token);
  
  return (
    <div className="space-y-4">
      {/* Signature Status */}
      {signatureValid !== undefined && (
        <Alert 
          variant={signatureValid ? "default" : "destructive"} 
          className={signatureValid 
            ? "bg-green-500/10 border-green-500/20 text-green-700" 
            : "bg-red-500/10 border-red-500/20 text-destructive"
          }
        >
          {signatureValid ? (
            <>
              <ShieldCheck className="h-4 w-4 mr-1" />
              <AlertTitle>Signature Valid</AlertTitle>
              <AlertDescription>
                The token signature has been successfully verified with the provided JWKS.
              </AlertDescription>
            </>
          ) : (
            <>
              <ShieldAlert className="h-4 w-4 mr-1" />
              <AlertTitle>Signature Not Verified</AlertTitle>
              <AlertDescription>
                {signatureError || "The token signature could not be verified. Fetch the JWKS from the issuer or provide it manually."}
              </AlertDescription>
            </>
          )}
        </Alert>
      )}
      
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
            isDemoToken={isDemoToken}
          />
        </div>
      </div>
      
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
