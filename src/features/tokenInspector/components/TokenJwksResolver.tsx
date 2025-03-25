import React, { useState, useEffect } from "react";
import { proxyFetch } from "@/lib/proxy-fetch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CodeBlock } from "@/components/ui/code-block";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface TokenJwksResolverProps {
  issuerUrl: string;
  setIssuerUrl: (url: string) => void;
  onJwksResolved: (jwks: any) => void;
}

export function TokenJwksResolver({ 
  issuerUrl, 
  setIssuerUrl, 
  onJwksResolved 
}: TokenJwksResolverProps) {
  const [jwksMode, setJwksMode] = useState<"automatic" | "manual">("automatic");
  const [manualJwks, setManualJwks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; isCors?: boolean } | null>(null);
  // Removed isAutoPopulated state
  
  // Instead of trying to auto-fetch with every URL change,
  // we'll add a function that parent components can call to trigger a one-time fetch
  // This simplifies the logic and prevents unwanted fetches
  
  // Use a ref to store the previous URL to prevent unnecessary fetches
  const lastAutoFetchUrlRef = React.useRef<string>('');
  
  // This effect will run exactly ONCE when a token with an issuer is first loaded
  useEffect(() => {
    // Only do this once when the component mounts and there's an initial URL
    if (issuerUrl && issuerUrl !== lastAutoFetchUrlRef.current) {
      // Record this URL to prevent duplicate fetches
      lastAutoFetchUrlRef.current = issuerUrl;
      
      // Auto-fetch JWKS with a small delay to ensure UI is rendered
      const timer = setTimeout(() => {
        console.log('Initial auto-fetch for token issuer:', issuerUrl);
        fetchJwks();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  // We only want this to run ONCE on initial mount with a valid URL
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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
      
      const configResponse = await proxyFetch(configUrl);
      if (!configResponse.ok) {
        throw new Error(`Failed to fetch OpenID configuration: ${configResponse.status} ${configResponse.statusText}`);
      }
      
      const config = await configResponse.json();
      
      if (!config.jwks_uri) {
        throw new Error("No JWKS URI found in OpenID configuration");
      }
      
      // Then, fetch the JWKS using the jwks_uri
      console.log(`Fetching JWKS from: ${config.jwks_uri}`);
      const jwksResponse = await proxyFetch(config.jwks_uri);
      
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
            <div className="flex items-center gap-2 pb-2">
              <label htmlFor="issuer-url" className="block text-sm font-medium">Issuer URL:</label>
              <Popover>
                <PopoverTrigger>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-medium cursor-help" aria-label="Issuer URL info">?</span>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="max-w-xs">
                    <p className="font-medium">What is an Issuer URL?</p>
                    <p className="mt-1">The base URL of the identity provider that issues the JWT tokens. The app will append <code className="bg-muted px-1">.well-known/openid-configuration</code> to fetch JWKS info.</p>
                    <p className="mt-2 text-xs">Examples:</p>
                    <ul className="text-xs mt-1 space-y-1">
                      <li><code className="bg-muted px-1">https://auth.example.com</code></li>
                      <li><code className="bg-muted px-1">https://example.auth0.com</code></li>
                      <li><code className="bg-muted px-1">https://cognito-idp.region.amazonaws.com/userPoolId</code></li>
                    </ul>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="relative">
              <input
                id="issuer-url"
                type="text"
                value={issuerUrl}
                onChange={(e) => {
                  setIssuerUrl(e.target.value);
                  // No additional state changes needed here
                  // Fetching only happens on button click
                }}
                placeholder="https://example.com/identity"
                className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {/* Removed auto-populated message */}
            </div>
            <Button 
              onClick={fetchJwks}
              disabled={isLoading || !issuerUrl}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Fetching...' : 'Fetch JWKS'}
            </Button>
          </div>
          
          {error && (
            <Alert 
              variant={error.isCors ? 'default' : 'destructive'} 
              className={error.isCors 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-700' 
                : 'bg-red-500/10 border-red-500/20 text-destructive'
              }
            >
              <AlertTitle>{error.isCors ? 'CORS Error' : 'Error Fetching JWKS'}</AlertTitle>
              <AlertDescription>
                {error.message}
                {error.isCors && (
                  <div className="mt-2">
                    <p className="text-sm">Try fetching the JWKS manually with:</p>
                    <CodeBlock 
                      code={`curl ${issuerUrl.endsWith('/') 
                        ? `${issuerUrl}.well-known/jwks.json` 
                        : `${issuerUrl}/.well-known/jwks.json`}`} 
                      language="bash" 
                      className="mt-1 text-xs"
                    />
                    <p className="text-sm mt-2">Then use the "Manual Entry" option to paste the result.</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="manual" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2">
              <label htmlFor="manual-jwks" className="block text-sm font-medium">Paste JWKS here:</label>
              <Popover>
                <PopoverTrigger>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-medium cursor-help" aria-label="JWKS format info">?</span>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="max-w-xs">
                    <p className="font-medium">What is a JWKS?</p>
                    <p className="mt-1">A JSON Web Key Set (JWKS) contains the cryptographic keys used to verify JWT signatures. It should be a JSON object with a "keys" array containing JWK objects.</p>
                    <p className="mt-2 text-xs">How to get it:</p>
                    <ol className="text-xs mt-1 space-y-1">
                      <li>1. From your identity provider's dashboard</li>
                      <li>2. By accessing the <code className="bg-muted px-1">jwks_uri</code>located at <code className="bg-muted px-1">[issuer-url]/.well-known/openid-configuration</code> in a browser or using a tool like cURL</li>
                    </ol>
                    <p className="mt-2 text-xs">Example format:</p>
                    <CodeBlock 
                      code={`{
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
                      language="json" 
                      className="mt-1 text-xs"
                    />
                  </div>
                </PopoverContent>
              </Popover>
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
