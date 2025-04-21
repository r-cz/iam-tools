// src/tests/lib/proxy-fetch.test.ts
import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { proxyFetch } from '../../lib/proxy-fetch';

describe('Proxy Fetch Utility', () => {
  // Store the original fetch
  const originalFetch = global.fetch;
  
  // Mock implementation
  const fetchMock = mock(async (url: string) => {
    return new Response(JSON.stringify({ url, mocked: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
  
  // Setup mocks before each test
  beforeEach(() => {
    // Replace global fetch with our mock
    global.fetch = fetchMock;
    
    // Mock import.meta.env.DEV
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: true },
      writable: true
    });
  });
  
  // Restore original implementation after each test
  afterEach(() => {
    // Restore the original fetch
    global.fetch = originalFetch;
    mock.reset(fetchMock);
  });
  
  // Test direct fetch for same domain
  test('should fetch directly for same domain URLs', async () => {
    // Mock window.location.hostname
    const originalHostname = window.location.hostname;
    Object.defineProperty(window.location, 'hostname', {
      value: 'example.com',
      configurable: true
    });
    
    // Make the request to the same domain
    await proxyFetch('https://example.com/api/data');
    
    // Verify fetch was called with the direct URL
    expect(fetchMock).toHaveBeenCalled();
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall.args[0]).toBe('https://example.com/api/data');
    
    // Restore original hostname
    Object.defineProperty(window.location, 'hostname', {
      value: originalHostname,
      configurable: true
    });
  });
  
  // Test direct fetch for localhost
  test('should fetch directly for localhost URLs', async () => {
    await proxyFetch('http://localhost:3000/api/data');
    
    expect(fetchMock).toHaveBeenCalled();
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall.args[0]).toBe('http://localhost:3000/api/data');
  });
  
  // Test proxy fetch for well-known endpoints
  test('should use proxy for .well-known endpoints', async () => {
    const targetUrl = 'https://auth.example.com/.well-known/openid-configuration';
    await proxyFetch(targetUrl);
    
    expect(fetchMock).toHaveBeenCalled();
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall.args[0]).toBe(`http://localhost:8788/api/cors-proxy/${encodeURIComponent(targetUrl)}`);
  });
  
  // Test proxy fetch for JWKS endpoints
  test('should use proxy for JWKS endpoints', async () => {
    const jwksUrls = [
      'https://auth.example.com/jwks',
      'https://auth.example.com/.well-known/jwks.json',
      'https://auth.example.com/oauth2/v1/certs',
      'https://auth.example.com/keys'
    ];
    
    for (const url of jwksUrls) {
      mock.reset(fetchMock);
      await proxyFetch(url);
      
      expect(fetchMock).toHaveBeenCalled();
      const fetchCall = fetchMock.mock.calls[0];
      expect(fetchCall.args[0]).toBe(`http://localhost:8788/api/cors-proxy/${encodeURIComponent(url)}`);
    }
  });
  
  // Test case insensitivity for JWKS detection
  test('should use proxy for JWKS endpoints with different cases', async () => {
    const jwksUrls = [
      'https://auth.example.com/JWKS',
      'https://auth.example.com/jwKs',
      'https://auth.example.com/.well-known/JWK.json'
    ];
    
    for (const url of jwksUrls) {
      mock.reset(fetchMock);
      await proxyFetch(url);
      
      expect(fetchMock).toHaveBeenCalled();
      const fetchCall = fetchMock.mock.calls[0];
      expect(fetchCall.args[0]).toBe(`http://localhost:8788/api/cors-proxy/${encodeURIComponent(url)}`);
    }
  });
  
  // Test direct fetch for non-proxy URLs
  test('should fetch directly for non-proxy URLs', async () => {
    const url = 'https://api.example.com/users';
    await proxyFetch(url);
    
    expect(fetchMock).toHaveBeenCalled();
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall.args[0]).toBe(url);
  });
  
  // Test production environment
  test('should use correct proxy URL in production', async () => {
    // Set to production environment
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: false },
      writable: true
    });
    
    const targetUrl = 'https://auth.example.com/.well-known/openid-configuration';
    await proxyFetch(targetUrl);
    
    expect(fetchMock).toHaveBeenCalled();
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall.args[0]).toBe(`/api/cors-proxy/${encodeURIComponent(targetUrl)}`);
  });
  
  // Test with invalid URL
  test('should handle invalid URLs gracefully', async () => {
    const invalidUrl = 'not-a-valid-url';
    await proxyFetch(invalidUrl);
    
    expect(fetchMock).toHaveBeenCalled();
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall.args[0]).toBe(invalidUrl);
  });
  
  // Test with fetch options
  test('should pass fetch options to underlying fetch', async () => {
    const url = 'https://api.example.com/users';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Test User' })
    };
    
    await proxyFetch(url, options);
    
    expect(fetchMock).toHaveBeenCalled();
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall.args[0]).toBe(url);
    expect(fetchCall.args[1]).toEqual(options);
  });
  
  // Test error handling
  test('should handle fetch errors', async () => {
    // Set fetch to throw an error
    const errorMessage = 'Network error';
    global.fetch = mock(() => {
      throw new Error(errorMessage);
    });
    
    const url = 'https://api.example.com/users';
    
    // The fetch should throw and proxyFetch should propagate the error
    await expect(proxyFetch(url)).rejects.toThrow(errorMessage);
  });
});
