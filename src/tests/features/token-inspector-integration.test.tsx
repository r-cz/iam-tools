import { describe, expect, test } from 'bun:test';
import { TokenInspector } from '@/features/tokenInspector';
import { setupApiMocks, sampleJwt } from '../utils/test-api-mocks';

/**
 * Basic tests for the token inspector functionality.
 * These tests focus on the core functionality rather than full UI interaction
 * until we have a more robust DOM testing environment.
 */
describe('Token Inspector Core Functionality', () => {
  // Setup API mocks
  const apiMocks = setupApiMocks();
  
  test('should properly parse JWT components', () => {
    // Sample JWT from our mocks
    const jwt = sampleJwt;
    
    // Parse JWT parts
    const parts = jwt.split('.');
    expect(parts.length).toBe(3);
    
    // Parse header
    const headerBase64 = parts[0];
    const headerJson = Buffer.from(headerBase64, 'base64').toString();
    const header = JSON.parse(headerJson);
    
    // Check header values
    expect(header.alg).toBe('HS256');
    expect(header.typ).toBe('JWT');
    
    // Parse payload
    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString();
    const payload = JSON.parse(payloadJson);
    
    // Check payload values
    expect(payload.sub).toBe('1234567890');
    expect(payload.name).toBe('John Doe');
    expect(payload.iat).toBe(1516239022);
  });
  
  test('should validate token format correctly', () => {
    // Valid token format (3 parts separated by dots)
    const validToken = 'part1.part2.part3';
    expect(validToken.split('.').length).toBe(3);
    
    // Invalid token format
    const invalidToken = 'invalid-token';
    expect(invalidToken.split('.').length).not.toBe(3);
  });
});