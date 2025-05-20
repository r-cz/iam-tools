import { PageContainer, PageHeader } from "@/components/page";
import { UserCircle } from "lucide-react";
import { UserInfo } from "../components/UserInfo";

export default function UserInfoPage() {
  return (
    <PageContainer>
      <PageHeader
        title="OAuth UserInfo Endpoint"
        description="Access user profile information via the OAuth 2.0 UserInfo endpoint with a valid access token."
        icon={UserCircle}
      />
      <UserInfo />
    </PageContainer>
  );
}