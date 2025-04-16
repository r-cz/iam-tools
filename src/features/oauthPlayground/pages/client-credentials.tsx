import { PageContainer, PageHeader } from "@/components/page";
import { KeyRound } from "lucide-react"; // Import KeyRound icon
import { ClientCredentialsFlow } from "../components/ClientCredentialsFlow";

export default function ClientCredentialsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="OAuth Client Credentials Flow" // Update title
        description="Client Credentials flow for server-to-server authentication in OAuth 2.0." // Update description
        icon={KeyRound} // Add KeyRound icon
      />
      <ClientCredentialsFlow />
    </PageContainer>
  );
}
