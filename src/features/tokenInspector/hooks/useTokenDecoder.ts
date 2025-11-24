import { useState, useCallback } from 'react'
import type * as jose from 'jose'
import { decodeJWT } from '@/lib/jwt/decode-token'
import { validateToken, determineTokenType } from '../utils/token-validation'
import { verifySignatureWithRefresh } from '@/lib/jwt/verify-signature-with-refresh'
import { getIssuerBaseUrl } from '@/lib/jwt/generate-signed-token'
import type { TokenType, DecodedToken, ValidationResult } from '@/types'

export interface TokenDecoderState {
  decodedToken: DecodedToken | null
  tokenType: TokenType
  validationResults: ValidationResult[]
  isDemoToken: boolean
  issuerUrl: string
}

export interface UseTokenDecoderReturn extends TokenDecoderState {
  decodeToken: (token: string, jwks: jose.JSONWebKeySet | null, oidcConfig?: any) => Promise<void>
  resetState: () => void
}

/**
 * Custom hook for decoding and validating JWT tokens
 */
export function useTokenDecoder(): UseTokenDecoderReturn {
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null)
  const [tokenType, setTokenType] = useState<TokenType>('unknown')
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [isDemoToken, setIsDemoToken] = useState(false)
  const [issuerUrl, setIssuerUrl] = useState('')

  const resetState = useCallback(() => {
    setDecodedToken(null)
    setValidationResults([])
    setTokenType('unknown')
    setIsDemoToken(false)
    setIssuerUrl('')
  }, [])

  const decodeToken = useCallback(
    async (token: string, jwks: jose.JSONWebKeySet | null, oidcConfig?: any) => {
      if (!token) {
        resetState()
        return
      }

      try {
        const decoded = decodeJWT(token)
        if (!decoded) throw new Error('Invalid JWT format')

        const { header, payload } = decoded

        // Determine if it's a demo token
        const demoIssuerUrl = getIssuerBaseUrl()
        const isLikelyDemo =
          payload.is_demo_token === true ||
          (payload.iss && typeof payload.iss === 'string' && payload.iss === demoIssuerUrl)
        setIsDemoToken(Boolean(isLikelyDemo))

        // Determine token type and perform basic claim validation
        const detectedTokenType = determineTokenType(header, payload)
        setTokenType(detectedTokenType)
        const validationResults = validateToken(header, payload, detectedTokenType)

        // Set issuer URL (use demo issuer if it's a demo token)
        const issuerFromPayload = typeof payload.iss === 'string' ? payload.iss : ''
        const currentIssuer = isLikelyDemo ? demoIssuerUrl : issuerFromPayload
        setIssuerUrl(currentIssuer)

        // Perform signature validation if JWKS are available
        let signatureValid = false
        let signatureError: string | undefined = undefined

        if (jwks) {
          try {
            // For demo tokens, accept matching kid as valid
            if (isLikelyDemo) {
              const matchingKey = jwks.keys.find((key) => key.kid === header.kid)
              if (matchingKey) {
                signatureValid = true
              } else {
                throw new Error(`No key with ID "${header.kid}" found in the loaded JWKS`)
              }
            } else {
              // For non-demo tokens, perform actual crypto verification
              let jwksUri = ''

              // Check if we have OIDC config for this issuer
              if (oidcConfig && oidcConfig.issuer === payload.iss) {
                jwksUri = oidcConfig.jwks_uri || ''
              } else if (payload.iss) {
                // Fallback: construct the JWKS URI
                jwksUri = `${payload.iss}/.well-known/jwks`
              }

              const result = await verifySignatureWithRefresh(token, jwksUri, jwks, () => {
                // Refresh callback handled by parent
              })

              signatureValid = result.valid
              signatureError = result.error
            }
          } catch (e: any) {
            signatureError = e.message
            signatureValid = false
          }
        } else {
          signatureError = 'JWKS not yet loaded for validation.'
        }

        // Update state with decoded results
        setDecodedToken({
          header,
          payload,
          signature: { valid: signatureValid, error: signatureError },
          raw: token,
        })
        setValidationResults(validationResults)
      } catch (err: any) {
        setDecodedToken(null)
        setIsDemoToken(false)
        setTokenType('unknown')
        setValidationResults([
          {
            claim: 'format',
            valid: false,
            message: `Invalid token: ${err.message}`,
            severity: 'error',
          },
        ])
      }
    },
    [resetState]
  )

  return {
    decodedToken,
    tokenType,
    validationResults,
    isDemoToken,
    issuerUrl,
    decodeToken,
    resetState,
  }
}
