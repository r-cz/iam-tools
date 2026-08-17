import { afterEach, describe, expect, test } from 'bun:test'
import { getIssuerBaseUrl } from '@/features/oauthPlayground/utils/demo-issuer'

const originalHref = window.location.href
afterEach(() => window.happyDOM.setURL(originalHref))

describe('demo Worker issuer', () => {
  test('uses the local Worker for loopback development hosts', () => {
    window.happyDOM.setURL('http://localhost:5174/token-inspector')
    expect(getIssuerBaseUrl()).toBe('http://localhost:8788/api')
    window.happyDOM.setURL('http://127.0.0.1:5174/token-inspector')
    expect(getIssuerBaseUrl()).toBe('http://localhost:8788/api')
  })

  test('uses the same deployed host outside local development', () => {
    window.happyDOM.setURL('https://iam-tools.example.com/token-inspector')
    expect(getIssuerBaseUrl()).toBe('https://iam-tools.example.com/api')
  })
})
