import type { JSONWebKeySet } from "jose"; // Use type import
import { TokenJwksResolver } from "./TokenJwksResolver";
import { CodeBlock } from "@/components/ui/code-block";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, ShieldCheck, Info, AlertCircle } from "lucide-react";

interface TokenSignatureProps {
  token: string; // The raw token string
  header: any; // Decoded header object
  signatureError?: string; // Error message from validation attempt
  signatureValid?: boolean; // Result of validation attempt
  jwks: JSONWebKeySet | null; // The currently loaded JWKS state from parent
  issuerUrl: string; // The current issuer URL state from parent
  setIssuerUrl: (url: string) => void; // Callback to update issuer URL in parent
  onJwksResolved: (jwks: JSONWebKeySet) => void; // Callback when JWKS are loaded/resolved
  isCurrentTokenDemo?: boolean; // Flag indicating if the token being inspected is a demo one
  oidcConfig?: any; // OIDC configuration from parent
  isLoadingOidcConfig?: boolean; // OIDC config loading state
}

export function TokenSignature({
  token,
  header,
  signatureError,
  signatureValid,
  jwks,
  issuerUrl,
  setIssuerUrl,
  onJwksResolved,
  isCurrentTokenDemo, // Use the flag passed from the parent
  oidcConfig,
  isLoadingOidcConfig
}: TokenSignatureProps) {
  const parts = token.split('.');
  // Extract the signature part for display (can be empty if token is malformed)
  const signaturePart = parts.length === 3 ? parts[2] : '';

  // Find if a key matching the token's kid exists in the currently loaded JWKS
  const matchingKey = jwks?.keys.find(key => key.kid === header?.kid);

  return (
    <div className="space-y-4">
      {/* Signature Status Alert */}
      {signatureValid !== undefined && ( // Only show if validation has been attempted (valid could be true or false)
        <Alert
          variant={signatureValid ? "default" : "destructive"}
          className={signatureValid
            ? "bg-green-500/10 border-green-500/20 text-green-700"
            : "bg-red-500/10 border-red-500/20 text-destructive"
          }
        >
          {signatureValid ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <ShieldAlert className="h-4 w-4" />
          )}
          <AlertTitle>{signatureValid ? "Signature Valid" : "Signature Invalid / Not Verified"}</AlertTitle>
          <AlertDescription>
            {signatureValid
              ? "The token signature has been successfully verified against the loaded JWKS."
              : signatureError || "The token signature could not be verified. Ensure the correct JWKS are loaded."}
          </AlertDescription>
        </Alert>
      )}
      {signatureValid === undefined && !jwks && ( // Show info if validation hasn't run because JWKS aren't loaded
        <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-700">
          <Info className="h-4 w-4" />
          <AlertTitle>JWKS Needed for Validation</AlertTitle>
          <AlertDescription>
            Load the JSON Web Key Set (JWKS) using the options below to verify the token's signature.
          </AlertDescription>
        </Alert>
      )}


      {/* JWKS Configuration Component */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="px-4 py-3 border-b">
          <h3 className="text-md font-medium leading-none tracking-tight">JWKS Configuration</h3>
          <p className="text-xs text-muted-foreground mt-1">Load the public keys needed to verify the signature.</p>
        </div>
        <div className="p-4">
          <TokenJwksResolver
            issuerUrl={issuerUrl}
            setIssuerUrl={setIssuerUrl}
            onJwksResolved={onJwksResolved}
            // Pass down the flag indicating if the current token is a demo token
            isCurrentTokenDemo={isCurrentTokenDemo}
            oidcConfig={oidcConfig}
            isLoadingOidcConfig={isLoadingOidcConfig}
          />
        </div>
      </div>

      {/* Signature Algorithm and Key ID */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="px-4 py-3 border-b">
          <h3 className="text-md font-medium leading-none tracking-tight">Signature Details</h3>
        </div>
        <div className="p-4 space-y-3 divide-y divide-border">
          <div className="pt-3 first:pt-0">
            <h4 className="text-sm font-medium mb-1">Algorithm (alg):</h4>
            <p className="text-sm font-mono">
              {header?.alg || <span className="italic text-muted-foreground">Not specified</span>}
            </p>
          </div>

          <div className="pt-3 first:pt-0">
            <h4 className="text-sm font-medium mb-1">Key ID (kid):</h4>
            <p className="text-sm font-mono break-all">
              {header?.kid || <span className="italic text-muted-foreground">Not specified</span>}
            </p>
            {!header?.kid && (
              <p className="text-xs text-muted-foreground mt-1">The 'kid' helps identify the correct key in the JWKS.</p>
            )}
          </div>

          <div className="pt-3 first:pt-0">
            <h4 className="text-sm font-medium mb-1">Raw Signature:</h4>
            {signaturePart ? (
              <CodeBlock code={signaturePart} language="text" className="p-2 text-xs max-h-24 overflow-auto" />
            ) : (
              <p className="text-sm italic text-muted-foreground">No signature part found in token.</p>
            )}
          </div>
        </div>
      </div>

      {/* Display Info about Loaded JWKS */}
      {jwks && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="px-4 py-3 border-b">
            <h3 className="text-md font-medium leading-none tracking-tight">Loaded JWKS Information</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-1">Total Keys in Loaded JWKS:</h4>
              <p className="text-sm">
                {jwks.keys.length} {jwks.keys.length === 1 ? 'key' : 'keys'} found.
              </p>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-1">Status for Token's Key ID ({header?.kid || 'N/A'}):</h4>
              {header?.kid ? (
                matchingKey ? (
                  <Alert className="bg-green-500/10 border-green-500/20 text-green-700">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      A key with matching ID "{header.kid}" was found in the loaded JWKS.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No key with matching ID "{header.kid}" found in the loaded JWKS. Signature validation will fail.
                    </AlertDescription>
                  </Alert>
                )
              ) : (
                <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Token header does not contain a Key ID (kid). Validation might require manual key selection if multiple keys exist in JWKS.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}