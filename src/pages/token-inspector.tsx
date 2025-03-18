
import { TokenInspector } from "@/features/tokenInspector";

export default function TokenInspectorPage() {
  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-6">OAuth/OIDC Token Inspector</h1>
      <p className="text-muted-foreground mb-8">
        Decode and inspect JWT tokens used in OAuth 2.0 and OpenID Connect protocols. Validate tokens, examine claims, and verify signatures.
      </p>
      <TokenInspector />
    </div>
  );
}
