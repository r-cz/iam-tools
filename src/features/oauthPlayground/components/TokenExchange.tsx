import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signToken } from '@/lib/jwt/sign-token';
import { DEMO_JWKS } from '@/lib/jwt/demo-key';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OAuthConfig, PkceParams, TokenResponse } from '../utils/types';
import { CodeBlock } from '@/components/ui/code-block';
import { proxyFetch } from '@/lib/proxy-fetch';
import { toast } from 'sonner';

interface TokenExchangeProps {
  config: OAuthConfig;
  pkce: PkceParams;
  authorizationCode: string;
  onTokenExchangeComplete: (tokenResponse: TokenResponse) => void;
}

export function TokenExchange({ 
  config, 
  pkce, 
  authorizationCode, 
  onTokenExchangeComplete 
}: TokenExchangeProps) {
  const navigate = useNavigate();
  const [isExchanging, setIsExchanging] = useState<boolean>(false);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);
  const [tokenRequestPayload, setTokenRequestPayload] = useState<string>('');
  
  // Create token request payload
  useEffect(() => {
    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      code_verifier: pkce.codeVerifier
    });
    
    setTokenRequestPayload(payload.toString());
  }, [authorizationCode, config.clientId, config.redirectUri, pkce.codeVerifier]);
  
  const exchangeToken = async () => {
    setIsExchanging(true);
    
    try {
      if (config.demoMode) {
        // In demo mode, generate tokens locally instead of making a server request
        const demoTokenResponse = await generateDemoTokens(authorizationCode, config.clientId);
        setTokenResponse(demoTokenResponse);
        onTokenExchangeComplete(demoTokenResponse);
        toast.success('Successfully exchanged code for tokens (demo mode)');
      } else {
        // Real mode - use the token endpoint from the config
        const tokenEndpoint = config.tokenEndpoint!;
        
        // Create token request payload
        const payload = new URLSearchParams({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          code_verifier: pkce.codeVerifier
        });
        
        // Make the token request
        const response = await proxyFetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: payload
        });
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error_description || data.error);
        }
        
        // Process token response
        const tokenData: TokenResponse = {
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in: data.expires_in,
          refresh_token: data.refresh_token,
          id_token: data.id_token,
          scope: data.scope
        };
        
        setTokenResponse(tokenData);
        onTokenExchangeComplete(tokenData);
        toast.success('Successfully exchanged code for tokens');
      }
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      toast.error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExchanging(false);
    }
  };

  // Generate demo tokens for the demo mode
  const generateDemoTokens = async (code: string, clientId: string): Promise<TokenResponse> => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Create a JWT payload for access token
      const accessTokenPayload = {
        iss: `${window.location.origin}/oauth-playground`,
        sub: 'demo-user',
        aud: clientId,
        exp: currentTime + 3600, // Expires in 1 hour
        iat: currentTime,
        name: 'Demo User',
        email: 'demo@example.com',
        preferred_username: 'demouser',
        scope: 'openid profile email',
        is_demo_token: true // Mark as demo token for verification
      };
      
      // Create a JWT payload for ID token
      const idTokenPayload = {
        ...accessTokenPayload,
        auth_time: currentTime,
        nonce: code.substring(0, 8), // Use part of the code as a nonce
      };
      
      // Use our token signing utility to create properly signed tokens
      const accessToken = await signToken(accessTokenPayload);
      const idToken = await signToken(idTokenPayload);
      
      // Generate a random refresh token
      const refreshToken = `refresh-token-${Math.random().toString(36).substring(2)}`;
      
      console.log('Generated properly signed demo tokens with kid:', DEMO_JWKS.keys[0].kid);
      
      return {
        access_token: accessToken,
        id_token: idToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email'
      };
    } catch (error) {
      console.error('Error generating demo tokens:', error);
      throw new Error('Failed to generate demo tokens');
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Token Exchange</CardTitle>
        <CardDescription>
          Exchange the authorization code for access and ID tokens using the PKCE code verifier.
          {config.demoMode && ' Demo mode: tokens will be generated locally.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Authorization Code</h3>
          <CodeBlock code={authorizationCode} language="text" />
          
          <h3 className="text-sm font-medium">Token Request</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Endpoint:</strong> {config.demoMode ? 'Demo Token Endpoint (Simulated)' : config.tokenEndpoint}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Method:</strong> POST
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Content-Type:</strong> application/x-www-form-urlencoded
            </p>
            <CodeBlock code={tokenRequestPayload} language="text" />
          </div>
        </div>
        
        {tokenResponse && (
          <Tabs defaultValue="formatted">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="formatted">Formatted</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>
            
            <TabsContent value="formatted">
              <div className="space-y-4">
                {tokenResponse.access_token && (
                  <div>
                    <h3 className="text-sm font-medium">Access Token</h3>
                    <div className="max-h-40 overflow-auto">
                      <CodeBlock code={tokenResponse.access_token} language="text" />
                    </div>
                  </div>
                )}
                
                {tokenResponse.id_token && (
                  <div>
                    <h3 className="text-sm font-medium">ID Token</h3>
                    <div className="max-h-40 overflow-auto">
                      <CodeBlock code={tokenResponse.id_token} language="text" />
                    </div>
                  </div>
                )}
                
                {tokenResponse.refresh_token && (
                  <div>
                    <h3 className="text-sm font-medium">Refresh Token</h3>
                    <div className="max-h-40 overflow-auto">
                      <CodeBlock code={tokenResponse.refresh_token} language="text" />
                    </div>
                  </div>
                )}
                
                <div className="bg-muted rounded-md p-3">
                  <h3 className="text-sm font-medium mb-2">Token Details</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Token Type:</strong> {tokenResponse.token_type}</li>
                    {tokenResponse.expires_in && (
                      <li><strong>Expires In:</strong> {tokenResponse.expires_in} seconds</li>
                    )}
                    {tokenResponse.scope && (
                      <li><strong>Scope:</strong> {tokenResponse.scope}</li>
                    )}
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="raw">
              <CodeBlock 
                code={JSON.stringify(tokenResponse, null, 2)} 
                language="json" 
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter>
        {!tokenResponse ? (
          <Button 
            onClick={exchangeToken} 
            disabled={isExchanging}
            className="w-full"
          >
            {isExchanging ? 'Exchanging...' : 'Exchange Code for Tokens'}
          </Button>
        ) : (
          <div className="w-full space-y-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // Use React Router navigation for a smoother experience
                if (tokenResponse.access_token) {
                  navigate(`/token-inspector?token=${encodeURIComponent(tokenResponse.access_token)}`);
                }
              }}
            >
              Inspect Access Token
            </Button>
            
            {tokenResponse.id_token && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  // Use React Router navigation for a smoother experience
                  navigate(`/token-inspector?token=${encodeURIComponent(tokenResponse.id_token)}`);
                }}
              >
                Inspect ID Token
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default TokenExchange;
