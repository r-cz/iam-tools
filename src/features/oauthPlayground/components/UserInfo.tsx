import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CodeBlock } from "@/components/ui/code-block";
import { IssuerHistory } from "@/components/common";
import { useIssuerHistory, useAppState } from "@/lib/state";
import { proxyFetch } from "@/lib/proxy-fetch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { User, History } from "lucide-react";
import { generateFreshToken } from "@/features/tokenInspector/utils/generate-token";

interface UserInfoResponse {
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email?: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  updated_at?: number;
  error?: string;
  error_description?: string;
  [key: string]: any;
}

export function UserInfo() {
  const navigate = useNavigate();
  const { addIssuer } = useIssuerHistory();
  const { addToken, tokenHistory } = useAppState();

  // Form state
  const [userInfoEndpoint, setUserInfoEndpoint] = useState("");
  const [accessToken, setAccessToken] = useState("");
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UserInfoResponse | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [showTokenHistory, setShowTokenHistory] = useState(false);
  const [isLoadingDemoToken, setIsLoadingDemoToken] = useState(false);
  
  // Auto-fill demo token when demo mode is enabled
  useEffect(() => {
    const loadDemoToken = async () => {
      if (isDemoMode) {
        if (!accessToken) {
          setIsLoadingDemoToken(true);
          try {
            const demoToken = await generateFreshToken();
            setAccessToken(demoToken);
            toast.success("Demo token loaded");
          } catch (error) {
            console.error("Error loading demo token:", error);
            toast.error("Failed to load demo token");
          } finally {
            setIsLoadingDemoToken(false);
          }
        }
      }
    };
    
    loadDemoToken();
  }, [isDemoMode, accessToken]);

  // Handle issuer selection from history
  const handleSelectIssuer = async (issuerUrl: string) => {
    setConfigLoading(true);
    
    try {
      // Construct the well-known URL
      const url = new URL(issuerUrl);
      const basePath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
      const wellKnownUrl = new URL(
        `${basePath}.well-known/openid-configuration`,
        url.origin
      ).toString();
      
      // Fetch OIDC configuration to get userinfo endpoint
      const response = await proxyFetch(wellKnownUrl);
      
      if (response.ok) {
        const config = await response.json();
        if (config.userinfo_endpoint) {
          setUserInfoEndpoint(config.userinfo_endpoint);
          // Add issuer to history
          addIssuer(issuerUrl);
        } else {
          // Show error if no userinfo endpoint is available
          toast.error('This issuer does not have a userinfo endpoint configured');
        }
      } else {
        toast.error('Failed to fetch OIDC configuration');
      }
    } catch (error) {
      toast.error('Error fetching OIDC configuration: ' + (error as Error).message);
    } finally {
      setConfigLoading(false);
    }
  };

  // Handle token selection from history
  const handleSelectToken = (tokenValue: string) => {
    setAccessToken(tokenValue);
    setShowTokenHistory(false);
  };

  const generateDemoUserInfo = (): UserInfoResponse => {
    try {
      // Create a realistic demo user info response
      return {
        sub: "demo-user-123",
        name: "Demo User",
        given_name: "Demo",
        family_name: "User",
        preferred_username: "demouser",
        email: "demo@example.com",
        email_verified: true,
        picture: "https://notion-avatar.app/api/svg/eyJmYWNlIjowLCJub3NlIjoxMCwibW91dGgiOjAsImV5ZXMiOjksImV5ZWJyb3dzIjoyLCJnbGFzc2VzIjowLCJoYWlyIjoxMCwiYWNjZXNzb3JpZXMiOjAsImRldGFpbHMiOjAsImJlYXJkIjoxLCJmbGlwIjowLCJjb2xvciI6InJnYmEoMjU1LCAwLCAwLCAwKSIsInNoYXBlIjoibm9uZSJ9",
        locale: "en-US",
        updated_at: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        zoneinfo: "America/Los_Angeles",
        address: {
          formatted: "123 Demo St, Demo City, DC 12345, USA",
          street_address: "123 Demo St",
          locality: "Demo City",
          region: "DC",
          postal_code: "12345",
          country: "USA"
        },
        is_demo_response: true // Mark as demo response
      };
    } catch (error: any) {
      console.error('Error generating demo userinfo:', error);
      return {
        error: "userinfo_generation_failed",
        error_description: error.message || "Failed to generate demo user info"
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (isDemoMode) {
      // Generate demo userinfo
      const demoResult = generateDemoUserInfo();
      setResult(demoResult);
      
      // Add the token to history (only if provided in demo mode)
      if (accessToken) {
        addToken(accessToken);
      }
    } else {
      // In non-demo mode, token is required
      if (!accessToken) {
        setResult({
          error: "missing_token",
          error_description: "Access token is required"
        });
        setLoading(false);
        return;
      }
      // Validate required fields for real request
      if (!userInfoEndpoint) {
        setResult({
          error: "missing_endpoint",
          error_description: "UserInfo endpoint is required"
        });
        setLoading(false);
        return;
      }
      
      // Perform real network request
      try {
        const res = await proxyFetch(userInfoEndpoint, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error_description || errorData.error || `HTTP error ${res.status}`);
        }

        const data = await res.json();
        setResult(data);
        
        // Add the token to history if request was successful
        if (accessToken) {
          addToken(accessToken);
        }
      } catch (err: any) {
        setResult({
          error: "request_failed",
          error_description: err.message || "Failed to fetch user info"
        });
      }
    }
    
    setLoading(false);
  };

  // Function to handle inspecting the token
  const handleInspectToken = () => {
    if (accessToken) {
      const inspectUrl = `/token-inspector?token=${encodeURIComponent(accessToken)}`;
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
              disabled={isLoadingDemoToken}
            />
            <Label htmlFor="demo-mode-switch" className="mb-0">
              Demo Mode
              <p className="text-xs text-muted-foreground font-normal">
                Generate a simulated UserInfo response locally instead of calling the endpoint.
              </p>
              {isLoadingDemoToken && (
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  Loading demo token...
                </p>
              )}
            </Label>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* UserInfo Endpoint Input with History */}
            <div className="space-y-2">
              <Label htmlFor="userinfo-endpoint">UserInfo Endpoint</Label>
              <div className="relative">
                <Input
                  id="userinfo-endpoint"
                  type="url"
                  value={userInfoEndpoint}
                  onChange={(e) => setUserInfoEndpoint(e.target.value)}
                  required={!isDemoMode}
                  disabled={isDemoMode}
                  placeholder={isDemoMode ? "N/A (Demo Mode)" : "https://example.com/oauth/userinfo"}
                  className={isDemoMode ? "" : "pr-10"}
                />
                {!isDemoMode && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <IssuerHistory 
                      onSelectIssuer={handleSelectIssuer}
                      configLoading={configLoading}
                      disabled={isDemoMode}
                      compact={true}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Access Token Input with History */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="access-token">Access Token</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleInspectToken}
                  disabled={!accessToken}
                >
                  View in Token Inspector
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="access-token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  required={!isDemoMode}
                  placeholder={isDemoMode ? "Optional in demo mode" : "Enter your access token"}
                  className={`font-mono text-xs ${tokenHistory.length > 0 && !isDemoMode ? 'pr-10' : ''}`}
                />
                {tokenHistory.length > 0 && !isDemoMode && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowTokenHistory(!showTokenHistory)}
                      disabled={isDemoMode}
                      title="Recent Tokens"
                    >
                      <History size={16} />
                    </Button>
                  </div>
                )}
              </div>
              
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
            
            <Button type="submit" disabled={loading}>
              {loading ? "Fetching..." : (isDemoMode ? "Generate Demo UserInfo" : "Get UserInfo")}
            </Button>
          </form>
          
          {/* Results Section */}
          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="mb-1.5 block">UserInfo Result</Label>
                {isDemoMode && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/10">Demo Response</Badge>
                )}
              </div>
              
              {/* Error Display */}
              {result.error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
                  <p className="font-medium">Error: {result.error}</p>
                  {result.error_description && (
                    <p className="mt-1">{result.error_description}</p>
                  )}
                </div>
              )}
              
              {/* User Profile Summary */}
              {!result.error && (
                <div className="bg-muted rounded-md p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {result.picture ? (
                      <img 
                        src={result.picture} 
                        alt={result.name || "User"} 
                        className="w-12 h-12 rounded-full"
                        onError={(e) => {
                          // Replace with user icon if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="text-primary" />
                      </div>
                    )}
                    <div className="fallback-icon hidden w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">
                        {result.name || result.preferred_username || result.sub || "User"}
                      </h3>
                      {result.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          {result.email}
                          {result.email_verified === true && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 hover:bg-green-500/10 text-xs">Verified</Badge>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {result.sub && (
                      <div>
                        <span className="text-muted-foreground">Subject ID:</span> <span className="font-mono">{result.sub}</span>
                      </div>
                    )}
                    {result.locale && (
                      <div>
                        <span className="text-muted-foreground">Locale:</span> {result.locale}
                      </div>
                    )}
                    {result.zoneinfo && (
                      <div>
                        <span className="text-muted-foreground">Timezone:</span> {result.zoneinfo}
                      </div>
                    )}
                    {result.updated_at && (
                      <div>
                        <span className="text-muted-foreground">Updated:</span> {new Date(result.updated_at * 1000).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Full Response */}
              <CodeBlock
                code={JSON.stringify(result, null, 2)}
                language="json"
                className="text-xs max-h-96 overflow-auto"
              />
              
              {/* Standard Claims Info */}
              {!result.error && (
                <div className="text-xs text-muted-foreground border-t pt-3">
                  <p className="mb-1">
                    <a 
                      href="https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      OpenID Connect Standard Claims
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserInfo;