import { DecodedSamlResponse } from "../utils/saml-decoder";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/common";
import { CodeBlock } from "@/components/ui/code-block";

interface ResponseDisplayProps {
  response: DecodedSamlResponse;
}

export function ResponseDisplay({ response }: ResponseDisplayProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatXml = (xml: string): string => {
    try {
      // Parse the XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      
      // Check for parsing errors
      if (xmlDoc.querySelector('parsererror')) {
        return xml; // Return original if parsing fails
      }
      
      // Format the XML with proper indentation
      const serializer = new XMLSerializer();
      const formatted = serializer.serializeToString(xmlDoc);
      
      // Add indentation
      let indent = 0;
      const lines = formatted
        .replace(/></g, '>\n<')
        .split('\n')
        .map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('</')) {
            indent = Math.max(0, indent - 2);
          }
          const indented = ' '.repeat(indent) + trimmed;
          if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
            indent += 2;
          }
          return indented;
        });
      
      return lines.join('\n');
    } catch {
      return xml; // Return original if formatting fails
    }
  };

  return (
    <div className="space-y-4">
      {/* Response Details */}
      <div className="space-y-3">
        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
          <span className="text-sm font-medium text-muted-foreground">Response ID:</span>
          <div className="flex items-center gap-2">
            <code className="text-sm break-all">{response.responseId}</code>
            <CopyButton text={response.responseId} showText={false} />
          </div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
          <span className="text-sm font-medium text-muted-foreground">Issuer:</span>
          <div className="flex items-center gap-2">
            <code className="text-sm break-all">{response.issuer}</code>
            <CopyButton text={response.issuer} showText={false} />
          </div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
          <span className="text-sm font-medium text-muted-foreground">Issue Time:</span>
          <span className="text-sm">{formatDate(response.issueInstant)}</span>
        </div>

        {response.destination && (
          <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
            <span className="text-sm font-medium text-muted-foreground">Destination:</span>
            <code className="text-sm break-all">{response.destination}</code>
          </div>
        )}

        {response.inResponseTo && (
          <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
            <span className="text-sm font-medium text-muted-foreground">In Response To:</span>
            <code className="text-sm break-all">{response.inResponseTo}</code>
          </div>
        )}

        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={response.status === "Success" ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"}
            >
              {response.status}
            </Badge>
            {response.statusMessage && (
              <span className="text-sm text-muted-foreground">{response.statusMessage}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
          <span className="text-sm font-medium text-muted-foreground">Assertions:</span>
          <span className="text-sm">{response.assertions.length} assertion(s) found</span>
        </div>
      </div>

      {/* Raw XML */}
      <div className="mt-6">
        <CodeBlock code={formatXml(response.xml)} language="xml" />
      </div>
    </div>
  );
}