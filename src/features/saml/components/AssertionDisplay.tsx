import { DecodedSamlResponse } from "../utils/saml-decoder";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/common";
import { User, Clock, Shield, Key } from "lucide-react";

interface AssertionDisplayProps {
  response: DecodedSamlResponse;
}

export function AssertionDisplay({ response }: AssertionDisplayProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getAuthContextDisplay = (context?: string) => {
    if (!context) return context;
    const match = context.match(/:([^:]+)$/);
    return match ? match[1] : context;
  };

  if (response.assertions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No assertions found in this SAML Response
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {response.assertions.map((assertion, index) => (
        <div key={assertion.id} className="space-y-4">
          {index > 0 && <Separator className="my-6" />}
          
          {/* Assertion Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">Assertion #{index + 1}</h4>
              {assertion.hasSignature && (
                <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
                  <Shield className="mr-1 h-3 w-3" />
                  Signed
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-[100px_1fr] gap-2 items-start text-sm">
              <span className="font-medium text-muted-foreground">ID:</span>
              <div className="flex items-center gap-2">
                <code className="break-all">{assertion.id}</code>
                <CopyButton text={assertion.id} showText={false} />
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] gap-2 items-start text-sm">
              <span className="font-medium text-muted-foreground">Issuer:</span>
              <code className="break-all">{assertion.issuer}</code>
            </div>

            <div className="grid grid-cols-[100px_1fr] gap-2 items-start text-sm">
              <span className="font-medium text-muted-foreground">Issued:</span>
              <span>{formatDate(assertion.issueInstant)}</span>
            </div>
          </div>

          {/* Subject */}
          {assertion.subject && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                <span>Subject</span>
              </div>
              <div className="ml-6 space-y-2">
                {assertion.subject.nameId && (
                  <div className="grid grid-cols-[100px_1fr] gap-2 items-start text-sm">
                    <span className="text-muted-foreground">Name ID:</span>
                    <code className="break-all">{assertion.subject.nameId}</code>
                  </div>
                )}
                {assertion.subject.nameIdFormat && (
                  <div className="grid grid-cols-[100px_1fr] gap-2 items-start text-sm">
                    <span className="text-muted-foreground">Format:</span>
                    <code className="break-all text-xs">{assertion.subject.nameIdFormat}</code>
                  </div>
                )}
                {assertion.subject.confirmations?.map((conf, i) => (
                  <div key={i} className="mt-2 space-y-1">
                    <div className="text-sm text-muted-foreground">Confirmation #{i + 1}</div>
                    {conf.notOnOrAfter && (
                      <div className="ml-4 text-sm">
                        <span className="text-muted-foreground">Not On/After:</span> {formatDate(conf.notOnOrAfter)}
                      </div>
                    )}
                    {conf.recipient && (
                      <div className="ml-4 text-sm">
                        <span className="text-muted-foreground">Recipient:</span> <code className="text-xs">{conf.recipient}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditions */}
          {assertion.conditions && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                <span>Conditions</span>
              </div>
              <div className="ml-6 space-y-2">
                {assertion.conditions.notBefore && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Not Before:</span> {formatDate(assertion.conditions.notBefore)}
                  </div>
                )}
                {assertion.conditions.notOnOrAfter && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Not On/After:</span> {formatDate(assertion.conditions.notOnOrAfter)}
                  </div>
                )}
                {assertion.conditions.audiences && assertion.conditions.audiences.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Audiences:</div>
                    {assertion.conditions.audiences.map((aud, i) => (
                      <div key={i} className="ml-4">
                        <code className="text-xs">{aud}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Authentication Statement */}
          {assertion.authnStatement && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-4 w-4" />
                <span>Authentication</span>
              </div>
              <div className="ml-6 space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Auth Time:</span> {formatDate(assertion.authnStatement.authnInstant)}
                </div>
                {assertion.authnStatement.sessionIndex && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Session:</span> <code className="text-xs">{assertion.authnStatement.sessionIndex}</code>
                  </div>
                )}
                {assertion.authnStatement.authnContext && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Context:</span>{' '}
                    <Badge variant="outline">{getAuthContextDisplay(assertion.authnStatement.authnContext)}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attributes */}
          {assertion.attributes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>Attributes</span>
                <Badge variant="secondary">{assertion.attributes.length}</Badge>
              </div>
              <div className="ml-6 space-y-3">
                {assertion.attributes.map((attr, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{attr.name}</span>
                      <CopyButton text={attr.values.join(', ')} showText={false} />
                    </div>
                    {attr.values.map((value, vi) => (
                      <div key={vi} className="ml-4 text-sm text-muted-foreground">
                        {value}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}