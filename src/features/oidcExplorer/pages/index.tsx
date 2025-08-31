// OIDC Explorer page component
import { PageContainer, PageHeader } from '@/components/page'
import { FileJson } from 'lucide-react'
import { OidcExplorer } from '..'

export default function OidcExplorerPage() {
  return (
    <PageContainer>
      <PageHeader
        title="OIDC Configuration Explorer"
        description="Explore and analyze OpenID Connect provider configurations and their JWKS endpoints"
        icon={FileJson}
      />

      <OidcExplorer />
    </PageContainer>
  )
}
