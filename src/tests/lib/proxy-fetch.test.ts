import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { vi } from 'vitest';
import { proxyFetch } from '../../lib/proxy-fetch'; // Use relative path

// Mock fetch globally for all tests in this file
const originalFetch = global.fetch;
const mockFetch = vi.fn(); // Use vitest's mock function

describe('proxyFetch', () => {
  beforeEach(() => {
    // Use type assertion to handle mismatch between mock and native fetch types
    global.fetch = mockFetch as unknown as typeof fetch;
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

  afterEach(() => {
    global.fetch = originalFetch; // Restore original fetch
    mockFetch.mockClear(); // Clear mock history
    // Restore window.location if needed, though usually resetting mocks is enough
  });

  // === Testing proxyFetch function ===

  it('should fetch directly if proxy is not needed', async () => {
    const directUrl = 'http://test.app.com/api/data'; // Same domain
    mockFetch.mockResolvedValue(new Response('Direct OK'));

    const response = await proxyFetch(directUrl);
    const text = await response.text();

    expect(text).toBe('Direct OK');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(directUrl, undefined);
  });

  // Test proxy usage (production path is used in bun test)
  it('should use production proxy URL when proxy is needed', async () => {
    const externalUrl = 'https://external.com/.well-known/openid-configuration';
    const expectedProxyPrefix = '/api/cors-proxy/'; // Use production path
    mockFetch.mockResolvedValue(new Response('Proxy OK'));

    const response = await proxyFetch(externalUrl);
    const text = await response.text();

    expect(text).toBe('Proxy OK');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const actualUrl = mockFetch.mock.calls[0][0]; // Get the URL passed to fetch
    expect(actualUrl).toStartWith(expectedProxyPrefix);
    expect(actualUrl).toContain(encodeURIComponent(externalUrl));
    expect(mockFetch).toHaveBeenCalledWith(actualUrl, undefined);
  });

  // Test proxy usage assuming DEV=false (prod proxy path)
  // NOTE: We can't directly control import.meta.env.DEV easily in Bun tests.
  // This test relies on the default behavior or requires environment setup.
  // For now, we focus on testing the *logic* that a proxy is used.
  // A more robust approach might involve refactoring proxyFetch slightly
  // or using environment variables Bun *can* control.
  // Let's assume for coverage purposes that testing one proxy path is sufficient
  // if the conditional logic itself isn't complex.
  // We will test the structure for the production path thoroughly.

   it('should handle fetch errors through the proxy', async () => {
    const externalUrl = 'https://external.com/.well-known/error-case';
    const expectedProxyPrefix = '/api/cors-proxy/'; // Use production path
    const mockError = new Error('Network Failed');
    mockFetch.mockRejectedValue(mockError);

    await expect(proxyFetch(externalUrl)).rejects.toThrow('Network Failed');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const actualUrl = mockFetch.mock.calls[0][0]; // Get the URL passed to fetch
    expect(actualUrl).toStartWith(expectedProxyPrefix);
    expect(actualUrl).toContain(encodeURIComponent(externalUrl));
    expect(mockFetch).toHaveBeenCalledWith(actualUrl, undefined);
  });

  // === Testing needsProxy logic (implicitly via proxyFetch calls) ===
  // We rely on proxyFetch calling needsProxy internally.

  it('should not proxy URLs on the same domain', async () => {
    const url = 'http://test.app.com/some/path'; // Same as window.location.hostname mock
    mockFetch.mockResolvedValue(new Response('OK'));
    await proxyFetch(url);
    expect(mockFetch).toHaveBeenCalledWith(url, undefined); // Called directly
  });

  it('should not proxy localhost URLs', async () => {
    const url = 'http://localhost:3000/api';
    mockFetch.mockResolvedValue(new Response('OK'));
    await proxyFetch(url);
    expect(mockFetch).toHaveBeenCalledWith(url, undefined); // Called directly
  });

  it('should not proxy 127.0.0.1 URLs', async () => {
    const url = 'http://127.0.0.1:8080/data';
    mockFetch.mockResolvedValue(new Response('OK'));
    await proxyFetch(url);
    expect(mockFetch).toHaveBeenCalledWith(url, undefined); // Called directly
  });

  it('should proxy .well-known URLs', async () => {
    const url = 'https://some-oidc.com/.well-known/openid-configuration';
    const expectedProxyPrefix = '/api/cors-proxy/'; // Use production path
    mockFetch.mockResolvedValue(new Response('OK'));
    await proxyFetch(url);
    const actualUrl = mockFetch.mock.calls[0][0];
    expect(actualUrl).toStartWith(expectedProxyPrefix);
    expect(actualUrl).toContain(encodeURIComponent(url));
    expect(mockFetch).toHaveBeenCalledWith(actualUrl, undefined);
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
      const expectedProxyPrefix = '/api/cors-proxy/'; // Use production path
      mockFetch.mockResolvedValue(new Response('OK'));
      await proxyFetch(url);
      const actualUrl = mockFetch.mock.calls[0][0];
      expect(actualUrl).toStartWith(expectedProxyPrefix);
      expect(actualUrl).toContain(encodeURIComponent(url));
      expect(mockFetch).toHaveBeenCalledWith(actualUrl, undefined);
    });
  });

  it('should not proxy invalid URLs', async () => {
    const invalidUrl = 'this-is-not-a-url';
    // needsProxy should return false, so fetch directly
    mockFetch.mockResolvedValue(new Response('OK'));
    await proxyFetch(invalidUrl);
    expect(mockFetch).toHaveBeenCalledWith(invalidUrl, undefined); // Called directly
  });

  it('should pass fetch options correctly when fetching directly', async () => {
    const directUrl = 'http://test.app.com/api/data';
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'value' }) };
    mockFetch.mockResolvedValue(new Response('Direct OK'));

    await proxyFetch(directUrl, options);
    expect(mockFetch).toHaveBeenCalledWith(directUrl, options);
  });

  it('should pass fetch options correctly when using proxy', async () => {
    const externalUrl = 'https://external.com/.well-known/config';
    const options = { method: 'GET', headers: { 'Accept': 'application/json' } };
    const expectedProxyPrefix = '/api/cors-proxy/'; // Use production path
    mockFetch.mockResolvedValue(new Response('Proxy OK'));

    await proxyFetch(externalUrl, options);
    const actualUrl = mockFetch.mock.calls[0][0];
    expect(actualUrl).toStartWith(expectedProxyPrefix);
    expect(actualUrl).toContain(encodeURIComponent(externalUrl));
    expect(mockFetch).toHaveBeenCalledWith(actualUrl, options);
  });
});
