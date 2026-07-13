import { describe, expect, test } from 'bun:test'
import {
  DEMO_CALLBACK_PATH,
  isAllowedDemoRedirectUri,
} from '@/features/oauthPlayground/utils/demo-redirect'

describe('demo OAuth redirect validation', () => {
  test('allows only the app callback by default', () => {
    expect(
      isAllowedDemoRedirectUri(
        `https://iam.tools${DEMO_CALLBACK_PATH}`,
        'https://iam.tools/api/auth'
      )
    ).toBe(true)
    expect(
      isAllowedDemoRedirectUri('https://evil.example/callback', 'https://iam.tools/api/auth')
    ).toBe(false)
    expect(
      isAllowedDemoRedirectUri(
        `https://iam.tools${DEMO_CALLBACK_PATH}?next=evil`,
        'https://iam.tools/api/auth'
      )
    ).toBe(false)
  })

  test('allows local app callbacks across development ports', () => {
    expect(
      isAllowedDemoRedirectUri(
        `http://127.0.0.1:5173${DEMO_CALLBACK_PATH}`,
        'http://localhost:8788/api/auth'
      )
    ).toBe(true)
  })

  test('supports explicit exact registrations without allowing unsafe URI shapes', () => {
    const registered = 'https://client.example.com/oauth/callback'
    expect(isAllowedDemoRedirectUri(registered, 'https://iam.tools/api/auth', [registered])).toBe(
      true
    )
    expect(
      isAllowedDemoRedirectUri(`${registered}?extra=true`, 'https://iam.tools/api/auth', [
        registered,
      ])
    ).toBe(false)
    expect(
      isAllowedDemoRedirectUri('javascript:alert(1)', 'https://iam.tools/api/auth', [
        'javascript:alert(1)',
      ])
    ).toBe(false)
  })
})
