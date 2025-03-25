
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
