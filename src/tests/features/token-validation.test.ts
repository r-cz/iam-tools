import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { determineTokenType, validateToken } from '@/features/tokenInspector/utils/token-validation'

describe('Token Validation', () => {
  // Store original Date.now for restoration
  const originalDateNow = Date.now

  afterEach(() => {
    // Restore Date.now after each test
    Date.now = originalDateNow
  })

  describe('determineTokenType', () => {
    it('should detect access token by at+jwt header type', () => {
      const header = { alg: 'RS256', typ: 'at+jwt' }
      const payload = { sub: 'user123' }

      expect(determineTokenType(header, payload)).toBe('access_token')
    })

    it('should detect access token by application/at+jwt header type', () => {
      const header = { alg: 'RS256', typ: 'application/at+jwt' }
      const payload = { sub: 'user123' }

      expect(determineTokenType(header, payload)).toBe('access_token')
    })

    it('should detect ID token by nonce claim', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', nonce: 'abc123' }

      expect(determineTokenType(header, payload)).toBe('id_token')
    })

    it('should detect ID token by at_hash claim', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', at_hash: 'hash123' }

      expect(determineTokenType(header, payload)).toBe('id_token')
    })

    it('should detect ID token by c_hash claim', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', c_hash: 'hash123' }

      expect(determineTokenType(header, payload)).toBe('id_token')
    })

    it('should detect ID token by sid claim', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', sid: 'session123' }

      expect(determineTokenType(header, payload)).toBe('id_token')
    })

    it('should detect ID token by auth_time with JWT type', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', auth_time: 1234567890 }

      expect(determineTokenType(header, payload)).toBe('id_token')
    })

    it('should detect access token by scope claim', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', scope: 'openid profile' }

      expect(determineTokenType(header, payload)).toBe('access_token')
    })

    it('should detect access token by scp claim', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', scp: ['openid', 'profile'] }

      expect(determineTokenType(header, payload)).toBe('access_token')
    })

    it('should detect access token by client_id claim', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', client_id: 'my-client' }

      expect(determineTokenType(header, payload)).toBe('access_token')
    })

    it('should detect access token by azp without nonce', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', azp: 'my-client' }

      expect(determineTokenType(header, payload)).toBe('access_token')
    })

    it('should detect access token by roles claim', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', roles: ['admin'] }

      expect(determineTokenType(header, payload)).toBe('access_token')
    })

    it('should detect access token by permissions claim', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = { sub: 'user123', permissions: ['read:users'] }

      expect(determineTokenType(header, payload)).toBe('access_token')
    })

    it('should detect ID token for minimal token with standard claims but no scope', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = {
        iss: 'https://issuer.com',
        sub: 'user123',
        aud: 'client123',
        exp: 1234567890,
        iat: 1234567800,
      }

      expect(determineTokenType(header, payload)).toBe('id_token')
    })

    it('should detect access token for minimal token with standard claims and scope', () => {
      const header = { alg: 'RS256', typ: 'JWT' }
      const payload = {
        iss: 'https://issuer.com',
        sub: 'user123',
        aud: 'client123',
        exp: 1234567890,
        iat: 1234567800,
        scope: 'openid',
      }

      expect(determineTokenType(header, payload)).toBe('access_token')
    })

    it('should return unknown for empty payload', () => {
      const header = { alg: 'RS256' }
      const payload = {}

      expect(determineTokenType(header, payload)).toBe('unknown')
    })
  })

  describe('validateToken', () => {
    describe('header validation', () => {
      it('should error when alg is missing', () => {
        const header = { typ: 'JWT' }
        const payload = { sub: 'user123' }

        const results = validateToken(header, payload, 'id_token')

        const algResult = results.find((r) => r.claim === 'header.alg')
        expect(algResult).toBeDefined()
        expect(algResult?.valid).toBe(false)
        expect(algResult?.severity).toBe('error')
      })

      it('should error when alg is none', () => {
        const header = { alg: 'none', typ: 'JWT' }
        const payload = { sub: 'user123' }

        const results = validateToken(header, payload, 'id_token')

        const algResult = results.find((r) => r.claim === 'header.alg')
        expect(algResult).toBeDefined()
        expect(algResult?.valid).toBe(false)
        expect(algResult?.message).toContain('not secure')
      })

      it('should accept HS256 algorithm', () => {
        const header = { alg: 'HS256', typ: 'JWT', kid: 'key1' }
        const payload = { sub: 'user123' }

        const results = validateToken(header, payload, 'id_token')

        const algResult = results.find(
          (r) => r.claim === 'header.alg' && r.message?.includes('HMAC')
        )
        expect(algResult).toBeDefined()
        expect(algResult?.valid).toBe(true)
      })

      it('should accept RS256 algorithm', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const payload = { sub: 'user123' }

        const results = validateToken(header, payload, 'id_token')

        const algResult = results.find(
          (r) => r.claim === 'header.alg' && r.message?.includes('RSA')
        )
        expect(algResult).toBeDefined()
        expect(algResult?.valid).toBe(true)
      })

      it('should accept ES256 algorithm', () => {
        const header = { alg: 'ES256', typ: 'JWT', kid: 'key1' }
        const payload = { sub: 'user123' }

        const results = validateToken(header, payload, 'id_token')

        const algResult = results.find(
          (r) => r.claim === 'header.alg' && r.message?.includes('ECDSA')
        )
        expect(algResult).toBeDefined()
        expect(algResult?.valid).toBe(true)
      })

      it('should warn when typ is missing', () => {
        const header = { alg: 'RS256', kid: 'key1' }
        const payload = { sub: 'user123' }

        const results = validateToken(header, payload, 'id_token')

        const typResult = results.find((r) => r.claim === 'header.typ')
        expect(typResult).toBeDefined()
        expect(typResult?.valid).toBe(false)
        expect(typResult?.severity).toBe('warning')
      })

      it('should validate at+jwt typ for access tokens', () => {
        const header = { alg: 'RS256', typ: 'at+jwt', kid: 'key1' }
        const payload = { sub: 'user123' }

        const results = validateToken(header, payload, 'access_token')

        const typResult = results.find(
          (r) => r.claim === 'header.typ' && r.message?.includes('RFC 9068')
        )
        expect(typResult).toBeDefined()
        expect(typResult?.valid).toBe(true)
      })

      it('should warn when kid is missing', () => {
        const header = { alg: 'RS256', typ: 'JWT' }
        const payload = { sub: 'user123' }

        const results = validateToken(header, payload, 'id_token')

        const kidResult = results.find((r) => r.claim === 'header.kid')
        expect(kidResult).toBeDefined()
        expect(kidResult?.valid).toBe(false)
        expect(kidResult?.severity).toBe('warning')
      })
    })

    describe('ID token validation', () => {
      it('should error when required claims are missing', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const payload = {}

        const results = validateToken(header, payload, 'id_token')

        const requiredClaims = ['iss', 'sub', 'aud', 'exp', 'iat']
        for (const claim of requiredClaims) {
          const result = results.find(
            (r) => r.claim === claim && r.message?.includes('Required claim')
          )
          expect(result).toBeDefined()
          expect(result?.valid).toBe(false)
          expect(result?.severity).toBe('error')
        }
      })

      it('should warn when nonce is missing', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          aud: 'client123',
          exp: 1234567890,
          iat: 1234567800,
        }

        const results = validateToken(header, payload, 'id_token')

        const nonceResult = results.find((r) => r.claim === 'nonce')
        expect(nonceResult).toBeDefined()
        expect(nonceResult?.valid).toBe(false)
        expect(nonceResult?.severity).toBe('warning')
      })

      it('should report at_hash when present', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          aud: 'client123',
          exp: 1234567890,
          iat: 1234567800,
          at_hash: 'hash123',
        }

        const results = validateToken(header, payload, 'id_token')

        const atHashResult = results.find((r) => r.claim === 'at_hash')
        expect(atHashResult).toBeDefined()
        expect(atHashResult?.valid).toBe(true)
      })
    })

    describe('Access token validation', () => {
      it('should check for RFC 9068 required claims', () => {
        const header = { alg: 'RS256', typ: 'at+jwt', kid: 'key1' }
        const payload = {}

        const results = validateToken(header, payload, 'access_token')

        const requiredClaims = ['iss', 'exp', 'aud', 'sub', 'iat']
        for (const claim of requiredClaims) {
          const result = results.find(
            (r) => r.claim === claim && r.message?.includes('Required claim')
          )
          expect(result).toBeDefined()
          expect(result?.valid).toBe(false)
        }
      })

      it('should accept azp as alternative to client_id', () => {
        const header = { alg: 'RS256', typ: 'at+jwt', kid: 'key1' }
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          aud: 'resource',
          exp: 1234567890,
          iat: 1234567800,
          azp: 'my-client',
        }

        const results = validateToken(header, payload, 'access_token')

        const azpResult = results.find((r) => r.claim === 'azp')
        expect(azpResult).toBeDefined()
        expect(azpResult?.valid).toBe(true)
        expect(azpResult?.message).toContain('azp')
      })

      it('should warn when scope is missing', () => {
        const header = { alg: 'RS256', typ: 'at+jwt', kid: 'key1' }
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          aud: 'resource',
          exp: 1234567890,
          iat: 1234567800,
        }

        const results = validateToken(header, payload, 'access_token')

        const scopeResult = results.find((r) => r.claim === 'scope/scp')
        expect(scopeResult).toBeDefined()
        expect(scopeResult?.valid).toBe(false)
        expect(scopeResult?.severity).toBe('warning')
      })

      it('should accept scope claim', () => {
        const header = { alg: 'RS256', typ: 'at+jwt', kid: 'key1' }
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          aud: 'resource',
          exp: 1234567890,
          iat: 1234567800,
          scope: 'openid profile',
        }

        const results = validateToken(header, payload, 'access_token')

        const scopeResult = results.find((r) => r.claim === 'scope')
        expect(scopeResult).toBeDefined()
        expect(scopeResult?.valid).toBe(true)
      })

      it('should validate authorization claims as arrays', () => {
        const header = { alg: 'RS256', typ: 'at+jwt', kid: 'key1' }
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          aud: 'resource',
          exp: 1234567890,
          iat: 1234567800,
          roles: ['admin', 'user'],
        }

        const results = validateToken(header, payload, 'access_token')

        const rolesResult = results.find(
          (r) => r.claim === 'roles' && r.message?.includes('authorization claim')
        )
        expect(rolesResult).toBeDefined()
        expect(rolesResult?.valid).toBe(true)
      })

      it('should warn when authorization claims are not arrays', () => {
        const header = { alg: 'RS256', typ: 'at+jwt', kid: 'key1' }
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          aud: 'resource',
          exp: 1234567890,
          iat: 1234567800,
          roles: 'admin', // Should be array
        }

        const results = validateToken(header, payload, 'access_token')

        const rolesResult = results.find(
          (r) => r.claim === 'roles' && r.message?.includes('not in the expected array format')
        )
        expect(rolesResult).toBeDefined()
        expect(rolesResult?.valid).toBe(false)
        expect(rolesResult?.severity).toBe('warning')
      })
    })

    describe('common claims validation', () => {
      it('should validate issuer is a valid URL', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const payload = {
          iss: 'https://issuer.example.com',
          sub: 'user123',
        }

        const results = validateToken(header, payload, 'id_token')

        const issResult = results.find((r) => r.claim === 'iss' && r.message?.includes('valid URL'))
        expect(issResult).toBeDefined()
        expect(issResult?.valid).toBe(true)
      })

      it('should warn when issuer is not a valid URL', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const payload = {
          iss: 'not-a-url',
          sub: 'user123',
        }

        const results = validateToken(header, payload, 'id_token')

        const issResult = results.find(
          (r) => r.claim === 'iss' && r.message?.includes('not a valid URL')
        )
        expect(issResult).toBeDefined()
        expect(issResult?.valid).toBe(false)
      })

      it('should error when token is expired', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const pastTime = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          exp: pastTime,
        }

        const results = validateToken(header, payload, 'id_token')

        const expResult = results.find((r) => r.claim === 'exp' && r.message?.includes('expired'))
        expect(expResult).toBeDefined()
        expect(expResult?.valid).toBe(false)
        expect(expResult?.severity).toBe('error')
      })

      it('should report valid expiration for non-expired token', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          exp: futureTime,
        }

        const results = validateToken(header, payload, 'id_token')

        const expResult = results.find(
          (r) => r.claim === 'exp' && r.message?.includes('expires in')
        )
        expect(expResult).toBeDefined()
        expect(expResult?.valid).toBe(true)
      })

      it('should error when nbf is in the future', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          nbf: futureTime,
        }

        const results = validateToken(header, payload, 'id_token')

        const nbfResult = results.find(
          (r) => r.claim === 'nbf' && r.message?.includes('not yet valid')
        )
        expect(nbfResult).toBeDefined()
        expect(nbfResult?.valid).toBe(false)
        expect(nbfResult?.severity).toBe('error')
      })

      it('should accept nbf when in the past', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const pastTime = Math.floor(Date.now() / 1000) - 60 // 1 minute ago
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          nbf: pastTime,
        }

        const results = validateToken(header, payload, 'id_token')

        const nbfResult = results.find(
          (r) => r.claim === 'nbf' && r.message?.includes('currently valid')
        )
        expect(nbfResult).toBeDefined()
        expect(nbfResult?.valid).toBe(true)
      })

      it('should warn when token is more than 24 hours old', () => {
        const header = { alg: 'RS256', typ: 'JWT', kid: 'key1' }
        const oldTime = Math.floor(Date.now() / 1000) - 86401 // More than 24 hours ago
        const payload = {
          iss: 'https://issuer.com',
          sub: 'user123',
          iat: oldTime,
        }

        const results = validateToken(header, payload, 'id_token')

        const iatWarning = results.find(
          (r) => r.claim === 'iat' && r.message?.includes('quite old')
        )
        expect(iatWarning).toBeDefined()
        expect(iatWarning?.valid).toBe(false)
        expect(iatWarning?.severity).toBe('warning')
      })
    })
  })
})
