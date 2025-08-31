import { PageContainer, PageHeader } from '@/components/page'
import { UserRoundCheck } from 'lucide-react'
import { AuthCodeWithPkceFlow } from '../../components/AuthCodeWithPkceFlow'

export default function AuthCodeWithPkcePage() {
  return (
    <PageContainer>
      <PageHeader
        title="OAuth Authorization Code Flow"
        description="Authorization Code flow with PKCE (Proof Key for Code Exchange) for secure OAuth 2.0 authorization"
        icon={UserRoundCheck}
      />

      <AuthCodeWithPkceFlow />
    </PageContainer>
  )
}
