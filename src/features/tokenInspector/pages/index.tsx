import { TokenInspector } from "@/features/tokenInspector";
import { PageContainer, PageHeader } from "@/components/page";
import { KeyRound } from "lucide-react";
// Removed unused import: import { useUrlParams } from "@/hooks";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function TokenInspectorPage() {
  const [urlToken, setUrlToken] = useState<string | null>(null);
  const location = useLocation();

  // Extract token from URL parameters whenever URL changes
  // This ensures it works both for initial load and subsequent navigations
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tokenParam = searchParams.get('token');

    if (tokenParam) {
      console.log('Token found in URL parameters:', tokenParam.substring(0, 10) + '...');
      setUrlToken(tokenParam);
    } else {
      setUrlToken(null);
    }
  }, [location.search]); // React to location.search changes

  return (
    <PageContainer maxWidth='full'>
      <PageHeader
        title="OAuth/OIDC Token Inspector"
        description="Decode and inspect JWT tokens used in OAuth 2.0 and OpenID Connect protocols. Validate tokens, examine claims, and verify signatures."
        icon={KeyRound}
      />
      <TokenInspector initialToken={urlToken} />
    </PageContainer>
  );
}