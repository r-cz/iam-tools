import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// Removed Tabs imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../utils/pkce';
import { proxyFetch } from '@/lib/proxy-fetch';
import { OAuthConfig, PkceParams } from '../utils/types'; // Removed OAuthFlowType import
import { toast } from 'sonner';
import { IssuerHistory, FormFieldInput, DemoModeToggle } from '@/components/common';
import { useIssuerHistory } from '@/lib/state';

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
  const { addIssuer } = useIssuerHistory();

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
  
  // Handle selecting an issuer from the history
  const handleSelectIssuer = (issuerUrl: string) => {
    setIssuerUrl(issuerUrl);
    // Clear endpoints when issuer changes
    setAuthEndpoint('');
    setTokenEndpoint('');
    setJwksEndpoint('');
    setEndpointsLocked(false);
    // Fetch config from the selected issuer
    setTimeout(() => fetchOidcConfig(), 0);
  };

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
        // Add to issuer history if discovery was successful
        addIssuer(issuerUrl);
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

    // In demo mode, use default client ID if none provided
    let finalClientId = clientId;
    if (isDemoMode && !clientId) {
      finalClientId = 'demo-client';
    } else if (!isDemoMode && !clientId) {
      toast.error('Client ID is required');
      return;
    }

    const config: OAuthConfig = {
      // Removed flowType property
      issuerUrl: isDemoMode ? undefined : issuerUrl,
      authEndpoint: isDemoMode ? undefined : authEndpoint,
      tokenEndpoint: isDemoMode ? undefined : tokenEndpoint,
      jwksEndpoint: isDemoMode ? undefined : jwksEndpoint,
      clientId: finalClientId,
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
          <div className="mb-4 p-3 border rounded-md bg-muted/50">
            <DemoModeToggle
              id="demo-mode-switch"
              checked={isDemoMode}
              onCheckedChange={setIsDemoMode}
              description="Use a simulated Identity Provider for testing"
            />
          </div>

          {/* Configuration based on mode */}
          {!isDemoMode ? (
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="text-lg font-medium">Identity Provider Details</h3>
              {/* Issuer URL for Auto-Discovery */}
              <div className="space-y-2">
                <Label>Issuer URL (for Auto-Discovery)</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
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
                      className="pr-10"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <IssuerHistory 
                        onSelectIssuer={handleSelectIssuer} 
                        compact={true}
                      />
                    </div>
                  </div>
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
              <FormFieldInput
                label="Authorization Endpoint"
                placeholder="https://example.com/authorize"
                value={authEndpoint}
                onChange={(e) => setAuthEndpoint(e.target.value)}
                readOnly={endpointsLocked}
                description={
                  <span className="flex items-center gap-2">
                    <span>Required endpoint for starting the authorization flow.</span>
                    {endpointsLocked ? <Badge variant="secondary">Auto-discovered</Badge> : <span>(Enter manually if not discovered)</span>}
                  </span>
                }
              />
              
              <FormFieldInput
                label="Token Endpoint"
                placeholder="https://example.com/token"
                value={tokenEndpoint}
                onChange={(e) => setTokenEndpoint(e.target.value)}
                readOnly={endpointsLocked}
                description={
                  <span className="flex items-center gap-2">
                    <span>Required endpoint for exchanging the authorization code for tokens.</span>
                    {endpointsLocked ? <Badge variant="secondary">Auto-discovered</Badge> : <span>(Enter manually if not discovered)</span>}
                  </span>
                }
              />
              
              <FormFieldInput
                label="JWKS Endpoint (Optional)"
                placeholder="https://example.com/.well-known/jwks.json"
                value={jwksEndpoint}
                onChange={(e) => setJwksEndpoint(e.target.value)}
                readOnly={endpointsLocked}
                description={
                  <span className="flex items-center gap-2">
                    <span>Endpoint for retrieving public keys to validate token signatures.</span>
                    {endpointsLocked ? <Badge variant="secondary">Auto-discovered</Badge> : <span>(Enter manually if not discovered)</span>}
                  </span>
                }
              />
            </div>
          ) : (
            // Removed the empty div that previously held the static message
            null // Or simply remove the entire else block if nothing else goes here
          )}

          {/* Common Configuration */}
          <FormFieldInput
            label="Client ID"
            placeholder={isDemoMode ? "demo-client" : "Your client ID"}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            description={isDemoMode 
              ? "Any value is accepted in demo mode" 
              : "The client ID registered with your Identity Provider"}
          />
          
          <FormFieldInput
            label="Redirect URI"
            value={redirectUri}
            readOnly
            description={isDemoMode
              ? "The URI where the demo server sends the response."
              : "This is the required Redirect URI. You MUST register this exact URI with your Identity Provider for this client."}
          />
          
          <FormFieldInput
            label="Scopes"
            placeholder="openid profile email"
            value={scopes}
            onChange={(e) => setScopes(e.target.value)}
            description="Space-separated OAuth scopes"
          />

          {/* PKCE Parameters */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">PKCE Parameters</h3>
              <Button type="button" variant="outline" onClick={regeneratePkce}>
                Regenerate
              </Button>
            </div>
            
            <FormFieldInput
              label="Code Verifier"
              value={codeVerifier}
              readOnly
              description="Random string used to generate the code challenge"
            />
            
            <FormFieldInput
              label="Code Challenge (S256)"
              value={codeChallenge}
              readOnly
              description="SHA-256 hash of the code verifier, Base64URL encoded"
            />
            
            <FormFieldInput
              label="State"
              value={state}
              readOnly
              description="Random value for CSRF protection"
            />
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
