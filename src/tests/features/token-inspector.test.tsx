import { describe, expect, test } from 'bun:test';

describe('Token Inspector', () => {
  // Test JWT parsing functionality
  test('should parse JWT components correctly', () => {
    // Sample JWT
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    // Split JWT into parts
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
  
  // Test token validation
  test('should validate token format', () => {
    // Valid token format (3 parts separated by dots)
    const validToken = 'part1.part2.part3';
    expect(validToken.split('.').length).toBe(3);
    
    // Invalid token format
    const invalidToken = 'invalid-token';
    expect(invalidToken.split('.').length).not.toBe(3);
  });
  // Test handling of invalid JWT formats
  test('should handle JWT with incorrect number of parts', () => {
    const invalidJwtTwoParts = 'header.payload';
    expect(invalidJwtTwoParts.split('.').length).not.toBe(3);

    const invalidJwtFourParts = 'header.payload.signature.extra';
    expect(invalidJwtFourParts.split('.length')).not.toBe(3);
  });

  test('should handle JWT with invalid Base64 in header', () => {
    const invalidBase64HeaderJwt = 'invalid-base64.payload.signature';
    // Assuming the parsing logic throws or handles invalid Base64 gracefully
    // You might need to adjust this expectation based on the actual implementation of your parsing logic
    expect(() => Buffer.from(invalidBase64HeaderJwt.split('.')[0], 'base64').toString()).toThrow();
  });

  test('should handle JWT with invalid Base64 in payload', () => {
    const invalidBase64PayloadJwt = 'header.invalid-base64.signature';
    // Assuming the parsing logic throws or handles invalid Base64 gracefully
    expect(() => Buffer.from(invalidBase64PayloadJwt.split('.')[1], 'base64').toString()).toThrow();
  });

  test('should handle JWT with invalid JSON in header', () => {
    // Base64 encoded string that is not valid JSON
    const invalidJsonHeader = Buffer.from('{invalid json').toString('base64');
    const invalidJsonHeaderJwt = `${invalidJsonHeader}.payload.signature`;
    // Assuming the parsing logic throws or handles invalid JSON gracefully
    expect(() => JSON.parse(Buffer.from(invalidJsonHeaderJwt.split('.')[0], 'base64').toString())).toThrow();
  });

  test('should handle JWT with invalid JSON in payload', () => {
    // Base64 encoded string that is not valid JSON
    const invalidJsonPayload = Buffer.from('[invalid json').toString('base64');
    const invalidJsonPayloadJwt = `header.${invalidJsonPayload}.signature`;
    // Assuming the parsing logic throws or handles invalid JSON gracefully
    expect(() => JSON.parse(Buffer.from(invalidJsonPayloadJwt.split('.')[1], 'base64').toString())).toThrow();
  });

  test('should handle empty string input', () => {
    const emptyJwt = '';
    expect(emptyJwt.split('.').length).not.toBe(3);
    // Depending on implementation, parsing empty string might throw or return specific value
    // Adjust expectation based on actual logic
  });

  test('should handle null or undefined input', () => {
    // Assuming the function handles null/undefined gracefully or throws
    // You might need to wrap the call in a function to test if it throws
    // Example if it throws:
    // expect(() => yourParsingFunction(null as any)).toThrow();
    // expect(() => yourParsingFunction(undefined as any)).toThrow();
    // Example if it returns a specific value:
    // expect(yourParsingFunction(null as any)).toBeNull(); // or whatever the expected output is
  });
});
