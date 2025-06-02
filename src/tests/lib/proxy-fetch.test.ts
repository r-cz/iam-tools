import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as proxyFetchModule from '../../lib/proxy-fetch';

describe('proxyFetch', () => {
  let fetchSpy: any;

  beforeEach(() => {
    // Store original window for restoration
    const originalWindow = (globalThis as any).window;
    
    // Set up window object for tests - use globalThis to ensure compatibility
    (globalThis as any).window = {
      location: {
        hostname: 'test.app.com',
        protocol: 'http:',
        port: '3000',
        host: 'test.app.com:3000',
        pathname: '/',
        search: '',
        hash: '',
        href: 'http://test.app.com:3000/'
      }
    };
    
    // Store original for cleanup
    (globalThis as any).__originalWindow = originalWindow;
    
    // Spy on global fetch
    fetchSpy = spyOn(global, 'fetch');
  });

  afterEach(() => {
    // Restore spy
    fetchSpy.mockRestore();
    
    // Restore original window
    if ((globalThis as any).__originalWindow) {
      (globalThis as any).window = (globalThis as any).__originalWindow;
      delete (globalThis as any).__originalWindow;
    }
  });

  // === Testing proxyFetch function ===

  it('should fetch directly if proxy is not needed', async () => {
    const directUrl = 'http://test.app.com/api/data'; // Same domain
    fetchSpy.mockResolvedValue(new Response('Direct OK'));

    const response = await proxyFetchModule.proxyFetch(directUrl);
    const text = await response.text();

    expect(text).toBe('Direct OK');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(directUrl, undefined);
  });

  // Test proxy usage (production path is used in bun test)
  it('should use production proxy URL when proxy is needed', async () => {
    const externalUrl = 'https://external.com/.well-known/openid-configuration';
    const expectedProxyPrefix = '/api/cors-proxy/'; // Use production path
    fetchSpy.mockResolvedValue(new Response('Proxy OK'));

    const response = await proxyFetchModule.proxyFetch(externalUrl);
    const text = await response.text();

    expect(text).toBe('Proxy OK');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const actualUrl = fetchSpy.mock.calls[0][0]; // Get the URL passed to fetch
    expect(actualUrl).toStartWith(expectedProxyPrefix);
    expect(actualUrl).toContain(encodeURIComponent(externalUrl));
    expect(fetchSpy).toHaveBeenCalledWith(actualUrl, undefined);
  });

  it('should handle fetch errors through the proxy', async () => {
    const externalUrl = 'https://external.com/.well-known/error-case';
    const expectedProxyPrefix = '/api/cors-proxy/'; // Use production path
    const mockError = new Error('Network Failed');
    fetchSpy.mockRejectedValue(mockError);

    await expect(proxyFetchModule.proxyFetch(externalUrl)).rejects.toThrow('Network Failed');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const actualUrl = fetchSpy.mock.calls[0][0]; // Get the URL passed to fetch
    expect(actualUrl).toStartWith(expectedProxyPrefix);
    expect(actualUrl).toContain(encodeURIComponent(externalUrl));
    expect(fetchSpy).toHaveBeenCalledWith(actualUrl, undefined);
  });

  // === Testing needsProxy logic (implicitly via proxyFetch calls) ===
  // We rely on proxyFetch calling needsProxy internally.

  it('should not proxy URLs on the same domain', async () => {
    const url = 'http://test.app.com/some/path'; // Same as window.location.hostname mock
    fetchSpy.mockResolvedValue(new Response('OK'));
    await proxyFetchModule.proxyFetch(url);
    expect(fetchSpy).toHaveBeenCalledWith(url, undefined); // Called directly
  });

  it('should not proxy localhost URLs', async () => {
    const url = 'http://localhost:3000/api';
    fetchSpy.mockResolvedValue(new Response('OK'));
    await proxyFetchModule.proxyFetch(url);
    expect(fetchSpy).toHaveBeenCalledWith(url, undefined); // Called directly
  });

  it('should not proxy 127.0.0.1 URLs', async () => {
    const url = 'http://127.0.0.1:8080/data';
    fetchSpy.mockResolvedValue(new Response('OK'));
    await proxyFetchModule.proxyFetch(url);
    expect(fetchSpy).toHaveBeenCalledWith(url, undefined); // Called directly
  });

  it('should proxy .well-known URLs', async () => {
    const url = 'https://some-oidc.com/.well-known/openid-configuration';
    const expectedProxyPrefix = '/api/cors-proxy/'; // Use production path
    fetchSpy.mockResolvedValue(new Response('OK'));
    await proxyFetchModule.proxyFetch(url);
    const actualUrl = fetchSpy.mock.calls[0][0];
    expect(actualUrl).toStartWith(expectedProxyPrefix);
    expect(actualUrl).toContain(encodeURIComponent(url));
    expect(fetchSpy).toHaveBeenCalledWith(actualUrl, undefined);
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
      fetchSpy.mockResolvedValue(new Response('OK'));
      await proxyFetchModule.proxyFetch(url);
      const actualUrl = fetchSpy.mock.calls[0][0];
      expect(actualUrl).toStartWith(expectedProxyPrefix);
      expect(actualUrl).toContain(encodeURIComponent(url));
      expect(fetchSpy).toHaveBeenCalledWith(actualUrl, undefined);
    });
  });

  it('should not proxy invalid URLs', async () => {
    const invalidUrl = 'this-is-not-a-url';
    // needsProxy should return false, so fetch directly
    fetchSpy.mockResolvedValue(new Response('OK'));
    await proxyFetchModule.proxyFetch(invalidUrl);
    expect(fetchSpy).toHaveBeenCalledWith(invalidUrl, undefined); // Called directly
  });

  it('should pass fetch options correctly when fetching directly', async () => {
    const directUrl = 'http://test.app.com/api/data';
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'value' }) };
    fetchSpy.mockResolvedValue(new Response('Direct OK'));

    await proxyFetchModule.proxyFetch(directUrl, options);
    expect(fetchSpy).toHaveBeenCalledWith(directUrl, options);
  });

  it('should pass fetch options correctly when using proxy', async () => {
    const externalUrl = 'https://external.com/.well-known/config';
    const options = { method: 'GET', headers: { 'Accept': 'application/json' } };
    const expectedProxyPrefix = '/api/cors-proxy/'; // Use production path
    fetchSpy.mockResolvedValue(new Response('Proxy OK'));

    await proxyFetchModule.proxyFetch(externalUrl, options);
    const actualUrl = fetchSpy.mock.calls[0][0];
    expect(actualUrl).toStartWith(expectedProxyPrefix);
    expect(actualUrl).toContain(encodeURIComponent(externalUrl));
    expect(fetchSpy).toHaveBeenCalledWith(actualUrl, options);
  });
});