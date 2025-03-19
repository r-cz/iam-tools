import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface JwksResolverProps {
  issuerUrl: string;
  setIssuerUrl: (url: string) => void;
  onJwksResolved: (jwks: any) => void;
}

export function JwksResolver({ 
  issuerUrl, 
  setIssuerUrl, 
  onJwksResolved 
}: JwksResolverProps) {
  const [jwksMode, setJwksMode] = useState<"automatic" | "manual">("automatic");
  const [manualJwks, setManualJwks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; isCors?: boolean } | null>(null);
  
  const fetchJwks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Normalize issuer URL
      const normalizedIssuerUrl = issuerUrl.endsWith("/") 
        ? issuerUrl 
        : `${issuerUrl}/`;
        
      // First, try to fetch the OpenID Configuration
      const configUrl = `${normalizedIssuerUrl}.well-known/openid-configuration`;
      console.log(`Fetching OpenID configuration from: ${configUrl}`);
      
      const configResponse = await fetch(configUrl);
      if (!configResponse.ok) {
        throw new Error(`Failed to fetch OpenID configuration: ${configResponse.status} ${configResponse.statusText}`);
      }
      
      const config = await configResponse.json();
      
      if (!config.jwks_uri) {
        throw new Error("No JWKS URI found in OpenID configuration");
      }
      
      // Then, fetch the JWKS using the jwks_uri
      console.log(`Fetching JWKS from: ${config.jwks_uri}`);
      const jwksResponse = await fetch(config.jwks_uri);
      
      if (!jwksResponse.ok) {
        throw new Error(`Failed to fetch JWKS: ${jwksResponse.status} ${jwksResponse.statusText}`);
      }
      
      const jwks = await jwksResponse.json();
      
      if (!jwks.keys || !Array.isArray(jwks.keys)) {
        throw new Error("Invalid JWKS format: missing 'keys' array");
      }
      
      onJwksResolved(jwks);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching JWKS:", err);
      
      // Check if it's likely a CORS error
      const errorMessage = err.message || "Unknown error";
      const isCorsError = errorMessage.includes("CORS") || 
                         err.name === 'TypeError' && errorMessage.includes('Failed to fetch');
      
      setError({
        message: isCorsError 
          ? 'CORS error: The server does not allow direct browser access.' 
          : `Error fetching JWKS: ${errorMessage}`,
        isCors: isCorsError
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleManualJwksSubmit = () => {
    try {
      // Trim whitespace to prevent JSON parse errors
      const trimmedJwks = manualJwks.trim();
      const parsedJwks = JSON.parse(trimmedJwks);
      
      if (!parsedJwks.keys || !Array.isArray(parsedJwks.keys)) {
        throw new Error("Invalid JWKS format: missing 'keys' array");
      }
      
      // Validate that all keys have mandatory JWK properties
      for (const key of parsedJwks.keys) {
        if (!key.kty) {
          throw new Error("Invalid key in JWKS: missing 'kty' property");
        }
      }
      
      console.log('Manual JWKS parsed successfully:', {
        keyCount: parsedJwks.keys.length,
        keyIds: parsedJwks.keys.map((k: {kid?: string}) => k.kid)
      });
      
      // Directly pass the parsed JWKS to the callback
      // No setTimeout - we want immediate verification
      onJwksResolved(parsedJwks);
      setError(null);
    } catch (err: any) {
      console.error('Error parsing manual JWKS:', err);
      setError({
        message: `Invalid JWKS JSON: ${err.message}`,
        isCors: false
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={jwksMode} onValueChange={(value) => setJwksMode(value as "automatic" | "manual")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="automatic">Automatic</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
        </TabsList>
        
        <TabsContent value="automatic" className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="issuer-url" className="block text-sm font-medium pb-2">Issuer URL:</label>
            <input
              id="issuer-url"
              type="text"
              value={issuerUrl}
              onChange={(e) => setIssuerUrl(e.target.value)}
              placeholder="https://example.com/identity"
              className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button 
              onClick={fetchJwks}
              disabled={isLoading || !issuerUrl}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Fetching...' : 'Fetch JWKS'}
            </Button>
          </div>
          
          {error && (
            <div className="relative w-full rounded-lg border p-4 bg-amber-500/10 text-amber-700">
              <p className="font-medium break-words">{error.message}</p>
              {error.isCors && (
                <div className="mt-2">
                  <p className="text-sm">Try fetching the JWKS manually with:</p>
                  <pre className="bg-muted text-xs mt-1 p-2 rounded-md overflow-x-auto">
                    curl {issuerUrl.endsWith('/') 
                      ? `${issuerUrl}.well-known/jwks.json` 
                      : `${issuerUrl}/.well-known/jwks.json`}
                  </pre>
                  <p className="text-sm mt-2">Then use the "Manual Entry" option to paste the result.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="manual" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2">
              <label htmlFor="manual-jwks" className="block text-sm font-medium">Paste JWKS JSON:</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-medium cursor-help" aria-label="JWKS format info">?</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p>JWKS should be a JSON object with a "keys" array containing JWK objects.</p>
                      <p className="mt-2 text-xs">Example format:</p>
                      <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto text-xs">
{`{
  "keys": [
    {
      "kty": "RSA",
      "kid": "KEY_ID",
      "use": "sig",
      "n": "BASE64_MODULUS",
      "e": "BASE64_EXPONENT"
    }
  ]
}`}
                      </pre>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <textarea
              id="manual-jwks"
              value={manualJwks}
              onChange={(e) => setManualJwks(e.target.value)}
              placeholder='{"keys":[{"kty":"RSA","kid":"...",...}]}'
              className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
            <Button 
              onClick={handleManualJwksSubmit}
              disabled={!manualJwks}
              className="w-full sm:w-auto"
            >
              Use This JWKS
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
