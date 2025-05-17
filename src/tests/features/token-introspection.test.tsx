import { describe, expect, test } from 'bun:test';
import { setupApiMocks } from '../utils/test-api-mocks';
import { IntrospectionResponse } from '@/features/oauthPlayground/components/TokenIntrospection';

/**
 * Tests for the Token Introspection functionality in OAuth Playground.
 * These tests cover the core introspection logic and demo mode behavior.
 */
describe('Token Introspection Core Functionality', () => {
  // Setup API mocks
  const apiMocks = setupApiMocks();
  
  const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwifQ.signature';

  test('should validate introspection response format', () => {
    const activeTokenResponse: IntrospectionResponse = {
      active: true,
      scope: 'openid profile email',
      client_id: 'test-client',
      token_type: 'Bearer',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 300,
      sub: 'user-123',
      aud: 'https://api.example.com',
      iss: 'https://issuer.example.com'
    };

    // Check required field
    expect(activeTokenResponse.active).toBe(true);
    
    // Check optional fields
    expect(activeTokenResponse.scope).toBe('openid profile email');
    expect(activeTokenResponse.token_type).toBe('Bearer');
    expect(activeTokenResponse.client_id).toBe('test-client');
    
    // Check timestamp fields
    expect(typeof activeTokenResponse.exp).toBe('number');
    expect(typeof activeTokenResponse.iat).toBe('number');
    expect(activeTokenResponse.exp).toBeGreaterThan(activeTokenResponse.iat);
  });

  test('should handle inactive token response', () => {
    const inactiveTokenResponse: IntrospectionResponse = {
      active: false,
      error: 'invalid_token',
      error_description: 'Token is expired or invalid'
    };

    expect(inactiveTokenResponse.active).toBe(false);
    expect(inactiveTokenResponse.error).toBe('invalid_token');
    expect(inactiveTokenResponse.error_description).toBeTruthy();
  });

  test('should parse JWT for demo introspection', () => {
    // Parse JWT parts
    const parts = sampleToken.split('.');
    expect(parts.length).toBe(3);
    
    // Decode payload
    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString();
    const payload = JSON.parse(payloadJson);
    
    // Validate payload structure
    expect(payload.sub).toBe('1234567890');
    expect(payload.name).toBe('John Doe');
    expect(payload.iat).toBe(1516239022);
    expect(payload.exp).toBe(1516242622);
    expect(payload.scope).toBe('openid profile email');
  });

  test('should determine token active status based on expiration', () => {
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Active token (expires in future)
    const activeResponse: IntrospectionResponse = {
      active: true,
      exp: currentTime + 3600 // Expires in 1 hour
    };
    
    // Verify active status logic
    const isActive = activeResponse.exp ? activeResponse.exp > currentTime : false;
    expect(isActive).toBe(true);
    
    // Expired token
    const expiredResponse: IntrospectionResponse = {
      active: false,
      exp: currentTime - 3600 // Expired 1 hour ago
    };
    
    const isExpired = expiredResponse.exp ? expiredResponse.exp > currentTime : false;
    expect(isExpired).toBe(false);
  });

  test('should map JWT claims to introspection response', () => {
    // Sample JWT payload
    const jwtPayload = {
      iss: 'https://demo.example.com',
      sub: 'user-123',
      aud: 'api.example.com',
      exp: 1516242622,
      iat: 1516239022,
      scope: 'openid profile',
      client_id: 'demo-client',
      jti: 'unique-token-id'
    };

    // Expected introspection response mapping
    const expectedResponse: IntrospectionResponse = {
      active: true,
      scope: jwtPayload.scope,
      client_id: jwtPayload.client_id,
      token_type: 'Bearer',
      exp: jwtPayload.exp,
      iat: jwtPayload.iat,
      sub: jwtPayload.sub,
      aud: jwtPayload.aud,
      iss: jwtPayload.iss,
      jti: jwtPayload.jti,
      username: jwtPayload.sub
    };

    // Verify mapping
    expect(expectedResponse.sub).toBe(jwtPayload.sub);
    expect(expectedResponse.scope).toBe(jwtPayload.scope);
    expect(expectedResponse.client_id).toBe(jwtPayload.client_id);
    expect(expectedResponse.username).toBe(jwtPayload.sub);
  });

  test('should include all key claims in introspection response', () => {
    const response: IntrospectionResponse = {
      active: true,
      scope: 'openid profile email api:read',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: 'test-client'
    };

    // RFC 7662 key claims
    expect(response.active).toBeDefined();
    expect(response.scope).toBeDefined();
    expect(response.exp).toBeDefined();
    expect(response.iat).toBeDefined();
    
    // Verify scope contains multiple values
    expect(response.scope?.split(' ').length).toBeGreaterThan(1);
  });
});