
import { Button } from "@/components/ui/button";
import { generateFreshToken } from "../utils/generate-token";

interface TokenInputProps {
  token: string;
  setToken: (token: string) => void;
  onDecode: () => void;
}

export function TokenInput({ token, setToken, onDecode }: TokenInputProps) {
  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setToken(clipboardText.trim());
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      alert("Unable to access clipboard. Please paste the token manually.");
    }
  };

  const handleClear = () => {
    setToken("");
  };

  const loadExampleToken = () => {
    // Generate a fresh token with current timestamps
    const freshToken = generateFreshToken();
    setToken(freshToken);
  };

  return (
    <div className="space-y-4">
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
          >
            Example
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleClear}
          >
            Clear
          </Button>
        </div>
      </div>
      
      <textarea
        id="token-input"
        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      />
      
      {token && (
        <div className="flex justify-end mt-1">
          <div className="text-xs text-muted-foreground">
            Characters: {token.length}
          </div>
        </div>
      )}
      
      <div className="flex justify-end">
        <Button 
          onClick={onDecode}
          disabled={!token}
          className="w-full sm:w-auto"
        >
          Inspect Token
        </Button>
      </div>
    </div>
  );
}
