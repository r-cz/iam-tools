import { beforeEach, describe, expect, test } from 'bun:test'
import { proxyFetch } from '@/lib/proxy-fetch'

type FetchCall = Parameters<typeof fetch>

let fetchCalls: FetchCall[] = []

const fetchStub = async (...args: FetchCall) => {
  fetchCalls.push(args)
  return {
    ok: true,
    status: 200,
  } as Response
}

const getProxyBase = () =>
  ((import.meta as any)?.env?.DEV
    ? 'http://localhost:8788/api/cors-proxy/'
    : '/api/cors-proxy/') as string

describe('proxyFetch', () => {
  beforeEach(() => {
    fetchCalls = []
    if (globalThis.window) {
      globalThis.window.location.hostname = 'app.example.com'
    }
  })

  test('proxies well-known configuration requests', async () => {
    const targetUrl = 'https://issuer.com/.well-known/openid-configuration'
    await proxyFetch(targetUrl, undefined, fetchStub)

    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0][0]).toBe(getProxyBase() + encodeURIComponent(targetUrl))
  })

  test('proxies JWKS endpoint requests', async () => {
    const targetUrl = 'https://issuer.com/oauth2/v1/certs'
    await proxyFetch(targetUrl, undefined, fetchStub)

    expect(fetchCalls[0][0]).toBe(getProxyBase() + encodeURIComponent(targetUrl))
  })

  test('proxies SAML metadata requests', async () => {
    const targetUrl = 'https://idp.example.com/FederationMetadata/2007-06/FederationMetadata.xml'
    await proxyFetch(targetUrl, undefined, fetchStub)

    expect(fetchCalls[0][0]).toBe(getProxyBase() + encodeURIComponent(targetUrl))
  })

  test('bypasses proxy for same-domain requests', async () => {
    const sameDomainUrl = 'https://app.example.com/api/data'
    await proxyFetch(sameDomainUrl, undefined, fetchStub)

    expect(fetchCalls[0][0]).toBe(sameDomainUrl)
  })

  test('bypasses proxy for localhost targets', async () => {
    const localhostUrl = 'http://127.0.0.1:8787/health'
    await proxyFetch(localhostUrl, undefined, fetchStub)

    expect(fetchCalls[0][0]).toBe(localhostUrl)
  })

  test('returns direct fetch for invalid URLs', async () => {
    const invalidUrl = 'not-a-valid-url'
    await proxyFetch(invalidUrl, undefined, fetchStub)

    expect(fetchCalls[0][0]).toBe(invalidUrl)
  })
})
