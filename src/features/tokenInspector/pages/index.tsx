
import { TokenInspector } from "@/features/tokenInspector";
import { PageContainer, PageHeader } from "@/components/page";
import { KeyRound } from "lucide-react";

export default function TokenInspectorPage() {
  return (
    <PageContainer>
      <PageHeader
        title="OAuth/OIDC Token Inspector"
        description="Decode and inspect JWT tokens used in OAuth 2.0 and OpenID Connect protocols. Validate tokens, examine claims, and verify signatures."
        icon={KeyRound}
      />
      <TokenInspector />
    </PageContainer>
  );
}
