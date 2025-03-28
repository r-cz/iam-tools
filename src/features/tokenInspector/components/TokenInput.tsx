
import React, { useState } from "react";
import Editor from "react-simple-code-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { generateFreshToken } from "../utils/generate-token";
import { toast } from "sonner";
import { DEMO_JWKS } from "@/lib/jwt/demo-key";
import { cn } from "@/lib/utils"; // Import cn utility

interface TokenInputProps {
  token: string;
  setToken: (token: string) => void;
  onDecode: () => void;
  onReset: () => void;
  onJwksResolved?: (jwks: any) => void; // Optional callback for JWKS
}

// Highlighting function for JWT parts
const highlightJwt = (code: string): React.ReactNode => {
  const parts = code.split('.');
  if (parts.length !== 3) {
    // Not a standard JWT structure, return as is or with basic styling
    return code; 
  }

  return (
    <>
      <span className="jwt-header">{parts[0]}</span>
      <span className="jwt-dot">.</span>
      <span className="jwt-payload">{parts[1]}</span>
      <span className="jwt-dot">.</span>
      <span className="jwt-signature">{parts[2]}</span>
    </>
  );
};


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
        <Alert className="my-2 py-2 bg-blue-500/10 border-blue-500/20 text-blue-700">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            This is an example token using this site's demo endpoints. The key format is verified against our JWKS.
          </AlertDescription>
        </Alert>
      )}

      {/* Replace textarea with react-simple-code-editor */}
      <div className={cn(
        "relative min-h-[100px] w-full rounded-md border border-input bg-background text-sm font-mono",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2" // Add focus ring styling
      )}>
        <Editor
          value={token}
          onValueChange={(code) => {
            setToken(code);
            setIsExampleToken(false); // Reset example status when manually edited
          }}
          highlight={highlightJwt}
          padding={10} // Corresponds roughly to px-3 py-2
          textareaId="token-input"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          style={{
            fontFamily: 'monospace',
            fontSize: '0.875rem', // text-sm
            lineHeight: '1.25rem',
            outline: 'none', // Remove default editor outline
            minHeight: '100px',
          }}
          // Apply necessary classes for styling consistency
          className="caret-foreground" // Use foreground color for caret
        />
      </div>

      <div className="flex justify-between items-center mt-1"> {/* Added small top margin */}
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
