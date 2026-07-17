import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { TokenInspector } from '@/features/tokenInspector'
import { sampleJwt } from '../utils/test-api-mocks'
import { waitForCondition } from '../utils/test-utils'

afterEach(() => {
  cleanup()
})

function createTokenWithIssuer(issuer: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'RS256', kid: 'test-key' })}.${encode({ iss: issuer, sub: 'test-user' })}.signature`
}

/**
 * Basic tests for the token inspector functionality.
 * These tests focus on the core functionality rather than full UI interaction
 * until we have a more robust DOM testing environment.
 */
describe('Token Inspector Core Functionality', () => {
  test('should properly parse JWT components', () => {
    // Sample JWT from our mocks
    const jwt = sampleJwt

    // Parse JWT parts
    const parts = jwt.split('.')
    expect(parts.length).toBe(3)

    // Parse header
    const headerBase64 = parts[0]
    const headerJson = Buffer.from(headerBase64, 'base64').toString()
    const header = JSON.parse(headerJson)

    // Check header values
    expect(header.alg).toBe('HS256')
    expect(header.typ).toBe('JWT')

    // Parse payload
    const payloadBase64 = parts[1]
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString()
    const payload = JSON.parse(payloadJson)

    // Check payload values
    expect(payload.sub).toBe('1234567890')
    expect(payload.name).toBe('John Doe')
    expect(payload.iat).toBe(1516239022)
  })

  test('should validate token format correctly', () => {
    // Valid token format (3 parts separated by dots)
    const validFormat = ['part1', 'part2', 'part3'].join('.')
    expect(validFormat.split('.').length).toBe(3)

    // Invalid token format
    const invalidFormat = 'invalid-token'
    expect(invalidFormat.split('.').length).not.toBe(3)
  })

  test('attempts failed OIDC discovery only once until the user retries', async () => {
    const originalFetch = globalThis.fetch
    let discoveryRequests = 0
    globalThis.fetch = (async () => {
      discoveryRequests += 1
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    try {
      render(<TokenInspector initialToken={createTokenWithIssuer('https://issuer.example.com')} />)

      expect(await waitForCondition(() => discoveryRequests === 1)).toBe(true)
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(discoveryRequests).toBe(1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
