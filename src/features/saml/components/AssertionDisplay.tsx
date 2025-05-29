import { DecodedSamlResponse } from "../utils/saml-decoder";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CopyButton, JsonDisplay } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { User, Clock, Shield, Key, ChevronDown, Code2 } from "lucide-react";

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">Assertion #{index + 1}</h4>
                {assertion.hasSignature && (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
                    <Shield className="mr-1 h-3 w-3" />
                    Signed
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
              <span className="font-medium text-muted-foreground">ID:</span>
              <div className="flex items-center gap-2">
                <code className="break-all">{assertion.id}</code>
                <CopyButton text={assertion.id} showText={false} />
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
              <span className="font-medium text-muted-foreground">Issuer:</span>
              <div className="flex items-center gap-2">
                <code className="break-all">{assertion.issuer}</code>
                <CopyButton text={assertion.issuer} showText={false} />
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
              <span className="font-medium text-muted-foreground">Issued:</span>
              <span>{formatDate(assertion.issueInstant)}</span>
            </div>
          </div>

          {/* Subject */}
          {assertion.subject && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Subject Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assertion.subject.nameId && (
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
                    <span className="text-muted-foreground">Name ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="break-all">{assertion.subject.nameId}</code>
                      <CopyButton text={assertion.subject.nameId} showText={false} />
                    </div>
                  </div>
                )}
                {assertion.subject.nameIdFormat && (
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
                    <span className="text-muted-foreground">Format:</span>
                    <code className="break-all text-xs">{assertion.subject.nameIdFormat}</code>
                  </div>
                )}
                {assertion.subject.confirmations?.map((conf, i) => (
                  <div key={i} className="mt-3 space-y-1 pl-4 border-l-2 border-muted">
                    <div className="text-sm font-medium text-muted-foreground">Confirmation #{i + 1}</div>
                    {conf.notOnOrAfter && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Not On/After:</span> {formatDate(conf.notOnOrAfter)}
                      </div>
                    )}
                    {conf.recipient && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Recipient:</span> <code className="text-xs">{conf.recipient}</code>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Conditions */}
          {assertion.conditions && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assertion.conditions.notBefore && (
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
                    <span className="text-muted-foreground">Not Before:</span>
                    <span>{formatDate(assertion.conditions.notBefore)}</span>
                  </div>
                )}
                {assertion.conditions.notOnOrAfter && (
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
                    <span className="text-muted-foreground">Not On/After:</span>
                    <span>{formatDate(assertion.conditions.notOnOrAfter)}</span>
                  </div>
                )}
                {assertion.conditions.audiences && assertion.conditions.audiences.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Audiences:</div>
                    {assertion.conditions.audiences.map((aud, i) => (
                      <div key={i} className="ml-4 flex items-center gap-2">
                        <code className="text-xs">{aud}</code>
                        <CopyButton text={aud} showText={false} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Authentication Statement */}
          {assertion.authnStatement && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
                  <span className="text-muted-foreground">Auth Time:</span>
                  <span>{formatDate(assertion.authnStatement.authnInstant)}</span>
                </div>
                {assertion.authnStatement.sessionIndex && (
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
                    <span className="text-muted-foreground">Session:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs break-all">{assertion.authnStatement.sessionIndex}</code>
                      <CopyButton text={assertion.authnStatement.sessionIndex} showText={false} />
                    </div>
                  </div>
                )}
                {assertion.authnStatement.authnContext && (
                  <div className="grid grid-cols-[120px_1fr] gap-2 items-start text-sm">
                    <span className="text-muted-foreground">Context:</span>
                    <Badge variant="outline">{getAuthContextDisplay(assertion.authnStatement.authnContext)}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attributes */}
          {assertion.attributes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  Attributes
                  <Badge variant="secondary">{assertion.attributes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>
          )}

          {/* Raw Assertion Data */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground text-muted-foreground data-[state=open]:text-foreground">
              <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
              <Code2 className="h-4 w-4" />
              <span>Raw Assertion Data</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4">
                <JsonDisplay 
                  data={assertion}
                  maxHeight="400px"
                  containerClassName="border rounded-lg"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ))}
    </div>
  );
}