import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Link, 
  ChevronRight,
  ChevronDown,
  Copy,
  ClipboardCheck 
} from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";

import { OidcConfiguration } from '../utils/types';
import { endpointDescriptions } from '../data/common-endpoints';

interface ConfigDisplayProps {
  config: OidcConfiguration;
  onJwksClick: () => void;
}

export function ConfigDisplay({ config, onJwksClick }: ConfigDisplayProps) {
  const [view, setView] = useState<'formatted' | 'raw'>('formatted');
  const { copy, copied, copyTarget } = useClipboard();
  
  // Check if issuer URL of the config matches the claimed issuer URL
  const issuerValid = !!config.issuer && config.issuer.trim() !== '';
  
  // Group config properties
  const endpoints = [
    "authorization_endpoint",
    "token_endpoint",
    "userinfo_endpoint",
    "jwks_uri",
    "registration_endpoint",
    "revocation_endpoint",
    "introspection_endpoint",
    "device_authorization_endpoint",
    "end_session_endpoint"
  ];

  const supportedFeatures = [
    "scopes_supported",
    "response_types_supported",
    "response_modes_supported",
    "grant_types_supported",
    "token_endpoint_auth_methods_supported",
    "token_endpoint_auth_signing_alg_values_supported",
    "code_challenge_methods_supported",
    "subject_types_supported",
    "id_token_signing_alg_values_supported",
    "id_token_encryption_alg_values_supported",
    "id_token_encryption_enc_values_supported",
    "userinfo_signing_alg_values_supported",
    "userinfo_encryption_alg_values_supported",
    "userinfo_encryption_enc_values_supported",
    "request_object_signing_alg_values_supported",
    "request_object_encryption_alg_values_supported",
    "request_object_encryption_enc_values_supported"
  ];

  const booleanFeatures = [
    "claims_parameter_supported",
    "request_parameter_supported",
    "request_uri_parameter_supported",
    "require_request_uri_registration",
    "require_pushed_authorization_requests",
    "tls_client_certificate_bound_access_tokens",
    "backchannel_logout_supported",
    "backchannel_logout_session_supported",
    "frontchannel_logout_supported",
    "frontchannel_logout_session_supported"
  ];

  const miscFeatures = [
    "claims_supported",
    "ui_locales_supported",
    "service_documentation",
    "op_policy_uri",
    "op_tos_uri"
  ];

  const formatArrayValue = (value: string[]) => {
    if (!value || !Array.isArray(value) || value.length === 0) {
      return <span className="text-muted-foreground italic">None</span>;
    }
    
    if (value.length <= 3) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, index) => (
            <Badge key={index} variant="outline" className="bg-primary/10">
              {item}
            </Badge>
          ))}
        </div>
      );
    }
    
    return (
      <Collapsible>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 3).map((item, index) => (
              <Badge key={index} variant="outline" className="bg-primary/10">
                {item}
              </Badge>
            ))}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 rounded-full">
                <span className="text-xs">+{value.length - 3} more</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-1 pt-2">
              {value.slice(3).map((item, index) => (
                <Badge key={index} variant="outline" className="bg-primary/10">
                  {item}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  const formatEndpoint = (key: string) => {
    const value = config[key] as string;
    if (!value) return <span className="text-muted-foreground italic">Not provided</span>;
    
    return (
      <div className="flex flex-wrap items-center gap-2">
        <code className="text-sm break-all">{value}</code>
        <div className="flex items-center gap-1">
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </a>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs"
            onClick={() => copy(value)}
            disabled={copied && copyTarget === value}
          >
            {copied && copyTarget === value ? (
              <>
                <ClipboardCheck className="h-3 w-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const formatBooleanValue = (value: boolean | undefined) => {
    if (value === undefined) return <span className="text-muted-foreground italic">Not specified</span>;
    
    return value ? (
      <span className="flex items-center text-green-600">
        <CheckCircle2 className="h-4 w-4 mr-1" />
        Supported
      </span>
    ) : (
      <span className="flex items-center text-red-600">
        <XCircle className="h-4 w-4 mr-1" />
        Not Supported
      </span>
    );
  };

  const getEndpointDescription = (key: string) => {
    const desc = endpointDescriptions[key];
    if (!desc) return null;
    
    return (
      <div className="text-xs text-muted-foreground">
        <p>{desc.description}</p>
        {desc.specification && (
          <p className="mt-1">
            <span className="font-medium">Spec:</span> {desc.specification}
          </p>
        )}
      </div>
    );
  };

  const renderConfigItem = (key: string, icon?: React.ReactNode, button?: React.ReactNode) => {
    const value = config[key];
    const description = getEndpointDescription(key);
    const required = endpointDescriptions[key]?.required;
    
    return (
      <div key={key} className="py-3 first:pt-0 last:pb-0">
        <div className="flex flex-wrap justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            {icon}
            <h4 className="font-medium">
              {endpointDescriptions[key]?.name || key}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h4>
          </div>
          {button}
        </div>
        
        {description && <div className="mb-2">{description}</div>}
        
        <div className="mt-1">
          {Array.isArray(value) ? (
            formatArrayValue(value)
          ) : typeof value === 'boolean' ? (
            formatBooleanValue(value)
          ) : key.endsWith('_endpoint') || key.endsWith('_uri') ? (
            formatEndpoint(key)
          ) : (
            <code className="text-sm break-all">{String(value || '')}</code>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OpenID Configuration</CardTitle>
        <CardDescription>
          Discovered from: <code className="text-xs">{config.issuer}/.well-known/openid-configuration</code>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as 'formatted' | 'raw')} className="w-full">
          <div className="flex justify-end mb-4">
            <TabsList className="grid w-[200px] grid-cols-2">
              <TabsTrigger value="formatted">Formatted</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="formatted">
          <div className="space-y-6">
            {/* Issuer section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Provider Identity</h3>
              {renderConfigItem('issuer')}
            </div>
            
            <Separator />
            
            {/* Endpoints section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Endpoints</h3>
              <div className="space-y-4">
                {endpoints.filter(key => key in config).map(key => {
                  // Special treatment for jwks_uri
                  if (key === 'jwks_uri') {
                    return renderConfigItem(
                      key, 
                      <Link className="h-4 w-4 text-blue-600" />,
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs"
                          onClick={() => copy(config.jwks_uri)}
                          disabled={copied && copyTarget === config.jwks_uri}
                        >
                          {copied && copyTarget === config.jwks_uri ? (
                            <>
                              <ClipboardCheck className="h-3 w-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={onJwksClick}
                          className="h-7 text-xs"
                        >
                          Fetch JWKS
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    );
                  }
                  
                  return renderConfigItem(key, <Link className="h-4 w-4 text-blue-600" />);
                })}
              </div>
            </div>
            
            <Separator />
            
            {/* Supported features section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Supported Features</h3>
              <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportedFeatures.filter(key => key in config).map(key => (
                  renderConfigItem(key)
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Boolean features section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Feature Support</h3>
              <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {booleanFeatures.filter(key => key in config).map(key => (
                  renderConfigItem(key)
                ))}
              </div>
            </div>
            
            {/* Misc section - only show if any fields are present */}
            {miscFeatures.some(key => key in config) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                  <div className="space-y-4">
                    {miscFeatures.filter(key => key in config).map(key => (
                      renderConfigItem(key)
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {/* Unknown/custom fields */}
            {Object.keys(config)
              .filter(key => 
                !['issuer'].includes(key) && 
                !endpoints.includes(key) && 
                !supportedFeatures.includes(key) && 
                !booleanFeatures.includes(key) && 
                !miscFeatures.includes(key)
              )
              .length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Provider-Specific Extensions</h3>
                  <div className="space-y-4">
                    {Object.keys(config)
                      .filter(key => 
                        !['issuer'].includes(key) && 
                        !endpoints.includes(key) && 
                        !supportedFeatures.includes(key) && 
                        !booleanFeatures.includes(key) && 
                        !miscFeatures.includes(key)
                      )
                      .map(key => renderConfigItem(key))}
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="raw">
          <CodeBlock
            code={JSON.stringify(config, null, 2)}
            language="json"
            className="max-h-[70vh] overflow-auto"
          />
        </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-6">
        <p className="text-xs text-muted-foreground">
          Required fields for OpenID Connect providers are marked with <span className="text-red-500">*</span>
        </p>
      </CardFooter>
    </Card>
  );
}
