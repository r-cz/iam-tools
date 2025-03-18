
import { JSONWebKeySet } from "jose";

interface TokenSignatureProps {
  token: string;
  header: any;
  signatureValid: boolean;
  signatureError?: string;
  jwks: JSONWebKeySet | null;
}

export function TokenSignature({ 
  token, 
  header, 
  signatureValid, 
  signatureError, 
  jwks 
}: TokenSignatureProps) {
  const parts = token.split('.');
  // Extract the signature part for display
  const signaturePart = parts.length === 3 ? parts[2] : '';
  
  const matchingKey = jwks?.keys.find(key => key.kid === header.kid);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <span className={`ml-2 inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold ${signatureValid ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
          {signatureValid 
            ? 'Signature Valid' 
            : jwks 
              ? 'Signature Invalid' 
              : 'Signature Not Verified'
          }
        </span>
      </div>
      
      {signatureError && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md">
          {signatureError}
        </div>
      )}
      
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="pb-2 p-4 border-b">
          <h3 className="text-md font-medium leading-none tracking-tight">Signature Information</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1">Algorithm:</h4>
            <p className="text-sm font-mono">
              {header.alg || 'Not specified'}
            </p>
          </div>
          
          <hr className="h-px my-4 bg-border" />
          
          <div>
            <h4 className="text-sm font-medium mb-1">Key ID (kid):</h4>
            <p className="text-sm font-mono">
              {header.kid || 'Not specified'}
            </p>
          </div>
          
          <hr className="h-px my-4 bg-border" />
          
          <div>
            <h4 className="text-sm font-medium mb-1">Raw Signature:</h4>
            <pre className="p-2 block overflow-x-auto text-xs bg-muted rounded-md font-mono">
              {signaturePart}
            </pre>
          </div>
        </div>
      </div>
      
      {jwks && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="pb-2 p-4 border-b">
            <h3 className="text-md font-medium leading-none tracking-tight">JWKS Information</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-1">Total Keys in JWKS:</h4>
              <p className="text-sm">
                {jwks.keys.length} {jwks.keys.length === 1 ? 'key' : 'keys'}
              </p>
            </div>
            
            <hr className="h-px my-4 bg-border" />
            
            {matchingKey ? (
              <div>
                <h4 className="text-sm font-medium mb-1">Matching Key Found:</h4>
                <pre className="p-2 block overflow-x-auto text-xs bg-muted rounded-md font-mono">
                  {JSON.stringify(matchingKey, null, 2)}
                </pre>
              </div>
            ) : header.kid ? (
              <div className="bg-amber-500/10 text-amber-700 p-3 rounded-md">
                No key with matching key ID "{header.kid}" found in the JWKS.
                This could indicate a key rotation issue or an incorrect JWKS.
              </div>
            ) : (
              <div className="bg-amber-500/10 text-amber-700 p-3 rounded-md">
                Token header does not contain a key ID (kid),
                making it difficult to identify the correct key for validation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
