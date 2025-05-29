import { DecodedSamlResponse } from "../utils/saml-decoder";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle, Info } from "lucide-react";

interface SignatureDisplayProps {
  response: DecodedSamlResponse;
}

export function SignatureDisplay({ response }: SignatureDisplayProps) {
  const hasAnySignature = response.hasSignature || response.assertions.some(a => a.hasSignature);

  if (!hasAnySignature) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This SAML Response and its assertions are not signed.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Response Signature */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <h4 className="text-sm font-medium">Response Signature</h4>
        </div>
        <div className="ml-6">
          {response.hasSignature ? (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
              Response is signed
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-500/20 text-gray-700">
              Response is not signed
            </Badge>
          )}
        </div>
      </div>

      {/* Assertion Signatures */}
      {response.assertions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Assertion Signatures</h4>
          <div className="ml-6 space-y-2">
            {response.assertions.map((assertion, index) => (
              <div key={assertion.id} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Assertion #{index + 1}:</span>
                {assertion.hasSignature ? (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
                    Signed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-500/20 text-gray-700">
                    Not signed
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Signature validation requires the IdP's public key or certificate. 
          This tool currently shows signature presence only. 
          Full signature validation will be added in a future update.
        </AlertDescription>
      </Alert>
    </div>
  );
}