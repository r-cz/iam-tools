import { describe, expect, test } from 'bun:test'
import { isIdentityMetadataPath } from '@/lib/network/identity-metadata-path'

describe('identity metadata path classification', () => {
  test.each([
    '/.well-known/openid-configuration',
    '/tenant/.well-known/oauth-authorization-server',
    '/oauth2/v1/certs',
    '/keys',
    '/JWKS.json',
    '/saml/metadata',
    '/FederationMetadata/2007-06/FederationMetadata.xml',
  ])('allows metadata path %s', (pathname) => {
    expect(isIdentityMetadataPath(pathname)).toBe(true)
  })

  test.each(['/token', '/authorize', '/api/users', '/metadata.txt', '/saml/login'])(
    'rejects non-metadata path %s',
    (pathname) => {
      expect(isIdentityMetadataPath(pathname)).toBe(false)
    }
  )
})
