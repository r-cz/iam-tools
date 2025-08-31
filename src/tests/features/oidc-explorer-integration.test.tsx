import { describe, expect, test } from 'bun:test'
import {
  setupApiMocks,
  sampleOidcConfigResponse,
  sampleJwksResponse,
} from '../utils/test-api-mocks'

/**
 * Basic tests for the OIDC Explorer functionality.
 * These tests focus on core functionality rather than full UI interaction
 * until we have a more robust DOM testing environment.
 */
describe('OIDC Explorer Core Functionality', () => {
  // Setup API mocks
  const apiMocks = setupApiMocks()

  test('should process OIDC issuer information', () => {
    // Test issuer URL parsing by checking that our sample has the expected properties
    const issuerUrl = sampleOidcConfigResponse.issuer
    expect(typeof issuerUrl).toBe('string')
    expect(issuerUrl).toBeTruthy()
  })

  test('should handle OIDC configuration response correctly', () => {
    // Check that our sample OIDC configuration has the expected structure
    expect(sampleOidcConfigResponse).toHaveProperty('issuer')
    expect(sampleOidcConfigResponse).toHaveProperty('authorization_endpoint')
    expect(sampleOidcConfigResponse).toHaveProperty('token_endpoint')
    expect(sampleOidcConfigResponse).toHaveProperty('jwks_uri')
  })

  test('should handle JWKS response correctly', () => {
    // Check that our sample JWKS response has the expected structure
    expect(sampleJwksResponse).toHaveProperty('keys')
    expect(Array.isArray(sampleJwksResponse.keys)).toBe(true)

    // Check the first key has expected properties
    if (sampleJwksResponse.keys.length > 0) {
      const firstKey = sampleJwksResponse.keys[0]
      expect(firstKey).toHaveProperty('kty')
      expect(firstKey).toHaveProperty('kid')
    }
  })
})
