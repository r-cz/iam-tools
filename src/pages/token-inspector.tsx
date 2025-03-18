
import { Card, CardContent } from '@/components/ui/card';

export default function TokenInspectorPage() {
  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-semibold mb-4">Token Inspector</h2>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <label htmlFor="token-input" className="text-base font-medium">
              Enter JWT Token
            </label>
            <textarea
              id="token-input"
              className="w-full min-h-[100px] p-3 rounded-md bg-muted/30 border border-border"
              placeholder="Paste your JWT token here..."
            />
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md self-start">
              Decode Token
            </button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">Token Results</h3>
          <p className="text-muted-foreground">Token information will appear here after decoding.</p>
        </CardContent>
      </Card>
    </div>
  );
}
