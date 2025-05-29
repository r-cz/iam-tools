import { DecodedSamlResponse } from "../utils/saml-decoder";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/common";

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
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Raw XML</h4>
          <CopyButton text={response.xml} showText={false} />
        </div>
        <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
          <code className="text-xs">{response.xml}</code>
        </pre>
      </div>
    </div>
  );
}