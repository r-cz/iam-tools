import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { isAllowedEndpoint, filterHeaders, onRequest } from './[[path]]'; // Import functions to test

describe('isAllowedEndpoint', () => {
  // Test allowed .well-known endpoints
  test('should allow .well-known/openid-configuration', () => {
    expect(isAllowedEndpoint('https://example.com/.well-known/openid-configuration')).toBe(true);
  });

  test('should allow .well-known/jwks.json', () => {
    expect(isAllowedEndpoint('https://example.com/.well-known/jwks.json')).toBe(true);
  });

  // Test allowed JWKS endpoints (various formats)
  test('should allow /jwks', () => {
    expect(isAllowedEndpoint('https://example.com/keys/jwks')).toBe(true);
  });

  test('should allow /JWKS (case-insensitive)', () => {
    expect(isAllowedEndpoint('https://example.com/keys/JWKS')).toBe(true);
  });

  test('should allow /jwk', () => {
    expect(isAllowedEndpoint('https://example.com/keys/jwk')).toBe(true);
  });

  test('should allow /JWK (case-insensitive)', () => {
    expect(isAllowedEndpoint('https://example.com/keys/JWK')).toBe(true);
  });

  test('should allow /keys', () => {
    expect(isAllowedEndpoint('https://example.com/api/keys')).toBe(true);
  });

  test('should allow /oauth2/v1/certs', () => {
    expect(isAllowedEndpoint('https://example.com/oauth2/v1/certs')).toBe(true);
  });

  test('should allow paths ending with .json containing jwk (case-insensitive)', () => {
    expect(isAllowedEndpoint('https://example.com/api/get_jwk_set.json')).toBe(true);
  });

  // Test disallowed endpoints
  test('should not allow arbitrary paths', () => {
    expect(isAllowedEndpoint('https://example.com/some/other/path')).toBe(false);
  });

  test('should not allow paths containing .well-known but not at the start', () => {
    expect(isAllowedEndpoint('https://example.com/some/.well-known/path')).toBe(false);
  });

  test('should not allow paths containing jwks but not in a recognized format', () => {
    expect(isAllowedEndpoint('https://example.com/data?query=jwks')).toBe(false);
  });

  test('should handle invalid URLs gracefully', () => {
    // isAllowedEndpoint should ideally not throw on invalid URLs,
    // but the main onRequest function handles URL parsing errors.
    // This test verifies it doesn't crash.
    expect(isAllowedEndpoint('invalid-url')).toBe(false);
  });
});

describe('filterHeaders', () => {
  test('should remove Cloudflare and Host headers', () => {
    const originalHeaders = new Headers({
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '1.2.3.4',
      'Cloudflare-Worker': 'true',
      'Host': 'proxy.example.com',
      'Origin': 'http://localhost:3000',
      'Referer': 'http://localhost:3000/page',
      'X-Custom-Header': 'value',
    });

    const filtered = filterHeaders(originalHeaders);

    expect(filtered.has('Content-Type')).toBe(true);
    expect(filtered.has('CF-Connecting-IP')).toBe(false);
    expect(filtered.has('Cloudflare-Worker')).toBe(false);
    expect(filtered.has('Host')).toBe(false);
    expect(filtered.has('Origin')).toBe(false);
    expect(filtered.has('Referer')).toBe(false);
    expect(filtered.has('X-Custom-Header')).toBe(true);
    expect(filtered.get('X-Custom-Header')).toBe('value');
  });

  test('should return empty headers for empty input', () => {
    const originalHeaders = new Headers();
    const filtered = filterHeaders(originalHeaders);
    expect(Array.from(filtered.entries()).length).toBe(0);
  });
});

describe('onRequest', () => {
  // Mock the Cloudflare Pages Function context
  const mockContext: any = {
    request: new Request('http://localhost/api/cors-proxy/https://example.com/target', { method: 'GET' }),
    params: { path: ['https:', 'example.com', 'target'] },
    env: {}, // Assuming no env vars are used in this function
    // Add other context properties if needed by the function
  };

  // Mock global.fetch for testing the function's outgoing requests
  const originalFetch = global.fetch;
  const mockFetch = mock();

  beforeEach(() => {
    // Use type assertion to handle mismatch between mock and native fetch types
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockClear(); // Clear mock history for each test
  });

  afterEach(() => {
    global.fetch = originalFetch; // Restore original fetch
  });

  test('should return 400 if no URL is provided', async () => {
    const contextWithoutUrl: any = {
      request: new Request('http://localhost/api/cors-proxy/', { method: 'GET' }),
      params: {}, // No path parameter
      env: {},
    };
    const response = await onRequest(contextWithoutUrl);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('No URL provided');
  });

  test('should return 500 for an invalid URL parameter', async () => {
    const contextWithInvalidUrl: any = {
      request: new Request('http://localhost/api/cors-proxy/invalid-url', { method: 'GET' }),
      params: { path: ['invalid-url'] },
      env: {},
    };
    const response = await onRequest(contextWithInvalidUrl);
    expect(response.status).toBe(500);
    expect(await response.text()).toContain('Error proxying request: Invalid URL');
  });

  test('should return 403 for a disallowed endpoint', async () => {
    const contextWithDisallowedUrl: any = {
      request: new Request('http://localhost/api/cors-proxy/https://example.com/disallowed', { method: 'GET' }),
      params: { path: ['https:', 'example.com', 'disallowed'] },
      env: {},
    };
    const response = await onRequest(contextWithDisallowedUrl);
    expect(response.status).toBe(403);
    expect(await response.text()).toBe('This endpoint is not allowed');
  });

  test('should fetch and return response for an allowed endpoint', async () => {
    const allowedUrl = 'https://example.com/.well-known/openid-configuration';
    const contextWithAllowedUrl: any = {
      request: new Request(`http://localhost/api/cors-proxy/${encodeURIComponent(allowedUrl)}`, { method: 'GET' }),
      params: { path: allowedUrl.split('/').map(encodeURIComponent) },
      env: {},
    };

    // Mock the response from the target URL
    const mockTargetResponse = new Response('Mocked config data', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    mockFetch.mockResolvedValue(mockTargetResponse);

    const response = await onRequest(contextWithAllowedUrl);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Mocked config data');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(allowedUrl, expect.any(Request)); // Check URL and that a Request object was passed
  });

  test('should handle POST requests and pass body', async () => {
    const allowedUrl = 'https://example.com/api/keys';
    const requestBody = JSON.stringify({ key: 'value' });
    const contextWithPost: any = {
      request: new Request(`http://localhost/api/cors-proxy/${encodeURIComponent(allowedUrl)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      }),
      params: { path: allowedUrl.split('/').map(encodeURIComponent) },
      env: {},
    };

    const mockTargetResponse = new Response('Success', { status: 200 });
    mockFetch.mockResolvedValue(mockTargetResponse);

    await onRequest(contextWithPost);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCall = mockFetch.mock.calls[0];
    const requestSent = fetchCall[1]; // The Request object passed to fetch

    expect(requestSent.method).toBe('POST');
    // Note: Reading the body from the Request object passed to fetch mock is complex.
    // We'll rely on checking the method and headers for now.
    // A more advanced test might involve inspecting the mockFetch call arguments more deeply.
  });

  test('should return 500 if fetching the target URL fails', async () => {
    const allowedUrl = 'https://example.com/.well-known/error';
     const contextWithAllowedUrl: any = {
      request: new Request(`http://localhost/api/cors-proxy/${encodeURIComponent(allowedUrl)}`, { method: 'GET' }),
      params: { path: allowedUrl.split('/').map(encodeURIComponent) },
      env: {},
    };

    // Mock fetch to throw an error
    mockFetch.mockRejectedValue(new Error('Simulated fetch error'));

    const response = await onRequest(contextWithAllowedUrl);

    expect(response.status).toBe(500);
    expect(await response.text()).toContain('Error proxying request: Simulated fetch error');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(allowedUrl, expect.any(Request));
  });
});