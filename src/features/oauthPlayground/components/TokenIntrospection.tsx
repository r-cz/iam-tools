import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { useAppState } from "@/lib/state";
import { History } from "lucide-react";
import { signToken } from "@/lib/jwt/sign-token";
import { DEMO_JWKS } from "@/lib/jwt/demo-key";
import { proxyFetch } from "@/lib/proxy-fetch";

interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  jti?: string;
  error?: string;
  error_description?: string;
  [key: string]: any;
}

export function TokenIntrospection() {
  const navigate = useNavigate();
  const { addToken, tokenHistory, issuerHistory } = useAppState();
  
  // Endpoint state
  const [introspectionEndpoint, setIntrospectionEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntrospectionResponse | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showTokenHistory, setShowTokenHistory] = useState(false);
  const [showIssuerHistory, setShowIssuerHistory] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  // Generate a sample introspection response for demo mode
  const generateDemoIntrospectionResponse = async (): Promise<IntrospectionResponse> => {
    try {
      // Create a demo token if none provided
      let tokenToIntrospect = token;
      
      if (!tokenToIntrospect) {
        // Generate a sample token
        const currentTime = Math.floor(Date.now() / 1000);
        const demoClientId = clientId || "demo-client";
        
        const tokenPayload = {
          iss: `${window.location.origin}/oauth-playground/demo`,
          sub: "demo-user-123",
          aud: "https://api.example.com/resource",
          exp: currentTime + 3600, // Expires in 1 hour
          iat: currentTime - 300, // Issued 5 minutes ago
          nbf: currentTime - 300, // Not valid before 5 minutes ago
          scope: "openid profile email api:read",
          client_id: demoClientId,
          jti: `demo-${Math.random().toString(36).substring(2, 15)}`,
          is_demo_token: true
        };
        
        tokenToIntrospect = await signToken(tokenPayload, { kid: DEMO_JWKS.keys[0].kid });
        setToken(tokenToIntrospect);
      }
      
      // Extract token parts
      const parts = tokenToIntrospect.split('.');
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }
      
      // Parse the payload
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Generate introspection response based on the token
      return {
        active: payload.exp ? payload.exp > currentTime : true,
        scope: payload.scope || "openid profile",
        client_id: payload.client_id || clientId || "demo-client",
        token_type: "Bearer",
        exp: payload.exp,
        iat: payload.iat,
        nbf: payload.nbf,
        sub: payload.sub,
        aud: payload.aud,
        iss: payload.iss,
        jti: payload.jti,
        username: payload.sub
      };
    } catch (error: any) {
      console.error('Error generating demo introspection response:', error);
      return {
        active: false,
        error: "invalid_token",
        error_description: error.message || "Failed to introspect token"
      };
    }
  };


  // Handle token selection from history
  const handleSelectToken = (tokenValue: string) => {
    setToken(tokenValue);
    setShowTokenHistory(false);
  };
  
  // Handle issuer selection from history
  const handleSelectIssuer = async (issuerUrl: string) => {
    setShowIssuerHistory(false);
    setConfigLoading(true);
    
    try {
      // Construct the well-known URL
      const url = new URL(issuerUrl);
      const basePath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
      const wellKnownUrl = new URL(
        `${basePath}.well-known/openid-configuration`,
        url.origin
      ).toString();
      
      // Fetch OIDC configuration to get introspection endpoint
      const response = await proxyFetch(wellKnownUrl);
      
      if (response.ok) {
        const config = await response.json();
        if (config.introspection_endpoint) {
          setIntrospectionEndpoint(config.introspection_endpoint);
        }
      } else {
        console.error('Failed to fetch OIDC configuration');
      }
    } catch (error) {
      console.error('Error fetching OIDC config:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    if (!token) {
      setResult({
        active: false,
        error: "missing_token",
        error_description: "Token is required"
      });
      setLoading(false);
      return;
    }
    
    if (isDemoMode) {
      // Generate demo response
      const demoResult = await generateDemoIntrospectionResponse();
      setResult(demoResult);
      
      // Add token to history if it's valid
      if (token && demoResult.active !== false) {
        addToken(token);
      }
    } else {
      // Validate required fields for real request
      if (!introspectionEndpoint) {
        setResult({
          active: false,
          error: "missing_endpoint",
          error_description: "Introspection endpoint is required"
        });
        setLoading(false);
        return;
      }
      
      // Perform real network request
      try {
        
        // Create form data for introspection request
        const params = new URLSearchParams();
        params.append("token", token);
        
        // Add client credentials if provided
        if (clientId) params.append("client_id", clientId);
        if (clientSecret) params.append("client_secret", clientSecret);
        
        // Make the introspection request
        const res = await fetch(introspectionEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...(clientId && clientSecret ? {
              "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`
            } : {})
          },
          body: params.toString()
        });
        
        const data = await res.json();
        setResult(data);
        
        // Add token to history if it's valid
        if (token && data.active !== false) {
          addToken(token);
        }
      } catch (err: any) {
        setResult({
          active: false,
          error: "network_error",
          error_description: err.message || "Network error"
        });
      }
    }
    
    setLoading(false);
  };

  // Handle inspection of token in token inspector
  const handleInspectToken = () => {
    if (token) {
      const inspectUrl = `/token-inspector?token=${encodeURIComponent(token)}`;
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
            <Label htmlFor="demo-mode-switch" className="mb-0">
              Demo Mode
              <p className="text-xs text-muted-foreground font-normal">
                Generate a simulated introspection response locally without making network requests.
              </p>
            </Label>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Introspection Endpoint Input with History */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="introspection-endpoint">Introspection Endpoint</Label>
                {issuerHistory.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => setShowIssuerHistory(!showIssuerHistory)}
                    disabled={configLoading}
                  >
                    <History size={16} />
                    <span>Recent Issuers</span>
                  </Button>
                )}
              </div>
              <Input
                id="introspection-endpoint"
                type="url"
                value={introspectionEndpoint}
                onChange={(e) => setIntrospectionEndpoint(e.target.value)}
                required={!isDemoMode}
                disabled={isDemoMode}
                placeholder={isDemoMode ? "N/A (Demo Mode)" : "https://example.com/oauth/introspect"}
              />
              
              {/* Recent Issuers Dropdown */}
              {showIssuerHistory && issuerHistory.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 border rounded-md bg-background shadow-md max-h-40 overflow-y-auto">
                  <div className="p-1">
                    {issuerHistory.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm"
                        onClick={() => handleSelectIssuer(item.url)}
                      >
                        <div className="truncate">{item.name || new URL(item.url).hostname}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.url}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Token Input with History */}
            <div className="relative">
              <div className="flex justify-between items-center">
                <Label htmlFor="token">Token to Introspect</Label>
                <div className="flex items-center gap-2">
                  {tokenHistory.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => setShowTokenHistory(!showTokenHistory)}
                    >
                      <History size={16} />
                      <span>Recent Tokens</span>
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleInspectToken}
                    disabled={!token}
                  >
                    View in Token Inspector
                  </Button>
                </div>
              </div>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                placeholder="Enter token to introspect"
                className="font-mono text-xs"
              />
              
              {/* Recent Tokens Dropdown */}
              {showTokenHistory && tokenHistory.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 border rounded-md bg-background shadow-md max-h-40 overflow-y-auto">
                  <div className="p-1">
                    {tokenHistory.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm"
                        onClick={() => handleSelectToken(item.token)}
                      >
                        <div className="truncate">{item.name || `Token ${item.id.substring(0, 8)}...`}</div>
                        {item.issuer && (
                          <div className="text-xs text-muted-foreground truncate">{item.issuer}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Client Credentials Section */}
            <div className="space-y-4 border rounded-md p-3">
              <h3 className="text-sm font-medium">Client Authentication (Optional)</h3>
              
              {/* Client ID Input */}
              <div>
                <Label htmlFor="client-id" className="mb-1.5 block">Client ID</Label>
                <Input
                  id="client-id"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter Client ID"
                />
              </div>
              
              {/* Client Secret Input */}
              <div>
                <Label htmlFor="client-secret" className="mb-1.5 block">Client Secret</Label>
                <Input
                  id="client-secret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  disabled={isDemoMode}
                  placeholder={isDemoMode ? "N/A (Demo Mode)" : "Enter Client Secret"}
                />
              </div>
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : (isDemoMode ? "Generate Demo Response" : "Introspect Token")}
            </Button>
          </form>
          
          {/* Results Section */}
          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="mb-1.5 block">Introspection Result</Label>
                {isDemoMode && <Badge variant="outline">Demo Response</Badge>}
              </div>
              
              {/* Active/Inactive Status */}
              {result.active !== undefined && (
                <Alert variant={result.active ? "default" : "destructive"}>
                  <AlertDescription>
                    Token is {result.active ? "active" : "inactive"}
                    {result.error && `: ${result.error_description || result.error}`}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Full Response */}
              <CodeBlock
                code={JSON.stringify(result, null, 2)}
                language="json"
                className="text-xs max-h-96 overflow-auto"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TokenIntrospection;