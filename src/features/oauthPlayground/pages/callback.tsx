import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CodeBlock } from '@/components/ui/code-block';
import { toast } from 'sonner';

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processingCallback, setProcessingCallback] = useState(true);
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  useEffect(() => {
    // Check for parent window to postMessage to
    if (window.opener && !window.opener.closed) {
      // Send message to opener with code or error
      window.opener.postMessage({
        type: 'oauth_callback',
        code,
        state,
        error,
        error_description: errorDescription
      }, window.location.origin);
      
      // Close the popup after sending the message
      window.close();
    } else {
      // Not in a popup, process normally
      setProcessingCallback(false);
      
      if (code) {
        toast.success('Authorization code received');
      } else if (error) {
        toast.error(`Authorization failed: ${errorDescription || error}`);
      }
    }
  }, [code, state, error, errorDescription]);
  
  const handleContinue = () => {
    // Get the stored flow path or default to the main OAuth Playground page
    const flowPath = localStorage.getItem('oauth_playground_flow_path') || '/oauth-playground';
    
    if (code) {
      // Navigate to the appropriate flow page with the code
      navigate(flowPath, { state: { code, state } });
    } else {
      // If there was an error, just go to the OAuth Playground home
      navigate('/oauth-playground');
    }
  };
  
  if (processingCallback) {
    return (
      <div className="container py-10 flex flex-col items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Processing OAuth Callback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p>Processing the authorization response...</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>
            {code ? 'Authorization Successful' : 'Authorization Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {code ? (
            <>
              <div className="rounded-md bg-muted p-4 space-y-2">
                <h3 className="text-sm font-medium">Authorization Code</h3>
                <CodeBlock code={code} language="text" />
              </div>
              
              {state && (
                <div className="rounded-md bg-muted p-4 space-y-2">
                  <h3 className="text-sm font-medium">State</h3>
                  <CodeBlock code={state} language="text" />
                </div>
              )}
              
              <p className="text-muted-foreground text-sm">
                The authorization code has been received. Click continue to proceed
                to the token exchange step.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-md bg-destructive/10 p-4 space-y-2">
                <h3 className="text-sm font-medium text-destructive">Error</h3>
                <p className="text-sm">{error}</p>
                {errorDescription && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-sm">{errorDescription}</p>
                  </>
                )}
              </div>
              
              <p className="text-muted-foreground text-sm">
                The authorization request failed. Click continue to return to the
                OAuth Playground and try again.
              </p>
            </>
          )}
          
          <div className="flex justify-end">
            <Button onClick={handleContinue}>
              Continue to OAuth Playground
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CallbackPage;
