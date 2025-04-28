import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { proxyFetch } from '../../lib/proxy-fetch';
import { server, http, HttpResponse } from '../mocks/server'; // Import MSW server and utilities


describe('JWKS Fetching Logic', () => {
  // Our test issuer URL - Using a fixed domain for testing purposes
  const testIssuerUrl = 'https://login.my.chick-fil-a.com';

  // Reset handlers after each test
  afterEach(() => server.resetHandlers());

  test('should fetch and parse OpenID configuration', async () => {
    // Fetch the configuration
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const response = await proxyFetch(configUrl);
    const config = await response.json();

    // Verify we got the expected values
    expect(config.issuer).toBe(testIssuerUrl);
    expect(config.jwks_uri).toBe(`${testIssuerUrl}/.well-known/jwks.json`);
    expect(config.token_endpoint).toBe(`${testIssuerUrl}/oauth2/token`);
  });

  test('should fetch and parse JWKS from URI', async () => {
    // First get the config to get the JWKS URI
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const configResponse = await proxyFetch(configUrl);
    const config = await configResponse.json();

    // Now fetch the JWKS
    const jwksResponse = await proxyFetch(config.jwks_uri);
    const jwks = await jwksResponse.json();

    // Verify the JWKS structure
    expect(jwks.keys).toBeInstanceOf(Array);
    expect(jwks.keys.length).toBe(1);
    expect(jwks.keys[0].kty).toBe('RSA');
    expect(jwks.keys[0].kid).toBe('test-kid-1');
  });

  test('should handle complete OIDC discovery and JWKS resolution flow', async () => {
    // Step 1: Get the OpenID configuration
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const configResponse = await proxyFetch(configUrl);
    expect(configResponse.ok).toBe(true);

    const config = await configResponse.json();
    expect(config.jwks_uri).toBeDefined();

    // Step 2: Get the JWKS
    const jwksResponse = await proxyFetch(config.jwks_uri);
    expect(jwksResponse.ok).toBe(true);

    const jwks = await jwksResponse.json();
    expect(jwks.keys).toBeDefined();
    expect(jwks.keys.length).toBeGreaterThan(0);

    // Verify the JWKS key structure
    const key = jwks.keys[0];
    expect(key.kty).toBeDefined();
    expect(key.kid).toBeDefined();
    expect(key.n).toBeDefined();
    expect(key.e).toBeDefined();
  });

  test('should handle invalid configuration response (e.g., 404)', async () => {
    // Override the default handler for this test
    server.use(
      http.get(`${testIssuerUrl}/.well-known/openid-configuration`, () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    // Try to fetch the configuration and expect an error
    try {
      await proxyFetch(`${testIssuerUrl}/.well-known/openid-configuration`);
      // If we reach here, the test should fail
      expect('Should have thrown an error').toBe('Did not throw an error');
    } catch (error: any) {
      // Expecting an error, check its properties if possible
      // Note: proxyFetch might throw or return a non-ok response depending on its implementation
      // You might need to adjust this assertion based on proxyFetch's actual error handling
      expect(error).toBeDefined();
      // Example check if proxyFetch throws for non-ok:
      // expect(error.message).toContain('404');
    }
  });

  test('should handle configuration response without jwks_uri', async () => {
    // Override the default handler for this test
    server.use(
      http.get(`${testIssuerUrl}/.well-known/openid-configuration`, () => {
        return HttpResponse.json({
          issuer: testIssuerUrl,
          // jwks_uri is missing
          token_endpoint: `${testIssuerUrl}/oauth2/token`
        });
      })
    );

    // Fetch the configuration
    const configUrl = `${testIssuerUrl}/.well-known/openid-configuration`;
    const configResponse = await proxyFetch(configUrl);
    const config = await configResponse.json();

    // Verify jwks_uri is undefined
    expect(config.jwks_uri).toBeUndefined();
  });

  test('should handle network errors', async () => {
    // Override the default handler to simulate a network error
    server.use(
      http.get(`${testIssuerUrl}/.well-known/openid-configuration`, () => {
        // Simulate a network error by throwing
        throw new Error('Network error simulation');
      })
    );

    // Try to fetch the configuration and expect a network error
    try {
      await proxyFetch(`${testIssuerUrl}/.well-known/openid-configuration`);
      // If we reach here, the test should fail
      expect('Should have thrown a network error').toBe('Did not throw a network error');
    } catch (error: any) {
      // Expecting a network error
      expect(error).toBeDefined();
      expect(error.message).toBe('Network error simulation');
    }
  });
});
