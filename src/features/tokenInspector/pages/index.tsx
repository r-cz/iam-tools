import { TokenInspector } from '@/features/tokenInspector'
import { PageContainer, PageHeader } from '@/components/page'
import { KeyRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export default function TokenInspectorPage() {
  const location = useLocation()
  const urlToken = new URLSearchParams(location.search).get('token')

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="OAuth/OIDC Token Inspector"
        description="Decode and inspect JWT tokens used in OAuth 2.0 and OpenID Connect protocols. Validate tokens, examine claims, and verify signatures."
        icon={KeyRound}
      />
      <TokenInspector key={urlToken ?? 'empty'} initialToken={urlToken} />
    </PageContainer>
  )
}
