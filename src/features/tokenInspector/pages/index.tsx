import { useEffect, useRef, useState } from 'react'
import { TokenInspector } from '@/features/tokenInspector'
import { PageContainer, PageHeader } from '@/components/page'
import { KeyRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  consumeHandoff,
  getHandoffIdFromNavigationState,
  TOKEN_INSPECTOR_DESTINATION,
} from '@/lib/handoff'

export default function TokenInspectorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const handoffId = getHandoffIdFromNavigationState(location.state)
  const consumedHandoffIdRef = useRef<string | null>(null)
  const [consumedHandoff, setConsumedHandoff] = useState<{
    id: string
    token: string
  } | null>(null)

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    if (!searchParams.has('token')) return

    searchParams.delete('token')
    const search = searchParams.toString()
    void navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      },
      { replace: true, state: location.state }
    )
  }, [location.hash, location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    if (!handoffId) {
      consumedHandoffIdRef.current = null
      setConsumedHandoff(null)
      return
    }
    if (consumedHandoffIdRef.current === handoffId) return

    consumedHandoffIdRef.current = handoffId
    const payload = consumeHandoff(handoffId, TOKEN_INSPECTOR_DESTINATION)
    setConsumedHandoff(payload ? { id: handoffId, token: payload.token } : null)
  }, [handoffId])

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="OAuth/OIDC Token Inspector"
        description="Decode and inspect JWT tokens used in OAuth 2.0 and OpenID Connect protocols. Validate tokens, examine claims, and verify signatures."
        icon={KeyRound}
      />
      <TokenInspector
        key={consumedHandoff?.id ?? 'empty'}
        initialToken={consumedHandoff?.token ?? null}
        initialTokenIsEphemeral={Boolean(consumedHandoff)}
      />
    </PageContainer>
  )
}
