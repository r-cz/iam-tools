
import { TokenInspector } from "@/features/tokenInspector";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export default function TokenInspectorPage() {
  return (
    <div className="py-4 px-6">
      <div className="max-w-5xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle>OAuth/OIDC Token Inspector</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Decode and inspect JWT tokens used in OAuth 2.0 and OpenID Connect protocols. 
              Validate tokens, examine claims, and verify signatures.
            </CardDescription>
          </CardHeader>
        </Card>
        <TokenInspector />
      </div>
    </div>
  );
}
