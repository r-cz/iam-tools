import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/page";
import { OAuthFlowType } from "../utils/types";
import { FlowSelector } from "../components/FlowSelector";

export default function ClientCredentialsPage() {
  const [selectedFlow, setSelectedFlow] = useState<OAuthFlowType>(OAuthFlowType.CLIENT_CREDENTIALS);

  return (
    <PageContainer>
      <PageHeader
        title="OAuth 2.0 Playground"
        description="Test and explore the Client Credentials flow interactively."
      />
      <FlowSelector selectedFlow={selectedFlow} onSelectFlow={setSelectedFlow} />
    </PageContainer>
  );
}
