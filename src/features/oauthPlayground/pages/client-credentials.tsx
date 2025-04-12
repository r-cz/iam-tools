import { PageContainer, PageHeader } from "@/components/page";
import { ClientCredentialsFlow } from "../components/ClientCredentialsFlow";

export default function ClientCredentialsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="OAuth 2.0 Playground"
        description="Test and explore the Client Credentials flow interactively."
      />
      <ClientCredentialsFlow />
    </PageContainer>
  );
}
