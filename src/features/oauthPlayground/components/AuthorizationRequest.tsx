import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OAuthConfig, PkceParams } from '../utils/types';
import { CodeBlock } from '@/components/ui/code-block';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AuthorizationRequestProps {
  config: OAuthConfig;
  pkce: PkceParams;
  onAuthorizationComplete: (code: string) => void;
}

export function AuthorizationRequest({ config, pkce, onAuthorizationComplete }: AuthorizationRequestProps) {
  const [authUrl, setAuthUrl] = useState<string>('');
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  
  // Listen for messages from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Make sure the message is from our domain
      if (event.origin !== window.location.origin) return;
      
      // Check if it's our OAuth callback message
      if (event.data?.type === 'oauth_callback' && event.data?.code) {
        onAuthorizationComplete(event.data.code);
        
        // Close the popup if it's still open
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [authWindow, onAuthorizationComplete]);
  
  // Build the authorization URL
  useEffect(() => {
    const buildAuthorizationUrl = () => {
      let baseUrl: string;
      
      if (config.demoMode) {
        // In demo mode, use our custom demo auth page
        baseUrl = `${window.location.origin}/oauth-playground/demo-auth`;
      } else {
        // In real mode, use the configured auth endpoint
        baseUrl = config.authEndpoint!;
      }
      
      // Construct the authorization URL
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: 'S256',
        state: pkce.state,
      });
      
      // Add scopes
      if (config.scopes && config.scopes.length > 0) {
        params.set('scope', config.scopes.join(' '));
      }
      
      setAuthUrl(`${baseUrl}?${params.toString()}`);
    };
    
    buildAuthorizationUrl();
  }, [config, pkce]);
  
  // Launch the authorization request
  const launchAuthorization = () => {
    // Save the configuration and PKCE data to localStorage for retrieval after redirect
    localStorage.setItem('oauth_playground_config', JSON.stringify(config));
    localStorage.setItem('oauth_playground_pkce', JSON.stringify(pkce));
    
    // Store the current flow path to redirect back to the right flow page
    localStorage.setItem('oauth_playground_flow_path', window.location.pathname);
    
    // Open the authorization URL in a popup window
    const width = 600; // Reduced width
    const height = 724; // Reduced height
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    const features = `width=${width},height=${height},left=${left},top=${top}`;
    
    const popupWindow = window.open(authUrl, 'oauth-authorization', features);
    setAuthWindow(popupWindow);
    
    // Check if popup was blocked
    if (!popupWindow || popupWindow.closed || typeof popupWindow.closed === 'undefined') {
      // Popup was blocked, try redirecting instead
      window.location.href = authUrl;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Authorization Request</CardTitle>
        <CardDescription>
          This is the authorization request that will be sent to the identity provider.
          {config.demoMode && ' You will be using a simulated identity provider in demo mode.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted p-4">
          <h3 className="text-sm font-medium mb-2">Authorization URL</h3>
          <CodeBlock code={authUrl} language="text" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Request Parameters</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Parameter</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">response_type</TableCell>
                <TableCell>code</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">client_id</TableCell>
                <TableCell>{config.clientId}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">redirect_uri</TableCell>
                <TableCell>{config.redirectUri}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">code_challenge</TableCell>
                <TableCell>{pkce.codeChallenge.substring(0, 20)}...</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">code_challenge_method</TableCell>
                <TableCell>S256</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">state</TableCell>
                <TableCell>{pkce.state.substring(0, 8)}...</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">scope</TableCell>
                <TableCell>{config.scopes.join(' ')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        <div className="bg-muted/50 p-4 rounded-md">
          <h3 className="text-sm font-medium mb-2">What happens next?</h3>
          <p className="text-sm text-muted-foreground">
            Clicking the button below will open the authorization page from your identity provider.
            You'll need to authenticate and authorize the application, after which you'll be redirected
            back with an authorization code.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={launchAuthorization}
          disabled={!authUrl}
          className="w-full"
        >
          Launch Authorization Request
        </Button>
      </CardFooter>
    </Card>
  );
}

export default AuthorizationRequest;
