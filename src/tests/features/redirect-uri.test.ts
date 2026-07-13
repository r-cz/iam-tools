import { describe, expect, it } from 'bun:test'
import {
  analyzeRedirectUri,
  parseRegisteredRedirects,
} from '@/features/redirect-uri/utils/redirect-uri'

describe('OAuth redirect URI analysis', () => {
  it('deduplicates and trims registered redirect lines', () => {
    expect(
      parseRegisteredRedirects(
        ' https://a.example/cb \n\nhttps://a.example/cb\nhttps://b.example/cb '
      )
    ).toEqual(['https://a.example/cb', 'https://b.example/cb'])
  })

  it('accepts an exact HTTPS registration match', () => {
    const result = analyzeRedirectUri(
      'https://app.example/callback?tenant=acme',
      'https://app.example/callback?tenant=acme'
    )

    expect(result.matchType).toBe('exact')
    expect(result.safeToSend).toBe(true)
    expect(result.findings.map((item) => item.code)).toContain('exact-match')
    expect(result.findings.map((item) => item.code)).toContain('query-retention')
  })

  it('rejects fragments and normalized-only web matches', () => {
    const fragment = analyzeRedirectUri(
      'https://app.example/callback#result',
      'https://app.example/callback#result'
    )
    expect(fragment.safeToSend).toBe(false)
    expect(fragment.findings.map((item) => item.code)).toContain('fragment-prohibited')

    const normalized = analyzeRedirectUri(
      'https://APP.example/callback',
      'https://app.example/callback'
    )
    expect(normalized.matchType).toBe('normalized-only')
    expect(normalized.findings.map((item) => item.code)).toContain('not-exact')
  })

  it('supports the native loopback dynamic-port exception', () => {
    const result = analyzeRedirectUri(
      'http://127.0.0.1:51004/oauth/callback',
      'http://127.0.0.1:49152/oauth/callback'
    )

    expect(result.matchType).toBe('loopback-port')
    expect(result.safeToSend).toBe(true)
    expect(result.findings.map((item) => item.code)).toContain('loopback-port-match')
  })

  it('blocks insecure, wildcard, and dangerous redirect patterns', () => {
    const insecure = analyzeRedirectUri('http://app.example/callback', 'https://*.example/callback')
    expect(insecure.safeToSend).toBe(false)
    expect(insecure.findings.map((item) => item.code)).toContain('insecure-http')
    expect(insecure.findings.map((item) => item.code)).toContain('wildcard-registration')

    const dangerous = analyzeRedirectUri('javascript:alert(1)', 'javascript:alert(1)')
    expect(dangerous.safeToSend).toBe(false)
    expect(dangerous.findings.map((item) => item.code)).toContain('dangerous-scheme')
  })

  it('blocks exact matches for unsupported registered and unknown schemes', () => {
    for (const uri of [
      'mailto:user@example.com',
      'ftp://example.com/callback',
      'myapp:/oauth/callback',
      'my.app+oauth:/callback',
    ]) {
      const result = analyzeRedirectUri(uri, uri)

      expect(result.matchType).toBe('exact')
      expect(result.safeToSend).toBe(false)
      expect(result.findings.map((item) => item.code)).toContain('unsupported-scheme')
    }
  })

  it('allows an exact reverse-domain private-use scheme match', () => {
    const uri = 'com.example.app:/oauth/callback'
    const result = analyzeRedirectUri(uri, uri)

    expect(result.matchType).toBe('exact')
    expect(result.safeToSend).toBe(true)
    expect(result.findings.map((item) => item.code)).toContain('custom-scheme')
  })

  it('does not claim allowlist safety without registrations', () => {
    const result = analyzeRedirectUri('https://app.example/callback', '')
    expect(result.safeToSend).toBe(false)
    expect(result.findings.map((item) => item.code)).toContain('no-registrations')
  })
})
