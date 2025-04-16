import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// Removed Tabs imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../utils/pkce';
import { proxyFetch } from '@/lib/proxy-fetch';
import { OAuthConfig, PkceParams } from '../utils/types'; // Removed OAuthFlowType import
import { toast } from 'sonner';

interface ConfigurationFormProps {
  onConfigComplete: (config: OAuthConfig, pkce: PkceParams) => void;
}

export function ConfigurationForm({ onConfigComplete }: ConfigurationFormProps) {
  // Removed flowType state
  const [issuerUrl, setIssuerUrl] = useState<string>('');
  const [authEndpoint, setAuthEndpoint] = useState<string>('');
  const [tokenEndpoint, setTokenEndpoint] = useState<string>('');
  const [jwksEndpoint, setJwksEndpoint] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [redirectUri] = useState<string>(`${window.location.origin}/oauth-playground/callback`); // Removed setRedirectUri
  const [scopes, setScopes] = useState<string>('openid profile email');
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [endpointsLocked, setEndpointsLocked] = useState<boolean>(false); // Track if endpoints were set by discovery

  // Generate PKCE values
  const [codeVerifier, setCodeVerifier] = useState<string>('');
  const [codeChallenge, setCodeChallenge] = useState<string>('');
  const [state, setState] = useState<string>('');

  useEffect(() => {
    // Generate initial PKCE values
    regeneratePkce();
  }, []);

  // Add useEffect to show toast when demo mode is enabled
  useEffect(() => {
    if (isDemoMode) {
      toast.info("Demo mode enabled. A mock OAuth server will be used.");
    }
  }, [isDemoMode]);

  const regeneratePkce = async () => {
    const verifier = generateCodeVerifier();
    setCodeVerifier(verifier);
    
    const challenge = await generateCodeChallenge(verifier);
    setCodeChallenge(challenge);

    const newState = generateState();
    setState(newState);
  };

  const fetchOidcConfig = async () => {
    if (!issuerUrl) {
      toast.error('Please enter an issuer URL');
      return;
    }

    setIsLoadingDiscovery(true);
    try {
      const discoveryUrl = issuerUrl.endsWith('/')
        ? `${issuerUrl}.well-known/openid-configuration`
        : `${issuerUrl}/.well-known/openid-configuration`;

      const response = await proxyFetch(discoveryUrl);
      const config = await response.json();

      if (config.authorization_endpoint) setAuthEndpoint(config.authorization_endpoint);
      if (config.authorization_endpoint) setAuthEndpoint(config.authorization_endpoint);
      if (config.token_endpoint) setTokenEndpoint(config.token_endpoint);
      if (config.jwks_uri) setJwksEndpoint(config.jwks_uri);
      
      // Lock endpoints if discovery was successful
      if (config.authorization_endpoint || config.token_endpoint || config.jwks_uri) {
        setEndpointsLocked(true);
      }

      toast.success('OIDC configuration loaded successfully');
    } catch (error) {
      setEndpointsLocked(false); // Unlock on error
      console.error('Error fetching OIDC configuration:', error);
      toast.error('Failed to fetch OIDC configuration');
    } finally {
      setIsLoadingDiscovery(false);
    }
  };

  const handleSubmit = () => {
    // Validate form
    if (!isDemoMode) {
      if (!authEndpoint) {
        toast.error('Authorization endpoint is required');
        return;
      }
      if (!tokenEndpoint) {
        toast.error('Token endpoint is required');
        return;
      }
    }

    if (!clientId) {
      toast.error('Client ID is required');
      return;
    }

    const config: OAuthConfig = {
      // Removed flowType property
      issuerUrl: isDemoMode ? undefined : issuerUrl,
      authEndpoint: isDemoMode ? undefined : authEndpoint,
      tokenEndpoint: isDemoMode ? undefined : tokenEndpoint,
      jwksEndpoint: isDemoMode ? undefined : jwksEndpoint,
      clientId,
      redirectUri,
      scopes: scopes.split(' ').filter(Boolean),
      demoMode: isDemoMode
    };

    const pkce: PkceParams = {
      codeVerifier,
      codeChallenge,
      state
    };

    onConfigComplete(config, pkce);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>OAuth 2.0 Flow Configuration</CardTitle>
        <CardDescription>
          Configure your OAuth 2.0 flow parameters. You can either connect to your own IdP or use the demo mode.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {/* Demo Mode Toggle - Updated Styling */}
          <div className="flex items-center space-x-2 mb-4 p-3 border rounded-md bg-muted/50">
            <Switch
              id="demo-mode-switch"
              checked={isDemoMode}
              onCheckedChange={setIsDemoMode}
            />
            <Label htmlFor="demo-mode-switch" className="mb-0"> {/* Remove bottom margin from label */}
              Demo Mode
              <p className="text-xs text-muted-foreground font-normal">
                Use a simulated Identity Provider for testing
              </p>
            </Label>
          </div>

          {/* Configuration based on mode */}
          {!isDemoMode ? (
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="text-lg font-medium">Identity Provider Details</h3>
              {/* Issuer URL for Auto-Discovery */}
              <div className="space-y-2">
                <Label>Issuer URL (for Auto-Discovery)</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="https://example.com"
                    value={issuerUrl}
                    onChange={(e) => {
                      setIssuerUrl(e.target.value);
                      // Clear endpoints if issuer changes, allowing manual input or re-discovery
                      setAuthEndpoint('');
                      setTokenEndpoint('');
                      setJwksEndpoint('');
                      setEndpointsLocked(false);
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={fetchOidcConfig}
                    disabled={isLoadingDiscovery || !issuerUrl}
                  >
                    {isLoadingDiscovery ? "Loading..." : "Discover"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter the base URL of your IdP to attempt auto-discovery of endpoints via OIDC .well-known configuration.
                </p>
              </div>

              {/* Manual/Discovered Endpoints */}
              <div className="space-y-2">
                <Label>Authorization Endpoint</Label>
                <Input
                  placeholder="https://example.com/authorize"
                  value={authEndpoint}
                  onChange={(e) => setAuthEndpoint(e.target.value)}
                  readOnly={endpointsLocked}
                />
                 <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>Required endpoint for starting the authorization flow.</span>
                  {endpointsLocked ? <Badge variant="secondary">Auto-discovered</Badge> : <span>(Enter manually if not discovered)</span>}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Token Endpoint</Label>
                <Input
                  placeholder="https://example.com/token"
                  value={tokenEndpoint}
                  onChange={(e) => setTokenEndpoint(e.target.value)}
                  readOnly={endpointsLocked}
                />
                 <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>Required endpoint for exchanging the authorization code for tokens.</span>
                  {endpointsLocked ? <Badge variant="secondary">Auto-discovered</Badge> : <span>(Enter manually if not discovered)</span>}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>JWKS Endpoint (Optional)</Label>
                <Input
                  placeholder="https://example.com/.well-known/jwks.json"
                  value={jwksEndpoint}
                  onChange={(e) => setJwksEndpoint(e.target.value)}
                  readOnly={endpointsLocked}
                />
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>Endpoint for retrieving public keys to validate token signatures.</span>
                  {endpointsLocked ? <Badge variant="secondary">Auto-discovered</Badge> : <span>(Enter manually if not discovered)</span>}
                </p>
              </div>
            </div>
          ) : (
            // Removed the empty div that previously held the static message
            null // Or simply remove the entire else block if nothing else goes here
          )}

          {/* Common Configuration */}
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input
              placeholder={isDemoMode ? "demo-client" : "Your client ID"}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {isDemoMode 
                ? "Any value is accepted in demo mode" 
                : "The client ID registered with your Identity Provider"}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Redirect URI</Label>
            <Input
              value={redirectUri}
              readOnly // Make the input read-only
              // onChange removed
            />
            <p className="text-sm text-muted-foreground">
              {isDemoMode
                ? "The URI where the demo server sends the response."
                : "This is the required Redirect URI. You MUST register this exact URI with your Identity Provider for this client."}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Scopes</Label>
            <Input
              placeholder="openid profile email"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Space-separated OAuth scopes
            </p>
          </div>

          {/* PKCE Parameters */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">PKCE Parameters</h3>
              <Button type="button" variant="outline" onClick={regeneratePkce}>
                Regenerate
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Code Verifier</Label>
              <Input value={codeVerifier} readOnly />
              <p className="text-sm text-muted-foreground">
                Random string used to generate the code challenge
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Code Challenge (S256)</Label>
              <Input value={codeChallenge} readOnly />
              <p className="text-sm text-muted-foreground">
                SHA-256 hash of the code verifier, Base64URL encoded
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={state} readOnly />
              <p className="text-sm text-muted-foreground">
                Random value for CSRF protection
              </p>
            </div>
          </div>

          <Button type="button" onClick={handleSubmit}>
            Continue to Authorization
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ConfigurationForm;
