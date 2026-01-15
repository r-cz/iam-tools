import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  OAuthConfig,
  OAuthRedirectState,
  OAUTH_PLAYGROUND_REDIRECT_STATE_KEY,
  PkceParams,
} from '../utils/types'
import ConfigurationForm from './ConfigurationForm'
import AuthorizationRequest from './AuthorizationRequest'
import TokenExchange from './TokenExchange'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const readRedirectState = (): OAuthRedirectState | null => {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem(OAUTH_PLAYGROUND_REDIRECT_STATE_KEY)
    return stored ? (JSON.parse(stored) as OAuthRedirectState) : null
  } catch {
    return null
  }
}

const clearRedirectState = () => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(OAUTH_PLAYGROUND_REDIRECT_STATE_KEY)
}

export function AuthCodeWithPkceFlow() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<string>('config')
  const [config, setConfig] = useState<OAuthConfig | null>(null)
  const [pkce, setPkce] = useState<PkceParams | null>(null)
  const [authCode, setAuthCode] = useState<string | null>(null)

  // Initialize from location state (returning from callback)
  useEffect(() => {
    if (!location.state?.code) return

    setAuthCode(location.state.code)

    const redirectState = readRedirectState()
    if (redirectState) {
      setConfig(redirectState.config)
      setPkce(redirectState.pkce)
      setActiveTab('token')
      clearRedirectState()
    }
  }, [location.state])

  // Handle configuration completion
  const handleConfigComplete = (newConfig: OAuthConfig, newPkce: PkceParams) => {
    setConfig(newConfig)
    setPkce(newPkce)
    setActiveTab('auth')
  }

  // Handle authorization completion
  const handleAuthorizationComplete = (code: string) => {
    setAuthCode(code)
    setActiveTab('token')
  }

  // Determine which tabs should be enabled
  const isAuthTabEnabled = !!config && !!pkce
  const isTokenTabEnabled = isAuthTabEnabled && !!authCode

  // Save state when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-4">
      <TabsList className="grid grid-cols-3 w-full mb-4">
        <TabsTrigger value="config">1. Config</TabsTrigger>
        <TabsTrigger value="auth" disabled={!isAuthTabEnabled}>
          2. AuthZ
        </TabsTrigger>
        <TabsTrigger value="token" disabled={!isTokenTabEnabled}>
          3. Get Token
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config">
        <ConfigurationForm onConfigComplete={handleConfigComplete} />
      </TabsContent>

      <TabsContent value="auth">
        {config && pkce && (
          <AuthorizationRequest
            config={config}
            pkce={pkce}
            onAuthorizationComplete={handleAuthorizationComplete}
          />
        )}
      </TabsContent>

      <TabsContent value="token">
        {config && pkce && authCode && (
          <TokenExchange config={config} pkce={pkce} authorizationCode={authCode} />
        )}
      </TabsContent>
    </Tabs>
  )
}
