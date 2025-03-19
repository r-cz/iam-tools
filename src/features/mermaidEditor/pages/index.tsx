import { Card, CardContent } from '@/components/ui/card';

export default function MermaidEditorPage() {
  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-semibold mb-4">Mermaid Diagram Editor</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <label htmlFor="mermaid-input" className="text-base font-medium">
                Mermaid Syntax
              </label>
              <textarea
                id="mermaid-input"
                className="w-full min-h-[300px] p-3 rounded-md bg-muted/30 border border-border font-mono text-sm"
                placeholder="Enter mermaid diagram syntax here..."
                defaultValue={`graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`}
              />
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md self-start">
                Render Diagram
              </button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <h3 className="text-base font-medium">Preview</h3>
              <div className="w-full min-h-[300px] rounded-md bg-muted/20 border border-border flex items-center justify-center">
                <p className="text-muted-foreground">Diagram preview will appear here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}