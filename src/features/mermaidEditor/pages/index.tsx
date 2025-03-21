import { Card, CardContent } from '@/components/ui/card';
import { PageContainer, PageHeader } from '@/components/page';
import { GitBranch } from 'lucide-react';

export default function MermaidEditorPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Mermaid Diagram Editor"
        description="Create and preview diagrams using the Mermaid syntax. Generate flowcharts, sequence diagrams, class diagrams, and more."
        icon={GitBranch}
      />
      
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
    </PageContainer>
  );
}