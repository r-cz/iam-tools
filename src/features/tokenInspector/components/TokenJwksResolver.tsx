import React, { useState, useEffect } from "react";
import { proxyFetch } from "@/lib/proxy-fetch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CodeBlock } from "@/components/ui/code-block";
import { toast } from "sonner";
import { getIssuerBaseUrl } from "@/lib/jwt/generate-signed-token";

interface TokenJwksResolverProps {
  issuerUrl: string;
  setIssuerUrl: (url: string) => void;
  onJwksResolved: (jwks: any) => void;
  isDemoToken?: boolean;
}

interface KeyInfo {
  kid?: string;
  alg?: string;
  use?: string;
  kty?: string;
}

export function TokenJwksResolver({
  issuerUrl,
  setIssuerUrl,
  onJwksResolved,
  isDemoToken = false
}: TokenJwksResolverProps) {
  const [jwksMode, setJwksMode] = useState<"automatic" | "manual">("automatic");
  const [manualJwks, setManualJwks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Using error state for internal logic but displaying through toast
  const [_error, setError] = useState<string | null>(null);

  // Using a separate flag to track whether we've already set the issuer URL
  const initialSetupDoneRef = React.useRef(false);

  // This useEffect for initial issuerUrl setup is fine
  useEffect(() => {
    const isAuthExample = issuerUrl && (issuerUrl === "https://auth.example.com");

    // Only auto-set the URL once, not on every render or change
    if (!initialSetupDoneRef.current && (isDemoToken || isAuthExample) && !issuerUrl.includes(window.location.host)) {
      const localIssuerUrl = getIssuerBaseUrl();
      console.log('Setting issuer URL to local domain:', localIssuerUrl);
      setIssuerUrl(localIssuerUrl);
      initialSetupDoneRef.current = true;
    }
  }, [isDemoToken, issuerUrl, setIssuerUrl]);

  // REMOVED THE PROBLEMATIC useEffect HOOK THAT CAUSED AUTOMATIC FETCHING

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

      // Special case for local development or demo tokens
      const useDirectFetch = issuerUrl.includes('localhost') ||
        issuerUrl.includes(window.location.host) ||
        isDemoToken;

      console.log(`Using direct fetch: ${useDirectFetch}`);

      const configResponse = useDirectFetch
        ? await fetch(configUrl, { cache: 'no-store' }) // Prevent caching
        : await proxyFetch(configUrl);

      if (!configResponse.ok) {
        throw new Error(`Failed to fetch OpenID configuration: ${configResponse.status} ${configResponse.statusText}`);
      }

      const config = await configResponse.json();
      console.log('OpenID configuration:', config);

      if (!config.jwks_uri) {
        throw new Error("No JWKS URI found in OpenID configuration");
      }

      // Then, fetch the JWKS using the jwks_uri
      console.log(`Fetching JWKS from: ${config.jwks_uri}`);
      const jwksResponse = useDirectFetch
        ? await fetch(config.jwks_uri, { cache: 'no-store' }) // Prevent caching
        : await proxyFetch(config.jwks_uri);

      if (!jwksResponse.ok) {
        throw new Error(`Failed to fetch JWKS: ${jwksResponse.status} ${jwksResponse.statusText}`);
      }

      const jwks = await jwksResponse.json();
      console.log('JWKS data:', jwks);

      if (!jwks.keys || !Array.isArray(jwks.keys)) {
        throw new Error("Invalid JWKS format: missing 'keys' array");
      }

      // Log details about the keys we found
      console.log('JWKS keys found:', jwks.keys.map((k: KeyInfo) => ({
        kid: k.kid,
        alg: k.alg,
        use: k.use,
        kty: k.kty
      })));

      // Pass the JWKS to the callback function for verification
      onJwksResolved(jwks);
      setError(null);

      toast.success(
        <div>
          <p><strong>JWKS Fetched Successfully</strong></p>
          <p>Found {jwks.keys.length} keys in the JWKS</p>
          {jwks.keys.map((key: KeyInfo, i: number) => (
            <p key={i} className="text-xs mt-1">Key ID: {key.kid}</p>
          ))}
        </div>,
        {
          id: 'jwks-fetch-success',
          duration: 3000,
        }
      );
      toast.dismiss('jwks-fetch-error');
    } catch (err: any) {
      console.error("Error fetching JWKS:", err);

      // Check if it's likely a CORS error
      const errorMessage = err.message || "Unknown error";
      const isCorsError = errorMessage.includes("CORS") ||
        err.name === 'TypeError' && errorMessage.includes('Failed to fetch');

      const errorText = isCorsError
        ? 'CORS error: The server does not allow direct browser access.'
        : `Error fetching JWKS: ${errorMessage}`;

      setError(errorText);

      // Show toast notification
      if (isCorsError) {
        const curlCommand = issuerUrl.endsWith('/')
          ? `${issuerUrl}.well-known/jwks.json`
          : `${issuerUrl}/.well-known/jwks.json`;

        toast.error(
          <div className="space-y-2">
            <p><strong>CORS Error</strong></p>
            <p>{errorText}</p>
            <p className="text-sm">Try fetching the JWKS manually with:</p>
            <CodeBlock
              code={`curl ${curlCommand}`}
              language="bash"
              className="mt-1 text-xs"
            />
            <p className="text-sm mt-2">Then use the "Manual Entry" option to paste the result.</p>
          </div>,
          {
            id: 'jwks-fetch-error',
            duration: 10000,
          }
        );
      } else {
        toast.error(
          <div>
            <p><strong>Error Fetching JWKS</strong></p>
            <p>{errorText}</p>
          </div>,
          {
            id: 'jwks-fetch-error',
            duration: 5000,
          }
        );
      }
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
        keyIds: parsedJwks.keys.map((k: { kid?: string }) => k.kid)
      });

      // Directly pass the parsed JWKS to the callback
      onJwksResolved(parsedJwks);
      setError(null);

      toast.success(
        <div>
          <p><strong>JWKS Applied Successfully</strong></p>
          <p>Found {parsedJwks.keys.length} keys in the JWKS</p>
        </div>,
        {
          id: 'jwks-manual-success',
          duration: 3000,
        }
      );
    } catch (err: any) {
      console.error('Error parsing manual JWKS:', err);
      const errorText = `Invalid JWKS JSON: ${err.message}`;
      setError(errorText);

      toast.error(
        <div>
          <p><strong>Invalid JWKS Format</strong></p>
          <p>{errorText}</p>
        </div>,
        {
          id: 'jwks-parse-error',
          duration: 5000,
        }
      );
    }
  };

  // Function to handle input changes - always allow editing
  const handleIssuerUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Always set the issuer URL regardless of demo token state
    setIssuerUrl(e.target.value);
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
                onChange={handleIssuerUrlChange}
                placeholder="https://example.com/identity"
                className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {isDemoToken && (
                <div className="text-xs text-muted-foreground mt-1">
                  <em>This token uses the local domain as its issuer</em>
                </div>
              )}
            </div>
            <Button
              onClick={fetchJwks} // Button click triggers fetch
              disabled={isLoading || !issuerUrl}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Fetching...' : 'Fetch JWKS'}
            </Button>
          </div>
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
              onClick={handleManualJwksSubmit} // Button click triggers manual apply
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