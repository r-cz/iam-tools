import { describe, expect, it } from 'bun:test'
import { detectProvider, formatJwkForDisplay } from '@/features/oidcExplorer/utils/config-helpers'
import type { OidcConfiguration } from '@/features/oidcExplorer/utils/types'

describe('OIDC Config Helpers', () => {
  describe('detectProvider', () => {
    describe('URL-based detection', () => {
      it('should detect Okta by URL', () => {
        const result = detectProvider('https://dev-12345.okta.com')

        expect(result.name).toBe('Okta')
        expect(result.reasons.length).toBeGreaterThan(0)
        expect(result.reasons.some((r) => r.includes('Okta'))).toBe(true)
      })

      it('should detect Auth0 by URL', () => {
        const result = detectProvider('https://tenant.auth0.com')

        expect(result.name).toBe('Auth0')
        expect(result.reasons.some((r) => r.includes('Auth0'))).toBe(true)
      })

      it('should detect Microsoft Entra ID by URL', () => {
        const result = detectProvider('https://login.microsoftonline.com/tenant-id/v2.0')

        expect(result.name).toBe('Microsoft Entra ID (Azure AD)')
        expect(result.reasons.some((r) => r.includes('Microsoft'))).toBe(true)
      })

      it('should detect Google by URL', () => {
        const result = detectProvider('https://accounts.google.com')

        expect(result.name).toBe('Google')
        expect(result.reasons.some((r) => r.includes('Google'))).toBe(true)
      })

      it('should detect AWS Cognito by URL', () => {
        const result = detectProvider(
          'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123'
        )

        expect(result.name).toBe('AWS Cognito')
        expect(result.reasons.some((r) => r.includes('Cognito'))).toBe(true)
      })

      it('should detect Ping Identity by URL with config', () => {
        // URL-based Ping detection requires config to be provided
        const config: Partial<OidcConfiguration> = {
          issuer: 'https://auth.pingone.com/tenant',
        }

        const result = detectProvider(
          'https://auth.pingone.com/tenant',
          config as OidcConfiguration
        )

        expect(result.name).toBe('Ping Identity')
        expect(result.reasons.some((r) => r.includes('Ping'))).toBe(true)
      })

      it('should detect Keycloak by URL', () => {
        const result = detectProvider('https://keycloak.example.com/realms/master')

        expect(result.name).toBe('Keycloak')
        expect(result.reasons.some((r) => r.includes('keycloak'))).toBe(true)
      })

      it('should detect ForgeRock by URL', () => {
        const result = detectProvider('https://openam.forgerock.io/oauth2')

        expect(result.name).toBe('ForgeRock')
        expect(result.reasons.some((r) => r.includes('ForgeRock'))).toBe(true)
      })

      it('should detect Salesforce by URL', () => {
        const result = detectProvider('https://login.salesforce.com')

        expect(result.name).toBe('Salesforce')
        expect(result.reasons.some((r) => r.includes('Salesforce'))).toBe(true)
      })

      it('should detect OneLogin by URL', () => {
        const result = detectProvider('https://company.onelogin.com/oidc/2')

        expect(result.name).toBe('OneLogin')
        expect(result.reasons.some((r) => r.includes('OneLogin'))).toBe(true)
      })

      it('should detect Duende IdentityServer by URL', () => {
        const result = detectProvider('https://demo.duendesoftware.com')

        expect(result.name).toBe('Duende IdentityServer')
        expect(result.reasons.some((r) => r.includes('Duende'))).toBe(true)
      })
    })

    describe('Config marker-based detection', () => {
      it('should detect Okta by config markers', () => {
        const config: Partial<OidcConfiguration> = {
          issuer: 'https://example.com',
          scopes_supported: ['openid', 'okta.users.read'],
        }

        const result = detectProvider('https://example.com', config as OidcConfiguration)

        expect(result.name).toBe('Okta')
        expect(result.reasons.some((r) => r.includes('Okta-specific markers'))).toBe(true)
      })

      it('should detect Auth0 by config markers', () => {
        const config: Partial<OidcConfiguration> = {
          issuer: 'https://example.auth0.com',
          device_code_validity_seconds: 300,
        }

        const result = detectProvider(
          'https://example.auth0.com',
          config as unknown as OidcConfiguration
        )

        expect(result.name).toBe('Auth0')
      })

      it('should detect Microsoft by config markers', () => {
        const config: Partial<OidcConfiguration> = {
          issuer: 'https://example.com',
          tenant_region_scope: 'NA',
          claims_supported: ['tid', 'acct', 'sub'],
        }

        const result = detectProvider('https://example.com', config as OidcConfiguration)

        expect(result.name).toBe('Microsoft Entra ID (Azure AD)')
      })

      it('should detect AWS Cognito by config markers', () => {
        const config: Partial<OidcConfiguration> = {
          issuer: 'https://cognito-idp.us-east-1.amazonaws.com/pool',
          claims_supported: ['cognito:username', 'cognito:groups', 'sub'],
        }

        const result = detectProvider(
          'https://cognito-idp.us-east-1.amazonaws.com/pool',
          config as OidcConfiguration
        )

        expect(result.name).toBe('AWS Cognito')
      })

      it('should detect Keycloak by config markers', () => {
        const config: Partial<OidcConfiguration> = {
          issuer: 'https://example.com/realms/master',
          token_endpoint: 'https://example.com/realms/master/protocol/openid-connect/token',
          authorization_endpoint: 'https://example.com/realms/master/protocol/openid-connect/auth',
        }

        const result = detectProvider(
          'https://example.com/realms/master',
          config as OidcConfiguration
        )

        expect(result.name).toBe('Keycloak')
      })

      it('should detect PingFederate by config markers', () => {
        const config: Partial<OidcConfiguration> = {
          issuer: 'https://example.com',
          ping_identity_version: '11.0',
          ping_provider_display_name: 'PingFederate',
        }

        const result = detectProvider('https://example.com', config as OidcConfiguration)

        expect(result.name).toBe('PingFederate')
      })

      it('should detect ForgeRock by config markers', () => {
        const config: Partial<OidcConfiguration> = {
          issuer: 'https://example.com',
          scopes_supported: ['openid', 'fr:idm:*'],
          userinfo_signing_alg_values_supported: ['RS256'],
          claims_parameter_supported: true,
        }

        const result = detectProvider('https://example.com', config as OidcConfiguration)

        expect(result.name).toBe('ForgeRock')
      })
    })

    describe('edge cases', () => {
      it('should return null for unknown provider', () => {
        const result = detectProvider('https://unknown-provider.example.com')

        expect(result.name).toBeNull()
        expect(result.reasons.length).toBeGreaterThan(0)
      })

      it('should return null for empty issuer', () => {
        const result = detectProvider('')

        expect(result.name).toBeNull()
      })

      it('should handle invalid URL gracefully', () => {
        const result = detectProvider('not-a-valid-url')

        expect(result.name).toBeNull()
      })

      it('should handle null config', () => {
        const result = detectProvider('https://example.com', undefined)

        expect(result.name).toBeNull()
      })

      it('should prioritize config markers over URL for detection', () => {
        // URL looks like Okta but config has Auth0 markers
        const config: Partial<OidcConfiguration> = {
          issuer: 'https://example.com',
          device_code_validity_seconds: 300,
          mfa_challenge_endpoint: 'https://example.com/mfa/challenge',
        }

        const result = detectProvider('https://example.com', config as unknown as OidcConfiguration)

        // Should detect based on config markers
        expect(result.name).toBe('Auth0')
      })

      it('should handle subdomains correctly', () => {
        // Should match okta.com subdomain
        const result1 = detectProvider('https://dev-123.okta.com')
        expect(result1.name).toBe('Okta')

        // Should NOT match fake-okta.com (contains okta but not subdomain)
        const result2 = detectProvider('https://fake-okta.com')
        expect(result2.name).toBeNull()
      })
    })
  })

  describe('formatJwkForDisplay', () => {
    it('should format JWK with all fields', () => {
      const jwk = {
        kid: 'key-123',
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
      }

      const result = formatJwkForDisplay(jwk)

      expect(result).toContain('Key ID: key-123')
      expect(result).toContain('Key Type: RSA')
      expect(result).toContain('Usage: Signature')
      expect(result).toContain('Algorithm: RS256')
    })

    it('should handle JWK with only kid', () => {
      const jwk = { kid: 'key-only' }

      const result = formatJwkForDisplay(jwk)

      expect(result).toContain('Key ID: key-only')
      expect(result).not.toContain('Key Type')
    })

    it('should handle JWK with only kty', () => {
      const jwk = { kty: 'EC' }

      const result = formatJwkForDisplay(jwk)

      expect(result).toContain('Key Type: EC')
      expect(result).not.toContain('Key ID')
    })

    it('should format sig usage as Signature', () => {
      const jwk = { use: 'sig' }

      const result = formatJwkForDisplay(jwk)

      expect(result).toContain('Usage: Signature')
    })

    it('should pass through other use values', () => {
      const jwk = { use: 'enc' }

      const result = formatJwkForDisplay(jwk)

      expect(result).toContain('Usage: enc')
    })

    it('should handle null input', () => {
      const result = formatJwkForDisplay(null)

      expect(result).toBe('No key provided')
    })

    it('should handle undefined input', () => {
      const result = formatJwkForDisplay(undefined)

      expect(result).toBe('No key provided')
    })

    it('should handle empty object', () => {
      const result = formatJwkForDisplay({})

      expect(result).toBe('')
    })
  })
})
