import { PageContainer, PageHeader } from "@/components/page";
import { SearchCheck } from "lucide-react";
import { TokenIntrospection } from "../components/TokenIntrospection";

export default function IntrospectionPage() {
  return (
    <PageContainer>
      <PageHeader
        title="OAuth Token Introspection"
        description="Verify the state and validity of OAuth tokens against an introspection endpoint."
        icon={SearchCheck}
      />
      <TokenIntrospection />
    </PageContainer>
  );
}