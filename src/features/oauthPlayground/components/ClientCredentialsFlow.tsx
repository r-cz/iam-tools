import React, { useState } from "react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Import Switch
import { signToken } from "@/lib/jwt/sign-token"; // Import signing function
import { DEMO_JWKS } from "@/lib/jwt/demo-key"; // Import demo JWKS for kid
import { CodeBlock } from "@/components/ui/code-block"; // Import CodeBlock

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
  [key: string]: any;
}

export function ClientCredentialsFlow() {
  const navigate = useNavigate(); // Instantiate useNavigate
  const [tokenEndpoint, setTokenEndpoint] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TokenResponse | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false); // Add state for demo mode

  const generateDemoAccessToken = async (): Promise<TokenResponse> => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const demoClientId = clientId || "demo-client-credentials-client";
      const demoAudience = "https://api.example.com/resource"; // Example audience

      const accessTokenPayload = {
        iss: `${window.location.origin}/oauth-playground/demo`,
        sub: demoClientId, // Subject is the client ID in CC flow
        aud: demoAudience,
        exp: currentTime + 3600, // Expires in 1 hour
        iat: currentTime,
        scope: scope || "api:read api:write", // Default scope if none provided
        client_id: demoClientId,
        is_demo_token: true, // Mark as demo token
        token_usage: 'access_token' // Indicate usage
      };

      // Sign the token using the demo key
      const accessToken = await signToken(accessTokenPayload, { kid: DEMO_JWKS.keys[0].kid });

      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: accessTokenPayload.scope,
      };
    } catch (error: any) {
      console.error('Error generating demo CC token:', error);
      return {
        error: "token_generation_failed",
        error_description: error.message || "Failed to generate demo token",
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (isDemoMode) {
      // Generate demo token
      const demoResult = await generateDemoAccessToken();
      setResult(demoResult);
      setLoading(false);
    } else {
      // Perform real network request
      try {
        const params = new URLSearchParams();
        params.append("grant_type", "client_credentials");
        params.append("client_id", clientId);
        params.append("client_secret", clientSecret);
        if (scope) params.append("scope", scope);

        const res = await fetch(tokenEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        const data = await res.json();
        setResult(data);
      } catch (err: any) {
        setResult({
          error: "network_error",
          error_description: err.message || "Network error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Function to handle inspecting the token
  const handleInspectToken = () => {
    if (result?.access_token) {
      const inspectUrl = `/token-inspector?token=${encodeURIComponent(result.access_token)}`;
      navigate(inspectUrl);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardContent className="p-5">
          {/* Demo Mode Switch */}
          <div className="flex items-center space-x-2 mb-4 p-3 border rounded-md bg-muted/50">
            <Switch
              id="demo-mode-switch"
              checked={isDemoMode}
              onCheckedChange={setIsDemoMode}
            />
            <Label htmlFor="demo-mode-switch" className="mb-0"> {/* Remove bottom margin from label */}
              Demo Mode
              <p className="text-xs text-muted-foreground font-normal">
                Generate a signed demo token locally instead of calling the endpoint.
              </p>
            </Label>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Token Endpoint Input (Disabled in Demo Mode) */}
            <div>
              <Label htmlFor="token-endpoint" className="mb-1.5 block">Token Endpoint</Label>
              <Input
                id="token-endpoint"
                type="url"
                value={tokenEndpoint}
                onChange={(e) => setTokenEndpoint(e.target.value)}
                required={!isDemoMode} // Not required in demo mode
                disabled={isDemoMode} // Disable in demo mode
                placeholder={isDemoMode ? "N/A (Demo Mode)" : "https://example.com/oauth/token"}
              />
            </div>
            {/* Client ID Input */}
            <div>
              <Label htmlFor="client-id" className="mb-1.5 block">Client ID</Label>
              <Input
                id="client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required={!isDemoMode} // Not required in demo mode, but useful for payload
                placeholder={isDemoMode ? "(Optional for Demo)" : "Enter Client ID"}
              />
            </div>
            {/* Client Secret Input (Disabled in Demo Mode) */}
            <div>
              <Label htmlFor="client-secret" className="mb-1.5 block">Client Secret</Label>
              <Input
                id="client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required={!isDemoMode} // Not required in demo mode
                disabled={isDemoMode} // Disable in demo mode
                placeholder={isDemoMode ? "N/A (Demo Mode)" : "Enter Client Secret"}
              />
            </div>
            {/* Scope Input */}
            <div>
              <Label htmlFor="scope" className="mb-1.5 block">Scope (optional)</Label>
              <Input
                id="scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="space-separated scopes (e.g., api:read)"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Requesting..." : (isDemoMode ? "Generate Demo Token" : "Request Token")}
            </Button>
          </form>
          {result && (
            <div className="mt-6 space-y-4"> {/* Add space-y-4 for button spacing */}
              <Label className="mb-1.5 block">Result</Label>
              {/* Use CodeBlock instead of textarea */}
              <CodeBlock
                code={JSON.stringify(result, null, 2)}
                language="json"
                className="text-xs max-h-96 overflow-auto" // Add max-height and overflow
              />
              {/* Add Inspect Token button */}
              {result.access_token && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleInspectToken}
                >
                  Inspect Access Token
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ClientCredentialsFlow;
