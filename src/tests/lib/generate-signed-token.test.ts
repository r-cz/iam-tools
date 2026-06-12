import { afterEach, describe, expect, test } from 'bun:test'
import { getIssuerBaseUrl } from '@/lib/jwt/generate-signed-token'

const originalHref = window.location.href

afterEach(() => {
  setTestUrl(originalHref)
})

describe('getIssuerBaseUrl', () => {
  test('uses the local worker issuer for localhost dev ports', () => {
    setTestUrl('http://localhost:5174/token-inspector')

    expect(getIssuerBaseUrl()).toBe('http://localhost:8788/api')
  })

  test('uses the local worker issuer for 127.0.0.1 dev ports', () => {
    setTestUrl('http://127.0.0.1:5174/token-inspector')

    expect(getIssuerBaseUrl()).toBe('http://localhost:8788/api')
  })

  test('uses the current host for non-local deployments', () => {
    setTestUrl('https://iam-tools.example.com/token-inspector')

    expect(getIssuerBaseUrl()).toBe('https://iam-tools.example.com/api')
  })
})

function setTestUrl(url: string) {
  const happyDom = (window as Window & { happyDOM?: { setURL: (nextUrl: string) => void } })
    .happyDOM

  if (happyDom) {
    happyDom.setURL(url)
    return
  }

  window.history.pushState({}, '', url)
}
