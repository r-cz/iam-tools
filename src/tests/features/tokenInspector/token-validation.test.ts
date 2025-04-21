// src/tests/features/tokenInspector/token-validation.test.ts
import { describe, expect, test } from 'bun:test';
import { 
  determineTokenType, 
  validateToken 
} from '../../../features/tokenInspector/utils/token-validation';
import { TokenType } from '../../../features/tokenInspector/utils/types';

describe('Token Validation', () => {
  describe('determineTokenType', () => {
    // Test RFC9068 OAuth JWT Access Token detection
    test('should identify RFC9068 OAuth JWT Access Tokens', () => {
      // Test with typ = at+jwt
      expect(determineTokenType({ typ: 'at+jwt' }, {})).toBe('access_token');
      
      // Test with typ = application/at+jwt
      expect(determineTokenType({ typ: 'application/at+jwt' }, {})).toBe('access_token');
    });

    // Test ID Token detection
    test('should identify ID Tokens based on specific claims', () => {
      // Test with nonce
      expect(determineTokenType({}, { nonce: 'abc123' })).toBe('id_token');
      
      // Test with at_hash
      expect(determineTokenType({}, { at_hash: 'hash123' })).toBe('id_token');
      
      // Test with c_hash
      expect(determineTokenType({}, { c_hash: 'hash123' })).toBe('id_token');
      
      // Test with sid
      expect(determineTokenType({}, { sid: 'session123' })).toBe('id_token');
      
      // Test with auth_time and type JWT
      expect(determineTokenType({ typ: 'JWT' }, { auth_time: 1617293113 })).toBe('id_token');
    });

    // Test Access Token detection
    test('should identify Access Tokens based on specific claims', () => {
      // Test with scope
      expect(determineTokenType({}, { scope: 'openid profile' })).toBe('access_token');
      
      // Test with scp
      expect(determineTokenType({}, { scp: ['openid', 'profile'] })).toBe('access_token');
      
      // Test with azp but no nonce
      expect(determineTokenType({}, { azp: 'client123' })).toBe('access_token');
      
      // Test with client_id
      expect(determineTokenType({}, { client_id: 'client123' })).toBe('access_token');
      
      // Test with authorities
      expect(determineTokenType({ typ: 'JWT' }, { authorities: ['READ', 'WRITE'] })).toBe('access_token');
      
      // Test with roles
      expect(determineTokenType({ typ: 'JWT' }, { roles: ['admin', 'user'] })).toBe('access_token');
    });

    // Test with standard claims but no specific markers
    test('should identify tokens with standard claims based on scope', () => {
      const standardClaims = {
        iss: 'https://example.com',
        sub: 'user123',
        aud: 'client123',
        exp: 1617293113,
        iat: 1617289513
      };
      
      // With scope - should be Access Token
      expect(determineTokenType({}, { ...standardClaims, scope: 'openid profile' })).toBe('access_token');
      
      // Without scope - should be ID Token
      expect(determineTokenType({}, standardClaims)).toBe('id_token');
    });

    // Test unknown token type
    test('should identify unknown token types', () => {
      // Empty header and payload
      expect(determineTokenType({}, {})).toBe('unknown');
      
      // Only some basic claims
      expect(determineTokenType({}, { sub: 'user123' })).toBe('unknown');
    });
  });

  describe('validateToken', () => {
    // Test header validation
    test('should validate token headers', () => {
      // Test with missing alg
      const resultsNoAlg = validateToken({}, {}, 'id_token');
      expect(resultsNoAlg.find(r => r.claim === 'header.alg')?.valid).toBe(false);
      
      // Test with alg: none
      const resultsNoneAlg = validateToken({ alg: 'none' }, {}, 'id_token');
      expect(resultsNoneAlg.find(r => r.claim === 'header.alg')?.valid).toBe(false);
      
      // Test with HS256
      const resultsHS256 = validateToken({ alg: 'HS256' }, {}, 'id_token');
      expect(resultsHS256.find(r => r.claim === 'header.alg')?.valid).toBe(true);
      
      // Test with RS256
      const resultsRS256 = validateToken({ alg: 'RS256' }, {}, 'id_token');
      expect(resultsRS256.find(r => r.claim === 'header.alg')?.valid).toBe(true);
      
      // Test with missing kid
      const resultsNoKid = validateToken({ alg: 'RS256' }, {}, 'id_token');
      expect(resultsNoKid.find(r => r.claim === 'header.kid')?.valid).toBe(false);
      
      // Test with kid
      const resultsWithKid = validateToken({ alg: 'RS256', kid: 'key123' }, {}, 'id_token');
      expect(resultsWithKid.find(r => r.claim === 'header.kid')?.valid).toBe(true);
    });

    // Test ID Token validation
    test('should validate ID Tokens', () => {
      const minimalIdToken = {
        iss: 'https://example.com',
        sub: 'user123',
        aud: 'client123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60
      };
      
      // Test with missing required claims
      let results = validateToken({ alg: 'RS256', kid: 'key123' }, { sub: 'user123' }, 'id_token');
      expect(results.find(r => r.claim === 'iss')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'aud')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'exp')?.valid).toBe(false);
      
      // Test with all required claims
      results = validateToken({ alg: 'RS256', kid: 'key123' }, minimalIdToken, 'id_token');
      expect(results.find(r => r.claim === 'iss')?.valid).toBe(true);
      expect(results.find(r => r.claim === 'sub')).toBeUndefined(); // Not explicitly validated beyond existence
      expect(results.find(r => r.claim === 'exp')?.valid).toBe(true);
      
      // Test warning for missing nonce
      expect(results.find(r => r.claim === 'nonce')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'nonce')?.severity).toBe('warning');
      
      // Test with nonce
      results = validateToken(
        { alg: 'RS256', kid: 'key123' },
        { ...minimalIdToken, nonce: 'nonce123' },
        'id_token'
      );
      expect(results.find(r => r.claim === 'nonce')).toBeUndefined(); // No warning when present
      
      // Test with at_hash
      results = validateToken(
        { alg: 'RS256', kid: 'key123' },
        { ...minimalIdToken, at_hash: 'hash123' },
        'id_token'
      );
      expect(results.find(r => r.claim === 'at_hash')?.valid).toBe(true);
    });

    // Test Access Token validation
    test('should validate Access Tokens', () => {
      const minimalAccessToken = {
        iss: 'https://example.com',
        sub: 'user123',
        aud: 'client123',
        client_id: 'client123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 60,
        jti: 'id123',
        scope: 'openid profile'
      };
      
      // Test with missing claims
      let results = validateToken(
        { alg: 'RS256', kid: 'key123' }, 
        { sub: 'user123', scope: 'openid' }, 
        'access_token'
      );
      
      expect(results.find(r => r.claim === 'iss')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'exp')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'client_id')?.valid).toBe(false);
      
      // Test with all required claims
      results = validateToken(
        { alg: 'RS256', kid: 'key123', typ: 'at+jwt' }, 
        minimalAccessToken, 
        'access_token'
      );
      
      // All required claims should be valid
      expect(results.find(r => r.claim === 'iss')?.valid).toBe(true);
      expect(results.find(r => r.claim === 'exp')?.valid).toBe(true);
      expect(results.find(r => r.claim === 'jti')).toBeUndefined(); // Not explicitly validated beyond existence
      
      // Test correct token type
      expect(results.find(r => r.claim === 'header.typ')?.valid).toBe(true);
      
      // Test with azp instead of client_id
      results = validateToken(
        { alg: 'RS256', kid: 'key123' }, 
        { ...minimalAccessToken, azp: 'client123', client_id: undefined }, 
        'access_token'
      );
      
      expect(results.find(r => r.claim === 'client_id')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'client_id')?.severity).toBe('warning');
      expect(results.find(r => r.claim === 'azp')?.valid).toBe(true);
      
      // Test with missing scope
      results = validateToken(
        { alg: 'RS256', kid: 'key123' }, 
        { ...minimalAccessToken, scope: undefined }, 
        'access_token'
      );
      
      expect(results.find(r => r.claim === 'scope/scp')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'scope/scp')?.severity).toBe('warning');
      
      // Test with roles claim
      results = validateToken(
        { alg: 'RS256', kid: 'key123' }, 
        { ...minimalAccessToken, roles: ['admin', 'user'] }, 
        'access_token'
      );
      
      expect(results.find(r => r.claim === 'roles')?.valid).toBe(true);
      
      // Test with invalid roles format
      results = validateToken(
        { alg: 'RS256', kid: 'key123' }, 
        { ...minimalAccessToken, roles: 'admin user' }, // String instead of array
        'access_token'
      );
      
      expect(results.find(r => r.claim === 'roles')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'roles')?.severity).toBe('warning');
    });

    // Test common claim validations
    test('should validate common claims across token types', () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Test with expired token
      let results = validateToken(
        { alg: 'RS256' }, 
        { exp: now - 3600 }, // Expired 1 hour ago
        'id_token'
      );
      
      expect(results.find(r => r.claim === 'exp')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'exp')?.severity).toBe('error');
      
      // Test with future expiration
      results = validateToken(
        { alg: 'RS256' }, 
        { exp: now + 3600 }, // Expires 1 hour from now
        'id_token'
      );
      
      expect(results.find(r => r.claim === 'exp')?.valid).toBe(true);
      
      // Test with very old token
      results = validateToken(
        { alg: 'RS256' }, 
        { iat: now - 86400 * 2 }, // Issued 2 days ago
        'id_token'
      );
      
      expect(results.find(r => r.claim === 'iat')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'iat')?.severity).toBe('warning');
      
      // Test with not-yet-valid token
      results = validateToken(
        { alg: 'RS256' }, 
        { nbf: now + 3600 }, // Not valid until 1 hour from now
        'id_token'
      );
      
      expect(results.find(r => r.claim === 'nbf')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'nbf')?.severity).toBe('error');
      
      // Test with valid nbf
      results = validateToken(
        { alg: 'RS256' }, 
        { nbf: now - 3600 }, // Valid from 1 hour ago
        'id_token'
      );
      
      expect(results.find(r => r.claim === 'nbf')?.valid).toBe(true);
      
      // Test with non-URL issuer
      results = validateToken(
        { alg: 'RS256' }, 
        { iss: 'not-a-url' },
        'id_token'
      );
      
      expect(results.find(r => r.claim === 'iss')?.valid).toBe(false);
      expect(results.find(r => r.claim === 'iss')?.severity).toBe('warning');
      
      // Test with valid URL issuer
      results = validateToken(
        { alg: 'RS256' }, 
        { iss: 'https://example.com' },
        'id_token'
      );
      
      expect(results.find(r => r.claim === 'iss')?.valid).toBe(true);
    });
  });
});
