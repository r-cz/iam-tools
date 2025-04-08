import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [redirectUri, setRedirectUri] = useState<string>(`${window.location.origin}/oauth-playground/callback`);
  const [scopes, setScopes] = useState<string>('openid profile email');
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  
  // Generate PKCE values
  const [codeVerifier, setCodeVerifier] = useState<string>('');
  const [codeChallenge, setCodeChallenge] = useState<string>('');
  const [state, setState] = useState<string>('');

  useEffect(() => {
    // Generate initial PKCE values
    regeneratePkce();
  }, []);

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
      if (config.token_endpoint) setTokenEndpoint(config.token_endpoint);
      if (config.jwks_uri) setJwksEndpoint(config.jwks_uri);

      toast.success('OIDC configuration loaded successfully');
    } catch (error) {
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
          {/* Flow Type Selection Removed */}

          {/* Demo Mode Toggle */}
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Demo Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use a simulated Identity Provider for testing
              </p>
            </div>
            <Switch
              checked={isDemoMode}
              onCheckedChange={setIsDemoMode}
            />
          </div>

          {/* Configuration based on mode */}
          {!isDemoMode ? (
            <Tabs defaultValue="discover" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="discover">Auto-discover</TabsTrigger>
                <TabsTrigger value="manual">Manual Configuration</TabsTrigger>
              </TabsList>
              
              <TabsContent value="discover">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Issuer URL</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="https://example.com"
                        value={issuerUrl}
                        onChange={(e) => setIssuerUrl(e.target.value)}
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
                      The base URL of your Identity Provider
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="manual">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Authorization Endpoint</Label>
                    <Input
                      placeholder="https://example.com/authorize"
                      value={authEndpoint}
                      onChange={(e) => setAuthEndpoint(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Token Endpoint</Label>
                    <Input
                      placeholder="https://example.com/token"
                      value={tokenEndpoint}
                      onChange={(e) => setTokenEndpoint(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>JWKS Endpoint (Optional)</Label>
                    <Input
                      placeholder="https://example.com/jwks"
                      value={jwksEndpoint}
                      onChange={(e) => setJwksEndpoint(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Used for validating token signatures
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Demo mode enabled. A mock OAuth server will be used.
              </p>
            </div>
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
              onChange={(e) => setRedirectUri(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {isDemoMode 
                ? "Any URL is accepted in demo mode" 
                : "Must match a redirect URI registered with your Identity Provider"}
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
