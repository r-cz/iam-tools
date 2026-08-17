import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { OAuthConfig, PkceParams } from '../utils/types'
import { decodeOAuthRedirectTransaction } from '../utils/redirect-transaction'
import ConfigurationForm from './ConfigurationForm'
import AuthorizationRequest from './AuthorizationRequest'
import TokenExchange from './TokenExchange'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AuthCodeWithPkceFlow() {
  const location = useLocation()
  const callbackCode = typeof location.state?.code === 'string' ? location.state.code : null
  const callbackTransaction = decodeOAuthRedirectTransaction(location.state?.transaction)
  const [flowState, setFlowState] = useState<{
    activeTab: string
    config: OAuthConfig | null
    pkce: PkceParams | null
    authCode: string | null
  }>({
    activeTab: 'config',
    config: null,
    pkce: null,
    authCode: null,
  })

  // Initialize from location state (returning from callback)
  useEffect(() => {
    if (!callbackCode) return

    setFlowState((currentState) => {
      if (!callbackTransaction) return currentState
      return {
        activeTab: 'token',
        authCode: callbackCode,
        config: callbackTransaction.config,
        pkce: callbackTransaction.pkce,
      }
    })
  }, [callbackCode, callbackTransaction])

  // Handle configuration completion
  const handleConfigComplete = (newConfig: OAuthConfig, newPkce: PkceParams) => {
    setFlowState((currentState) => ({
      ...currentState,
      activeTab: 'auth',
      config: newConfig,
      pkce: newPkce,
    }))
  }

  // Handle authorization completion
  const handleAuthorizationComplete = (code: string) => {
    setFlowState((currentState) => ({
      ...currentState,
      activeTab: 'token',
      authCode: code,
    }))
  }

  // Determine which tabs should be enabled
  const isAuthTabEnabled = !!flowState.config && !!flowState.pkce
  const isTokenTabEnabled = isAuthTabEnabled && !!flowState.authCode

  // Save state when tab changes
  const handleTabChange = (value: string) => {
    setFlowState((currentState) => ({
      ...currentState,
      activeTab: value,
    }))
  }

  return (
    <Tabs value={flowState.activeTab} onValueChange={handleTabChange} className="w-full space-y-4">
      <TabsList className="grid grid-cols-3 w-full mb-4">
        <TabsTrigger value="config" data-testid="oauth-authcode-tab-config">
          1. Config
        </TabsTrigger>
        <TabsTrigger
          value="auth"
          disabled={!isAuthTabEnabled}
          data-testid="oauth-authcode-tab-auth"
        >
          2. AuthZ
        </TabsTrigger>
        <TabsTrigger
          value="token"
          disabled={!isTokenTabEnabled}
          data-testid="oauth-authcode-tab-token"
        >
          3. Get Token
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config">
        <ConfigurationForm onConfigComplete={handleConfigComplete} />
      </TabsContent>

      <TabsContent value="auth">
        {flowState.config && flowState.pkce && (
          <AuthorizationRequest
            config={flowState.config}
            pkce={flowState.pkce}
            onAuthorizationComplete={handleAuthorizationComplete}
          />
        )}
      </TabsContent>

      <TabsContent value="token">
        {flowState.config && flowState.pkce && flowState.authCode && (
          <TokenExchange
            config={flowState.config}
            pkce={flowState.pkce}
            authorizationCode={flowState.authCode}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}
