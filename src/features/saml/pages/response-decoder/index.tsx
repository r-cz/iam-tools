import { PageContainer, PageHeader } from '@/components/page'
import { SamlResponseDecoder } from '../../components/SamlResponseDecoder'
import { Shield } from 'lucide-react'

export default function SamlResponseDecoderPage() {
  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="SAML Response Decoder"
        description="Decode and analyze SAML responses and assertions. Extract attributes, validate structure, and inspect authentication statements."
        icon={Shield}
      />
      <SamlResponseDecoder />
    </PageContainer>
  )
}

export { SamlResponseDecoder }
