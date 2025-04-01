import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DemoAuthPage() {
  const [searchParams] = useSearchParams();
  
  // Extract OAuth parameters from URL
  const clientId = searchParams.get('client_id') || '';
  const redirectUri = searchParams.get('redirect_uri') || '';
  const state = searchParams.get('state') || '';
  const scope = searchParams.get('scope') || '';
  const codeChallenge = searchParams.get('code_challenge') || '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') || '';
  
  // Form state
  const [username, setUsername] = useState('demo-user');
  const [error, setError] = useState<string | null>(null);
  
  // Validate parameters
  useEffect(() => {
    if (!clientId) {
      setError('Missing client_id parameter');
    } else if (!redirectUri) {
      setError('Missing redirect_uri parameter');
    } else if (!codeChallenge) {
      setError('Missing code_challenge parameter');
    } else if (codeChallengeMethod !== 'S256') {
      setError('Unsupported code_challenge_method. Only S256 is supported.');
    }
  }, [clientId, redirectUri, codeChallenge, codeChallengeMethod]);
  
  // Handle login
  const handleLogin = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    // Generate a mock authorization code
    // In a real system, this would be a secure random value
    // and would be associated with the authenticated user
    const authCode = generateMockAuthCode(username, clientId);
    
    // Construct the redirect URL with the code
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    
    // Add state if provided
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }
    
    // Redirect back to the client
    window.location.href = redirectUrl.toString();
  };
  
  // Generate a mock authorization code
  const generateMockAuthCode = (username: string, clientId: string): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${username}-${clientId.substring(0, 4)}-${random}`;
  };
  
  // Handle deny
  const handleDeny = () => {
    // Construct the redirect URL with the error
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_description', 'The user denied the authorization request');
    
    // Add state if provided
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }
    
    // Redirect back to the client
    window.location.href = redirectUrl.toString();
  };
  
  return (
    <div className="container py-10 flex flex-col items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Demo Identity Provider</CardTitle>
          <CardDescription>
            This is a simulated login page for demonstration purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Authorization Request</h3>
                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p><strong>Client ID:</strong> {clientId}</p>
                  {scope && <p><strong>Requested Scopes:</strong> {scope}</p>}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value="demo-password"
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is a demo - no real password needed
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={handleDeny}
              disabled={!!error}
            >
              Deny
            </Button>
            <Button 
              onClick={handleLogin}
              disabled={!!error}
            >
              Authorize
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground pt-2">
            This is a simulated authorization server for demonstration purposes only.
            No actual authentication is performed.
          </p>
        </CardFooter>
      </Card>
      
      <div className="mt-8 w-full max-w-md">
        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="details">Request Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="p-4 bg-card rounded-md border mt-2">
            <h3 className="font-medium mb-2">About Demo Mode</h3>
            <p className="text-sm text-muted-foreground">
              This is a simulated OAuth authorization server for educational purposes.
              It demonstrates the OAuth authorization flow without requiring a real IdP.
              Click "Authorize" to simulate a successful authentication and proceed with the flow.
            </p>
          </TabsContent>
          
          <TabsContent value="details" className="p-4 bg-card rounded-md border mt-2">
            <h3 className="font-medium mb-2">Request Parameters</h3>
            <div className="space-y-1 text-sm">
              <p><strong>client_id:</strong> {clientId}</p>
              <p><strong>redirect_uri:</strong> {redirectUri}</p>
              <p><strong>state:</strong> {state}</p>
              <p><strong>scope:</strong> {scope}</p>
              <p><strong>code_challenge:</strong> {codeChallenge}</p>
              <p><strong>code_challenge_method:</strong> {codeChallengeMethod}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default DemoAuthPage;
