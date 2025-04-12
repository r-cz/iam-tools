import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OAuthFlowType } from "../utils/types";
import { ClientCredentialsFlow } from "./ClientCredentialsFlow";

interface FlowSelectorProps {
  selectedFlow: OAuthFlowType;
  onSelectFlow: (flow: OAuthFlowType) => void;
}

export function FlowSelector({ selectedFlow, onSelectFlow }: FlowSelectorProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>OAuth 2.0 Flow Selector</CardTitle>
        <CardDescription>
          Choose the OAuth 2.0 flow you want to implement and test
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue={selectedFlow}
          onValueChange={(value) => onSelectFlow(value as OAuthFlowType)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 gap-2 mb-4">
            <TabsTrigger value={OAuthFlowType.AUTH_CODE_PKCE}>
              Auth Code + PKCE
            </TabsTrigger>
            <TabsTrigger
              value={OAuthFlowType.CLIENT_CREDENTIALS}
            >
              Client Credentials
            </TabsTrigger>
          </TabsList>

          <TabsContent value={OAuthFlowType.AUTH_CODE_PKCE} className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <h3 className="font-medium mb-2">Authorization Code with PKCE Flow</h3>
              <p className="text-sm text-muted-foreground">
                A secure OAuth 2.0 flow for public clients that prevents authorization code interception attacks.
                Recommended for single-page apps and native applications.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Flow Steps:</h3>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>Generate a code verifier and code challenge</li>
                <li>Request authorization from the resource owner</li>
                <li>Receive authorization code via redirect</li>
                <li>Exchange the code and verifier for access tokens</li>
                <li>Use the access token to access protected resources</li>
              </ol>
            </div>
            
            <div className="rounded-md bg-muted p-4">
              <h3 className="font-medium mb-2">Security Benefits:</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Protects against code interception attacks</li>
                <li>No client secret needed for public clients</li>
                <li>Short-lived authorization codes</li>
                <li>Proof of possession through code verifier</li>
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value={OAuthFlowType.CLIENT_CREDENTIALS}>
            <ClientCredentialsFlow />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default FlowSelector;
