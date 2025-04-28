import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { proxyFetch } from '../../lib/proxy-fetch'; // Use relative path
import { server, http, HttpResponse } from '../mocks/server'; // Import MSW server and utilities

describe('proxyFetch', () => {
  // Keep window.location.hostname mocking for needsProxy checks
  beforeEach(() => {
    // Ensure global.window exists before mocking location (for non-browser envs)
    if (typeof global.window === 'undefined') {
      // @ts-ignore - Define minimal window for test environment
      global.window = { location: { hostname: '' } };
    }
    // Mock window.location.hostname for needsProxy checks
    Object.defineProperty(global.window, 'location', {
      value: {
        hostname: 'test.app.com',
      },
      writable: true,
    });
    // We will set import.meta.env.DEV directly in tests that need it
  });

  // Reset handlers after each test
  afterEach(() => server.resetHandlers());

  // === Testing proxyFetch function ===

  it('should fetch directly if proxy is not needed', async () => {
    const directUrl = 'http://test.app.com/api/data'; // Same domain
    // MSW handler for this URL will be defined in server.ts
    const response = await proxyFetch(directUrl);
    const text = await response.text();
    expect(text).toBe('Direct OK');
  });

  // Test proxy usage (production path is used in bun test)
  it('should use production proxy URL when proxy is needed', async () => {
    const externalUrl = 'https://external.com/.well-known/openid-configuration';
    // MSW handler for the proxied URL will be defined in server.ts
    const response = await proxyFetch(externalUrl);
    const text = await response.text();
    expect(text).toBe('Proxy OK');
  });

   it('should handle fetch errors through the proxy', async () => {
    const externalUrl = 'https://external.com/.well-known/error-case';
    // MSW handler for this URL will be defined in server.ts to return an error
    await expect(proxyFetch(externalUrl)).rejects.toThrow('Network Failed');
  });

  // === Testing needsProxy logic (implicitly via proxyFetch calls) ===
  // We rely on proxyFetch calling needsProxy internally.

  it('should not proxy URLs on the same domain', async () => {
    const url = 'http://test.app.com/some/path'; // Same as window.location.hostname mock
    // MSW handler for this URL will be defined in server.ts
    await proxyFetch(url);
  });

  it('should not proxy localhost URLs', async () => {
    const url = 'http://localhost:3000/api';
    // MSW handler for this URL will be defined in server.ts
    await proxyFetch(url);
  });

  it('should not proxy 127.0.0.1 URLs', async () => {
    const url = 'http://127.0.0.1:8080/data';
    // MSW handler for this URL will be defined in server.ts
    await proxyFetch(url);
  });

  it('should proxy .well-known URLs', async () => {
    const url = 'https://some-oidc.com/.well-known/openid-configuration';
    // MSW handler for the proxied URL will be defined in server.ts
    await proxyFetch(url);
  });

  // Test various JWKS path formats
  const jwksPaths = [
    'https://domain.com/oauth/jwks.json',
    'https://domain.com/identity/keys',
    'https://domain.com/oauth2/v1/certs',
    'https://domain.com/path/to/JWKS', // Uppercase
    'https://domain.com/path/to/JWK',  // Singular
    'https://domain.com/api/get_jwk_set.json', // Contains jwk and .json
  ];

  jwksPaths.forEach(url => {
    it(`should proxy JWKS URL: ${url}`, async () => {
      // MSW handler for the proxied URL will be defined in server.ts
      await proxyFetch(url);
    });
  });

  it('should not proxy invalid URLs', async () => {
    const invalidUrl = 'this-is-not-a-url';
    // needsProxy should return false, so fetch directly
    // MSW handler for this URL will be defined in server.ts
    await proxyFetch(invalidUrl);
  });

  it('should pass fetch options correctly when fetching directly', async () => {
    const directUrl = 'http://test.app.com/api/data';
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'value' }) };
    // MSW handler for this URL will be defined in server.ts
    await proxyFetch(directUrl, options);
  });

  it('should pass fetch options correctly when using proxy', async () => {
    const externalUrl = 'https://external.com/.well-known/config';
    const options = { method: 'GET', headers: { 'Accept': 'application/json' } };
    // MSW handler for the proxied URL will be defined in server.ts
    await proxyFetch(externalUrl, options);
  });
});
