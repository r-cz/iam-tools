import { describe, expect, test, beforeEach } from 'bun:test';
import { OidcConfigCache } from '@/lib/cache/oidc-config-cache';
import { OidcConfiguration } from '@/features/oidcExplorer/utils/types';

// Mock localStorage for testing
global.localStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] || null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
} as any;

describe('OidcConfigCache', () => {
  let cache: OidcConfigCache;
  
  const mockConfig: OidcConfiguration = {
    issuer: 'https://example.com',
    authorization_endpoint: 'https://example.com/auth',
    token_endpoint: 'https://example.com/token',
    userinfo_endpoint: 'https://example.com/userinfo',
    jwks_uri: 'https://example.com/jwks',
    scopes_supported: ['openid', 'email', 'profile'],
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Create a fresh cache instance
    cache = new OidcConfigCache({
      memoryTTL: 1000, // 1 second for testing
      storageTTL: 2000, // 2 seconds for testing
    });
  });

  test('should store and retrieve configuration from cache', () => {
    cache.set('https://example.com', mockConfig);
    const retrieved = cache.get('https://example.com');
    expect(retrieved).toEqual(mockConfig);
  });

  test('should normalize URLs when storing and retrieving', () => {
    // Store with trailing slash
    cache.set('https://example.com/', mockConfig);
    // Retrieve without trailing slash
    const retrieved = cache.get('https://example.com');
    expect(retrieved).toEqual(mockConfig);
  });

  test('should return null for non-existent entries', () => {
    const retrieved = cache.get('https://nonexistent.com');
    expect(retrieved).toBeNull();
  });

  test('should clear cache properly', () => {
    cache.set('https://example.com', mockConfig);
    cache.clear();
    const retrieved = cache.get('https://example.com');
    expect(retrieved).toBeNull();
  });

  test('should return correct stats', () => {
    cache.set('https://example.com', mockConfig);
    cache.set('https://another.com', mockConfig);
    
    const stats = cache.getStats();
    expect(stats.memoryEntries).toBe(2);
    expect(stats.storageEntries).toBe(2);
    expect(stats.oldestEntry).toBeTruthy();
    expect(stats.newestEntry).toBeTruthy();
  });

  test('should handle TTL expiration', async () => {
    cache.set('https://example.com', mockConfig);
    
    // Should be available immediately
    expect(cache.get('https://example.com')).toEqual(mockConfig);
    
    // Wait for memory TTL to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Clear memory cache to force storage lookup
    cache['memoryCache'].clear();
    
    // Should still be available from storage
    expect(cache.get('https://example.com')).toEqual(mockConfig);
    
    // Wait for storage TTL to expire from original timestamp
    // Total wait time should be > 2000ms (storage TTL)
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Clear memory cache again to force storage lookup
    cache['memoryCache'].clear();
    
    // Should no longer be available
    expect(cache.get('https://example.com')).toBeNull();
  });

});