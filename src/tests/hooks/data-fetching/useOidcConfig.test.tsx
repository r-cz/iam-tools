// src/tests/hooks/data-fetching/useOidcConfig.test.tsx
import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useOidcConfig } from '../../../hooks/data-fetching/useOidcConfig';

// Mock the proxyFetch module
mock.module('../../../lib/proxy-fetch', () => ({
  proxyFetch: mock(async (url: string) => {
    if (url.includes('error')) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.includes('network-error')) {
      throw new Error('Network error');
    }
    
    return new Response(JSON.stringify({
      issuer: 'https://auth.example.com',
      authorization_endpoint: 'https://auth.example.com/oauth2/auth',
      token_endpoint: 'https://auth.example.com/oauth2/token',
      jwks_uri: 'https://auth.example.com/.well-known/jwks.json',
      response_types_supported: ['code', 'token', 'id_token', 'code token', 'code id_token'],
      grant_types_supported: ['authorization_code', 'implicit', 'refresh_token'],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }),
}));

describe('useOidcConfig Hook', () => {
  test('should initialize with empty state', () => {
    const { result } = renderHook(() => useOidcConfig());
    
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
  
  test('should fetch and return OIDC configuration', async () => {
    const { result } = renderHook(() => useOidcConfig());
    
    // Call the fetch function
    await act(async () => {
      await result.current.fetchConfig('https://auth.example.com');
    });
    
    // Check the state after fetching
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).not.toBeNull();
    
    // Check the data properties
    expect(result.current.data?.issuer).toBe('https://auth.example.com');
    expect(result.current.data?.authorization_endpoint).toBe('https://auth.example.com/oauth2/auth');
    expect(result.current.data?.token_endpoint).toBe('https://auth.example.com/oauth2/token');
    expect(result.current.data?.jwks_uri).toBe('https://auth.example.com/.well-known/jwks.json');
  });
  
  test('should handle error responses', async () => {
    const { result } = renderHook(() => useOidcConfig());
    
    // Call the fetch function with an error URL
    await act(async () => {
      await result.current.fetchConfig('https://auth.example.com/error');
    });
    
    // Check the state after error
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('Failed to fetch OIDC configuration');
    expect(result.current.error?.message).toContain('404');
  });
  
  test('should handle network errors', async () => {
    const { result } = renderHook(() => useOidcConfig());
    
    // Call the fetch function with a network error URL
    await act(async () => {
      await result.current.fetchConfig('https://auth.example.com/network-error');
    });
    
    // Check the state after network error
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error');
  });
  
  test('should handle invalid URLs', async () => {
    const { result } = renderHook(() => useOidcConfig());
    
    // Call the fetch function with an invalid URL
    await act(async () => {
      await result.current.fetchConfig('invalid-url');
    });
    
    // Check the state after invalid URL
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Invalid Issuer URL format.');
  });
  
  test('should handle empty input', async () => {
    const { result } = renderHook(() => useOidcConfig());
    
    // Call the fetch function with empty URL
    await act(async () => {
      await result.current.fetchConfig('');
    });
    
    // State should remain unchanged
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
  
  test('should construct well-known URL correctly', async () => {
    const proxyFetchMock = mock.module('../../../lib/proxy-fetch').mocks.proxyFetch;
    const { result } = renderHook(() => useOidcConfig());
    
    // URLs with and without trailing slashes
    const testCases = [
      {
        input: 'https://auth.example.com',
        expected: 'https://auth.example.com/.well-known/openid-configuration'
      },
      {
        input: 'https://auth.example.com/',
        expected: 'https://auth.example.com/.well-known/openid-configuration'
      },
      {
        input: 'https://auth.example.com/tenant1',
        expected: 'https://auth.example.com/tenant1/.well-known/openid-configuration'
      },
      {
        input: 'https://auth.example.com/tenant1/',
        expected: 'https://auth.example.com/tenant1/.well-known/openid-configuration'
      }
    ];
    
    for (const testCase of testCases) {
      mock.reset(proxyFetchMock);
      
      await act(async () => {
        await result.current.fetchConfig(testCase.input);
      });
      
      expect(proxyFetchMock).toHaveBeenCalledWith(testCase.expected);
    }
  });
});
