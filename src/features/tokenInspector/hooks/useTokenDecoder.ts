import { useState, useCallback, useRef } from 'react'
import type * as jose from 'jose'
import { decodeJWT } from '@/lib/jwt/decode-token'
import { validateToken, determineTokenType } from '../utils/token-validation'
import { verifySignatureWithRefresh } from '@/lib/jwt/verify-signature-with-refresh'
import { getIssuerBaseUrl } from '@/features/oauthPlayground/utils/demo-issuer'
import type { TokenType, DecodedToken, ValidationResult } from '@/types'

export interface TokenDecoderState {
  decodedToken: DecodedToken | null
  tokenType: TokenType
  validationResults: ValidationResult[]
  isDemoToken: boolean
  issuerUrl: string
}

const EMPTY_DECODER_STATE: TokenDecoderState = {
  decodedToken: null,
  tokenType: 'unknown',
  validationResults: [],
  isDemoToken: false,
  issuerUrl: '',
}

export interface UseTokenDecoderReturn extends TokenDecoderState {
  decodeToken: (
    token: string,
    jwks: jose.JSONWebKeySet | null,
    oidcConfig?: any,
    issuerOverride?: string
  ) => Promise<void>
  resetState: () => void
}

/**
 * Custom hook for decoding and validating JWT tokens
 */
export function useTokenDecoder(): UseTokenDecoderReturn {
  const [state, setState] = useState<TokenDecoderState>(EMPTY_DECODER_STATE)
  const inspectionIdRef = useRef(0)

  const resetState = useCallback(() => {
    inspectionIdRef.current += 1
    setState(EMPTY_DECODER_STATE)
  }, [])

  const decodeToken = useCallback(
    async (
      token: string,
      jwks: jose.JSONWebKeySet | null,
      oidcConfig?: any,
      issuerOverride?: string
    ) => {
      if (!token) {
        resetState()
        return
      }

      const inspectionId = ++inspectionIdRef.current

      try {
        const decoded = decodeJWT(token)
        if (!decoded) throw new Error('Invalid JWT format')

        const { header, payload } = decoded

        // Determine if it's a demo token
        const demoIssuerUrl = getIssuerBaseUrl()
        const isLikelyDemo =
          payload.is_demo_token === true ||
          (payload.iss && typeof payload.iss === 'string' && payload.iss === demoIssuerUrl)
        const isDemoToken = Boolean(isLikelyDemo)

        // Determine token type and perform basic claim validation
        const detectedTokenType = determineTokenType(header, payload)
        const validationResults = validateToken(header, payload, detectedTokenType)

        // Set issuer URL (use demo issuer if it's a demo token)
        const issuerFromPayload = typeof payload.iss === 'string' ? payload.iss : ''
        const currentIssuer = isLikelyDemo ? demoIssuerUrl : issuerOverride || issuerFromPayload

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
              if (
                oidcConfig?.jwks_uri &&
                (oidcConfig.issuer === currentIssuer ||
                  oidcConfig.issuer === payload.iss ||
                  Boolean(issuerOverride))
              ) {
                jwksUri = oidcConfig.jwks_uri || ''
              } else if (currentIssuer) {
                // Fallback: construct the JWKS URI
                jwksUri = `${currentIssuer}/.well-known/jwks`
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
        if (inspectionId === inspectionIdRef.current) {
          setState({
            decodedToken: {
              header,
              payload,
              signature: { valid: signatureValid, error: signatureError },
              raw: token,
            },
            tokenType: detectedTokenType,
            validationResults,
            isDemoToken,
            issuerUrl: currentIssuer,
          })
        }
      } catch (err: any) {
        if (inspectionId === inspectionIdRef.current) {
          setState({
            ...EMPTY_DECODER_STATE,
            validationResults: [
              {
                claim: 'format',
                valid: false,
                message: `Invalid token: ${err.message}`,
                severity: 'error',
              },
            ],
          })
        }
      }
    },
    [resetState]
  )

  return {
    ...state,
    decodeToken,
    resetState,
  }
}
