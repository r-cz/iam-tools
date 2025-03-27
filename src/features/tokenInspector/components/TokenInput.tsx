
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { generateFreshToken } from "../utils/generate-token";
import { useState } from "react";
import { toast } from "sonner";
import { DEMO_JWKS } from "@/lib/jwt/demo-key";

interface TokenInputProps {
  token: string;
  setToken: (token: string) => void;
  onDecode: () => void;
  onReset: () => void;
  onJwksResolved?: (jwks: any) => void; // Optional callback for JWKS
}

export function TokenInput({ 
  token, 
  setToken, 
  onDecode, 
  onReset,
  onJwksResolved
}: TokenInputProps) {
  const [isLoadingExample, setIsLoadingExample] = useState(false);
  const [isExampleToken, setIsExampleToken] = useState(false);

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setToken(clipboardText.trim());
      setIsExampleToken(false);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      alert("Unable to access clipboard. Please paste the token manually.");
    }
  };

  const handleReset = () => {
    setIsExampleToken(false);
    onReset();
  };

  const loadExampleToken = async () => {
    setIsLoadingExample(true);
    try {
      // Generate a fresh token with current timestamps
      const freshToken = await generateFreshToken();
      
      // Log token details
      const payload = JSON.parse(
        atob(freshToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      console.log("Generated example token with issuer:", payload.iss);
      
      setToken(freshToken);
      setIsExampleToken(true);
      
      // If we have an onJwksResolved callback, provide the demo JWKS directly
      if (onJwksResolved) {
        console.log('Providing demo JWKS directly to parent component:', DEMO_JWKS);
        onJwksResolved(DEMO_JWKS);
      }
      
      // Success message
      toast.success(
        "Example token generated successfully",
        {
          id: 'example-token-success',
          duration: 3000,
        }
      );
    } catch (error) {
      console.error("Error generating example token:", error);
      toast.error(
        "Error generating example token. Please try again.",
        {
          id: 'example-token-error',
          duration: 5000,
        }
      );
    } finally {
      setIsLoadingExample(false);
    }
  };
  
  const showJwks = () => {
    // Show the JWKS formatted as JSON in a toast message
    toast.info(
      <div className="space-y-2">
        <p><strong>Demo JWKS</strong></p>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(DEMO_JWKS, null, 2)}
        </pre>
        <p className="text-xs">
          This is the JWKS that contains the public key to verify demo token signatures.
          You can use this in the "Manual Entry" option of the JWKS resolver.
        </p>
      </div>,
      {
        id: 'demo-jwks',
        duration: 10000,
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <label htmlFor="token-input" className="block text-sm font-medium">
          OAuth/OIDC Token
        </label>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePaste}
          >
            Paste
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadExampleToken}
            disabled={isLoadingExample}
          >
            {isLoadingExample ? "Loading..." : "Example"}
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>
      
      {isExampleToken && (
        <Alert variant="info" className="my-2 py-2">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            This is an example token with a simulated signature. Since it's for demo purposes, 
            you can validate it using the simulated JWKS provided by this tool.
            <Button 
              variant="link" 
              size="sm" 
              onClick={showJwks} 
              className="px-0 h-auto font-normal"
            >
              View JWKS
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <textarea
        id="token-input"
        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
          setIsExampleToken(false); // Reset example status when manually edited
        }}
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      />
      
      <div className="flex justify-between items-center">
        {token && (
          <Badge variant="secondary" className="font-mono">
            Characters: {token.length}
          </Badge>
        )}
        {!token && <div />}
        <Button 
          onClick={onDecode}
          disabled={!token}
          className="w-auto"
        >
          Inspect Token
        </Button>
      </div>
    </div>
  );
}
