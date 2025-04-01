// src/features/tokenInspector/components/TokenJwksResolver.tsx

import React, { useState } from "react"; // Removed unused useEffect, useRef
import { proxyFetch } from "@/lib/proxy-fetch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
// Removed unused import: getIssuerBaseUrl
import { DEMO_JWKS } from "@/lib/jwt/demo-key";
import { KeyRound } from "lucide-react";
import type { JSONWebKeySet } from "jose"; // Import type

interface TokenJwksResolverProps {
  issuerUrl: string;
  setIssuerUrl: (url: string) => void;
  onJwksResolved: (jwks: JSONWebKeySet) => void; // Use specific type
  isCurrentTokenDemo?: boolean; // Flag from parent indicating if the current token is a demo one
}

// Interface for basic key info logging (optional but good practice)
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
  isCurrentTokenDemo = false // Default to false if not provided
}: TokenJwksResolverProps) {
  const [jwksMode, setJwksMode] = useState<"automatic" | "manual">("automatic");
  const [manualJwks, setManualJwks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null); // Internal error state, shown via toast

  // Function to handle automatic JWKS fetching
  const fetchJwks = async () => {
    // Prevent fetching if it's identified as a demo token - user must use the specific button
    if (isCurrentTokenDemo) {
        toast.info("Automatic fetch disabled for demo token.", {
            description: "Use 'Load Demo JWKS' button instead.",
            duration: 4000
        });
        return;
    }
    if (!issuerUrl) {
        toast.error("Issuer URL is required for automatic fetching.");
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Normalize URL
      const normalizedIssuerUrl = issuerUrl.endsWith("/")
        ? issuerUrl
        : `${issuerUrl}/`;

      // Fetch OIDC config first
      const configUrl = `${normalizedIssuerUrl}.well-known/openid-configuration`;
      console.log(`Fetching OpenID configuration from: ${configUrl}`);

      const useDirectFetch = issuerUrl.includes('localhost'); // Only use direct fetch for actual localhost
      console.log(`Using direct fetch: ${useDirectFetch}`);

      const configResponse = useDirectFetch
        ? await fetch(configUrl, { cache: 'no-store' })
        : await proxyFetch(configUrl);

      if (!configResponse.ok) {
        throw new Error(`Failed to fetch OpenID config: ${configResponse.status} ${configResponse.statusText}`);
      }
      const config = await configResponse.json();
      console.log('OpenID configuration:', config);

      if (!config.jwks_uri) {
        throw new Error("No JWKS URI found in OpenID configuration");
      }

      // Fetch JWKS using the URI from config
      console.log(`Fetching JWKS from: ${config.jwks_uri}`);
      const jwksResponse = useDirectFetch
        ? await fetch(config.jwks_uri, { cache: 'no-store' })
        : await proxyFetch(config.jwks_uri);

      if (!jwksResponse.ok) {
        throw new Error(`Failed to fetch JWKS: ${jwksResponse.status} ${jwksResponse.statusText}`);
      }
      const jwks = await jwksResponse.json();
      console.log('JWKS data:', jwks);

      if (!jwks.keys || !Array.isArray(jwks.keys)) {
        throw new Error("Invalid JWKS format: missing 'keys' array");
      }

      console.log('JWKS keys found:', jwks.keys.map((k: KeyInfo) => ({ kid: k.kid, alg: k.alg, use: k.use, kty: k.kty })));

      // Success: Pass JWKS up and show toast
      onJwksResolved(jwks);
      setError(null);
      toast.success(
        <div>
          <p><strong>JWKS Fetched Successfully</strong></p>
          <p>Found {jwks.keys.length} keys from {config.jwks_uri}</p>
        </div>,
        { id: 'jwks-fetch-success', duration: 3000 }
      );
      toast.dismiss('jwks-fetch-error'); // Dismiss any previous error toast

    } catch (err: any) {
      console.error("Error fetching JWKS:", err);
      const errorMessage = err.message || "Unknown error";
      setError(errorMessage); // Set internal error state

      // Show more informative error toast
      toast.error(
          <div>
            <p><strong>Error Fetching JWKS</strong></p>
            <p>{errorMessage}</p>
            {errorMessage.includes("CORS") && <p className="text-xs mt-1">Try fetching manually or use the Manual Entry tab.</p>}
          </div>,
          { id: 'jwks-fetch-error', duration: 8000 }
        );
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle submitting manually entered JWKS
  const handleManualJwksSubmit = () => {
    setError(null); // Clear previous errors
    try {
      const trimmedJwks = manualJwks.trim();
      if (!trimmedJwks) {
          throw new Error("JWKS input cannot be empty.");
      }
      const parsedJwks = JSON.parse(trimmedJwks) as JSONWebKeySet; // Assert type

      if (!parsedJwks.keys || !Array.isArray(parsedJwks.keys)) {
        throw new Error("Invalid JWKS format: must be an object with a 'keys' array.");
      }

      // Basic validation for keys
      for (const key of parsedJwks.keys) {
        if (!key.kty || !key.kid) {
          console.warn("Key missing 'kty' or 'kid':", key);
        }
      }

      console.log('Manual JWKS parsed successfully:', {
        keyCount: parsedJwks.keys.length,
        keyIds: parsedJwks.keys.map((k) => k.kid) // Use map directly
      });

      // Pass the parsed JWKS up
      onJwksResolved(parsedJwks);
      toast.success(
        <div>
          <p><strong>Manual JWKS Applied</strong></p>
          <p>Found {parsedJwks.keys.length} keys.</p>
        </div>,
        { id: 'jwks-manual-success', duration: 3000 }
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
        { id: 'jwks-parse-error', duration: 5000 }
      );
    }
  };

  // Function to load the built-in DEMO_JWKS
  const loadDemoJwks = () => {
    try {
      console.log('Loading DEMO_JWKS manually via button click');
      onJwksResolved(DEMO_JWKS as JSONWebKeySet); // Assert type
      setManualJwks(JSON.stringify(DEMO_JWKS, null, 2)); // Pre-fill the manual text area
      setJwksMode('manual'); // Switch to the manual tab to show the loaded JWKS
      setError(null); // Clear any previous errors
      toast.success("Demo JWKS loaded successfully.", {
         description: "Ready to validate demo/example tokens.",
         duration: 3000
      });
    } catch (e) {
        console.error("Error loading demo JWKS:", e);
        toast.error("Failed to load Demo JWKS.");
    }
  };

  // Handle changes to the issuer URL input
  const handleIssuerUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIssuerUrl(e.target.value);
  };

  return (
    <div className="space-y-4">

      {/* --- Conditionally render the Load Demo JWKS button --- */}
      {isCurrentTokenDemo && (
        <Button
          variant="outline"
          size="sm"
          onClick={loadDemoJwks}
          className="w-full sm:w-auto mb-4 border-blue-500/50 text-blue-700 hover:bg-blue-500/10 dark:border-blue-400/50 dark:text-blue-300 dark:hover:bg-blue-400/10"
          aria-label="Load JWKS for demo or example token"
        >
           <KeyRound className="mr-2 h-4 w-4" />
           Load Demo JWKS (for this token)
        </Button>
      )}
      {/* --- End of conditional button --- */}

      <Tabs value={jwksMode} onValueChange={(value) => setJwksMode(value as "automatic" | "manual")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="automatic">Automatic Fetch</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
        </TabsList>

        {/* Automatic Fetch Tab */}
        <TabsContent value="automatic" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2">
              <label htmlFor="issuer-url" className="block text-sm font-medium">Issuer URL:</label>
              <Popover>
                 <PopoverTrigger aria-label="Issuer URL information">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-medium cursor-help">?</span>
                 </PopoverTrigger>
                 <PopoverContent>
                     <div className="max-w-xs space-y-1">
                       <p className="font-medium">Issuer URL</p>
                       <p className="text-sm">The base URL of the identity provider. The tool fetches <code className="bg-muted px-1">/.well-known/openid-configuration</code> to find the JWKS URI.</p>
                       <p className="text-xs text-muted-foreground">Example: https://accounts.google.com</p>
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
                placeholder="https://accounts.google.com"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isCurrentTokenDemo} // Disable input if demo token
                aria-describedby={isCurrentTokenDemo ? "issuer-url-disabled-hint" : undefined}
              />
              {/* Message shown when input is disabled for demo tokens */}
              {isCurrentTokenDemo && (
                 <p id="issuer-url-disabled-hint" className="text-xs text-muted-foreground mt-1">
                   Issuer URL fixed for demo token. Use 'Load Demo JWKS' button above.
                 </p>
              )}
            </div>
            <Button
              onClick={fetchJwks}
              disabled={isLoading || !issuerUrl || isCurrentTokenDemo} // Also disable fetch if demo token
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Fetching...' : 'Fetch JWKS'}
            </Button>
          </div>
           <p className="text-xs text-muted-foreground">
             Fetches JWKS based on the token's 'iss' claim. Use this for real external tokens. Disabled for demo tokens.
           </p>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2">
              <label htmlFor="manual-jwks" className="block text-sm font-medium">Paste JWKS JSON here:</label>
               <Popover>
                 <PopoverTrigger aria-label="JWKS format information">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-medium cursor-help" >?</span>
                 </PopoverTrigger>
                 <PopoverContent>
                     <div className="max-w-xs space-y-1">
                       <p className="font-medium">JWKS Format</p>
                       <p className="text-sm">Paste the full JSON Web Key Set object, usually starting with <code className="bg-muted px-1">{`{"keys": [...]}`}</code>.</p>
                     </div>
                 </PopoverContent>
              </Popover>
            </div>
            <textarea
              id="manual-jwks"
              value={manualJwks}
              onChange={(e) => setManualJwks(e.target.value)}
              placeholder='{\n  "keys": [\n    {\n      "kty": "RSA",\n      "kid": "...",\n      ...\n    }\n  ]\n}'
              className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              rows={8}
              aria-label="Manual JWKS Input"
            />
            <Button
              onClick={handleManualJwksSubmit}
              disabled={!manualJwks.trim()} // Disable if textarea is empty/whitespace
              className="w-full sm:w-auto"
            >
              Use This JWKS
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste a JWKS here, or use the "Load Demo JWKS" button above (if visible) to validate tokens generated by this tool.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}