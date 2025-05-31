import { useState } from "react";
import { DecodedSamlResponse } from "../utils/saml-decoder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CopyButton, JsonDisplay } from "@/components/common";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, ChevronDown, Code2, Eye, EyeOff } from "lucide-react";

interface AssertionDisplayProps {
  response: DecodedSamlResponse;
}

export function AssertionDisplay({ response }: AssertionDisplayProps) {
  const [showAllAttributes, setShowAllAttributes] = useState(false);
  
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const unix = Math.floor(date.getTime() / 1000);
      return (
        <div className="space-y-1">
          <div className="font-mono text-sm">{timestamp}</div>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleString()} (Unix: {unix})
          </div>
        </div>
      );
    } catch {
      return <span className="font-mono text-sm">{timestamp}</span>;
    }
  };

  const getAuthContextDisplay = (context?: string) => {
    if (!context) return context;
    const contextMap: Record<string, string> = {
      'Password': 'Password Authentication',
      'PasswordProtectedTransport': 'Password over HTTPS',
      'Kerberos': 'Kerberos/Windows Authentication',
      'X509': 'Certificate-based Authentication'
    };
    const match = context.match(/:([^:]+)$/);
    const shortName = match ? match[1] : context;
    return contextMap[shortName] || shortName;
  };

  const samlDescriptions: Record<string, string> = {
    id: "Unique identifier for this SAML assertion",
    issuer: "The entity that issued this SAML assertion",
    nameId: "The unique identifier for the subject (user)",
    authnContext: "The authentication method used by the identity provider",
    sessionIndex: "Unique identifier for this authentication session",
    audiences: "Services that are allowed to consume this assertion",
    notBefore: "Assertion is not valid before this time",
    notOnOrAfter: "Assertion expires after this time"
  };

  const importantAttributes = ['email', 'name', 'uid', 'displayName', 'groups', 'roles'];

  if (response.assertions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No assertions found in this SAML Response
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {response.assertions.map((assertion, index) => {
        const sortedAttributes = [...assertion.attributes].sort((a, b) => {
          const aImportant = importantAttributes.includes(a.name.toLowerCase());
          const bImportant = importantAttributes.includes(b.name.toLowerCase());
          if (aImportant && !bImportant) return -1;
          if (!aImportant && bImportant) return 1;
          return a.name.localeCompare(b.name);
        });

        const visibleAttributes = showAllAttributes 
          ? sortedAttributes 
          : sortedAttributes.slice(0, 5);

        return (
          <div key={assertion.id} className="space-y-4">
            {index > 0 && <Separator className="my-6" />}
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-medium">Assertion #{index + 1}</h4>
                {assertion.hasSignature && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-700 hover:bg-green-500/20">
                    <Shield className="mr-1 h-3 w-3" />
                    Signed
                  </Badge>
                )}
              </div>
            </div>

            {/* Raw Assertion Data - Top Level */}
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground text-muted-foreground data-[state=open]:text-foreground">
                <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                <Code2 className="h-4 w-4" />
                <span>Raw Assertion Data</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4">
                  <JsonDisplay 
                    data={assertion}
                    maxHeight="300px"
                    containerClassName="rounded-lg border bg-card text-card-foreground shadow-sm"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Assertion Details Grid */}
            <div className="space-y-3">
              <h3 className="text-md font-medium">Assertion Details</h3>
              <div className="grid grid-cols-1 gap-3">
                
                {/* Assertion ID */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="font-mono text-sm font-medium">Assertion ID</span>
                        <div className="text-xs text-muted-foreground">{samlDescriptions.id}</div>
                      </div>
                      <CopyButton text={assertion.id} showText={false} />
                    </div>
                    <div className="font-mono text-sm break-all">{assertion.id}</div>
                  </div>
                </div>

                {/* Issuer */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="font-mono text-sm font-medium">Issuer</span>
                        <div className="text-xs text-muted-foreground">{samlDescriptions.issuer}</div>
                      </div>
                      <CopyButton text={assertion.issuer} showText={false} />
                    </div>
                    <div className="font-mono text-sm break-all">{assertion.issuer}</div>
                  </CardContent>
                </Card>

                {/* Issue Time */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <span className="font-mono text-sm font-medium">Issue Time</span>
                      <div className="text-xs text-muted-foreground">When this assertion was created</div>
                    </div>
                    {formatTimestamp(assertion.issueInstant)}
                  </CardContent>
                </Card>

                {/* Subject */}
                {assertion.subject?.nameId && (
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">Subject</span>
                            <Badge variant="secondary" className="text-xs">NameID</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{samlDescriptions.nameId}</div>
                        </div>
                        <CopyButton text={assertion.subject.nameId} showText={false} />
                      </div>
                      <div className="font-mono text-sm break-all">{assertion.subject.nameId}</div>
                      {assertion.subject.nameIdFormat && (
                        <div className="text-xs text-muted-foreground">
                          Format: {assertion.subject.nameIdFormat.split(':').pop()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Authentication Context */}
                {assertion.authnStatement?.authnContext && (
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <span className="font-mono text-sm font-medium">Authentication Method</span>
                        <div className="text-xs text-muted-foreground">{samlDescriptions.authnContext}</div>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {getAuthContextDisplay(assertion.authnStatement.authnContext)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Session Index */}
                {assertion.authnStatement?.sessionIndex && (
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="font-mono text-sm font-medium">Session Index</span>
                          <div className="text-xs text-muted-foreground">{samlDescriptions.sessionIndex}</div>
                        </div>
                        <CopyButton text={assertion.authnStatement.sessionIndex} showText={false} />
                      </div>
                      <div className="font-mono text-sm break-all">{assertion.authnStatement.sessionIndex}</div>
                    </div>
                  </div>
                )}

                {/* Validity Period */}
                {(assertion.conditions?.notBefore || assertion.conditions?.notOnOrAfter) && (
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <span className="font-mono text-sm font-medium">Validity Period</span>
                        <div className="text-xs text-muted-foreground">Time window when this assertion is valid</div>
                      </div>
                      <div className="space-y-2">
                        {assertion.conditions.notBefore && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Valid From:</div>
                            {formatTimestamp(assertion.conditions.notBefore)}
                          </div>
                        )}
                        {assertion.conditions.notOnOrAfter && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Valid Until:</div>
                            {formatTimestamp(assertion.conditions.notOnOrAfter)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audiences */}
                {assertion.conditions?.audiences && assertion.conditions.audiences.length > 0 && (
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">Audiences</span>
                          <Badge variant="secondary">{assertion.conditions.audiences.length}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{samlDescriptions.audiences}</div>
                      </div>
                      <div className="space-y-2">
                        {assertion.conditions.audiences.map((audience, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="font-mono text-sm break-all">{audience}</span>
                            <CopyButton text={audience} showText={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attributes Section */}
            {assertion.attributes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-md font-medium">User Attributes</h3>
                    <Badge variant="secondary">{assertion.attributes.length}</Badge>
                  </div>
                  {assertion.attributes.length > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllAttributes(!showAllAttributes)}
                    >
                      {showAllAttributes ? (
                        <>
                          <EyeOff className="mr-1 h-3 w-3" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-3 w-3" />
                          Show All ({assertion.attributes.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {visibleAttributes.map((attr, i) => (
                    <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="font-mono text-sm font-medium">{attr.name}</span>
                            {attr.nameFormat && (
                              <div className="text-xs text-muted-foreground">
                                Format: {attr.nameFormat.split(':').pop()}
                              </div>
                            )}
                          </div>
                          <CopyButton text={attr.values.join(', ')} showText={false} />
                        </div>
                        <div className="space-y-1">
                          {attr.values.map((value, vi) => (
                            <div key={vi} className="font-mono text-sm p-2 bg-muted/50 rounded">
                              {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}