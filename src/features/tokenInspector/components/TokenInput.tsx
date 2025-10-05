import React, { useState, useEffect } from 'react'
import Editor from 'react-simple-code-editor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon, TestTubeDiagonal, RotateCcw, Search } from 'lucide-react'
import { generateFreshToken } from '../utils/generate-token'
import { toast } from 'sonner'
import { DEMO_JWKS } from '@/lib/jwt/demo-key'
import { TokenHistory } from './TokenHistory'
import { Spinner } from '@/components/ui/spinner'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
} from '@/components/ui/input-group'

interface TokenInputProps {
  token: string
  setToken: (token: string) => void
  onDecode: () => void
  onReset: () => void
  onJwksResolved?: (jwks: any) => void // Optional callback for JWKS
  initialToken?: string | null // Token from URL parameter
  onSelectTokenFromHistory?: (token: string) => void // Callback for when a token is selected from history
}

// Highlighting function for JWT parts
const highlightJwt = (code: string): React.ReactNode => {
  const parts = code.split('.')
  if (parts.length !== 3) {
    // Not a standard JWT structure, return as is or with basic styling
    return code
  }

  return (
    <>
      <span className="jwt-header">{parts[0]}</span>
      <span className="jwt-dot">.</span>
      <span className="jwt-payload">{parts[1]}</span>
      <span className="jwt-dot">.</span>
      <span className="jwt-signature">{parts[2]}</span>
    </>
  )
}

export function TokenInput({
  token,
  setToken,
  onDecode,
  onReset,
  onJwksResolved,
  initialToken,
  onSelectTokenFromHistory,
}: TokenInputProps) {
  const [isLoadingExample, setIsLoadingExample] = useState(false)
  const [isExampleToken, setIsExampleToken] = useState(false)
  const [isInitialToken, setIsInitialToken] = useState(!!initialToken)

  // Show "from URL" indicator if token is from URL parameters
  useEffect(() => {
    if (initialToken && token === initialToken) {
      setIsInitialToken(true)
    } else {
      setIsInitialToken(false)
    }
  }, [initialToken, token])

  const handleSelectTokenFromHistory = (selectedToken: string) => {
    setToken(selectedToken)
    setIsExampleToken(false)
    setIsInitialToken(false)
    if (onSelectTokenFromHistory) {
      onSelectTokenFromHistory(selectedToken)
    }
  }

  const handleReset = () => {
    setIsExampleToken(false)
    setIsInitialToken(false)
    onReset()

    // Remove the token parameter from the URL without refreshing the page
    if (initialToken) {
      const url = new URL(window.location.href)
      url.searchParams.delete('token')
      window.history.replaceState({}, '', url.toString())
    }
  }

  const loadExampleToken = async () => {
    setIsLoadingExample(true)
    try {
      // Generate a fresh token with current timestamps
      const freshToken = await generateFreshToken()

      // Log token details
      const payload = JSON.parse(
        atob(freshToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      )
      console.log('Generated example token with issuer:', payload.iss)

      setToken(freshToken)
      setIsExampleToken(true)

      // If we have an onJwksResolved callback, provide the demo JWKS directly
      if (onJwksResolved) {
        console.log('Providing demo JWKS directly to parent component:', DEMO_JWKS)
        onJwksResolved(DEMO_JWKS)
      }

      // Success message
      toast.success('Example token generated successfully', {
        id: 'example-token-success',
        duration: 3000,
      })
    } catch (error) {
      console.error('Error generating example token:', error)
      toast.error('Error generating example token. Please try again.', {
        id: 'example-token-error',
        duration: 5000,
      })
    } finally {
      setIsLoadingExample(false)
    }
  }

  const handleEditorKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      if (token) {
        onDecode()
      }
    }
  }

  return (
    <div className="space-y-3">
      <InputGroup className="flex-wrap">
        <InputGroupAddon
          align="block-start"
          className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent"
        >
          <span className="text-sm font-medium text-foreground">OAuth/OIDC Token</span>
          <div className="flex items-center gap-1.5">
            <TokenHistory
              onSelectToken={handleSelectTokenFromHistory}
              compact
              buttonVariant="input-group"
              label="Recents"
            />
            <InputGroupButton
              onClick={loadExampleToken}
              disabled={isLoadingExample}
              grouped={false}
              variant="outline"
              className="flex items-center gap-1.5"
              aria-label="Load example token"
            >
              {isLoadingExample ? (
                <>
                  <Spinner size="sm" thickness="thin" aria-hidden="true" />
                  <span className="hidden sm:inline">Loading…</span>
                </>
              ) : (
                <>
                  <TestTubeDiagonal size={16} />
                  <span className="hidden sm:inline">Example</span>
                </>
              )}
            </InputGroupButton>
            <InputGroupButton
              grouped={false}
              variant="ghost"
              className="flex items-center gap-1.5 text-destructive hover:text-destructive border border-transparent"
              onClick={handleReset}
              aria-label="Clear token"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">Clear</span>
            </InputGroupButton>
          </div>
        </InputGroupAddon>

        <div
          data-slot="input-group-control"
          className="relative w-full bg-background text-sm font-mono"
        >
          <Editor
            value={token}
            onValueChange={(code) => {
              setToken(code)
              setIsExampleToken(false)
            }}
            highlight={highlightJwt}
            padding={10}
            textareaId="token-input"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            onKeyDown={handleEditorKeyDown}
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              outline: 'none',
              minHeight: '120px',
            }}
            className="caret-foreground"
          />
        </div>

        <InputGroupAddon
          align="block-end"
          className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent"
        >
          {token && (
            <InputGroupText className="tracking-normal font-mono normal-case text-muted-foreground">
              <span className="hidden sm:inline">Characters:</span> {token.length}
            </InputGroupText>
          )}
          <InputGroupButton
            onClick={onDecode}
            disabled={!token}
            className="flex items-center gap-1.5 rounded-md"
            variant="outline"
            grouped={false}
            aria-label="Inspect token"
          >
            <Search size={16} />
            <span className="hidden sm:inline">Inspect Token</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      {isExampleToken && (
        <Alert className="my-2 py-2 bg-blue-500/10 border-blue-500/20 text-blue-700">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            This is an example token using this site's demo endpoints. The key format is verified
            against our JWKS.
          </AlertDescription>
        </Alert>
      )}

      {isInitialToken && !isExampleToken && (
        <Alert className="my-2 py-2 bg-green-500/10 border-green-500/20 text-green-700">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            This token was provided via URL parameters. You can share links with tokens for quick
            inspection.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
