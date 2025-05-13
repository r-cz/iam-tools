import { Mock, mock } from 'bun:test';

/**
 * Mock API response types
 */
export interface MockedResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  json: () => Promise<T>;
  text: () => Promise<string>;
  blob: () => Promise<Blob>;
}

/**
 * Setup a mock for proxyFetch to allow testing without real API calls
 * @returns A utility object with methods to mock API responses
 */
export function setupApiMocks() {
  const originalFetch = globalThis.fetch;
  let mockedResponses: Record<string, MockedResponse> = {};
  
  // Mock global fetch
  const fetchMock = mock(() => {
    return async (url: string, options?: RequestInit) => {
      // Check if we have a mocked response for this URL
      const urlPattern = Object.keys(mockedResponses).find(pattern => {
        if (pattern === url) return true;
        try {
          return new RegExp(pattern).test(url);
        } catch {
          return false;
        }
      });

      if (urlPattern) {
        return Promise.resolve(mockedResponses[urlPattern]);
      }

      // If no mock defined, return a not found response
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {},
        json: () => Promise.resolve({ error: 'No mock defined for this URL' }),
        text: () => Promise.resolve('No mock defined for this URL'),
        blob: () => Promise.resolve(new Blob()),
      });
    };
  });

  // Replace global fetch with our mock
  globalThis.fetch = fetchMock as any;

  const mockApi = {
    /**
     * Mock a successful API response
     * @param urlPattern URL or regex pattern to match
     * @param responseData Data to return in the response
     * @param status HTTP status code (default: 200)
     */
    mockSuccess: <T>(urlPattern: string, responseData: T, status = 200) => {
      mockedResponses[urlPattern] = {
        ok: true,
        status,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        json: () => Promise.resolve(responseData),
        text: () => Promise.resolve(JSON.stringify(responseData)),
        blob: () => Promise.resolve(new Blob([JSON.stringify(responseData)])),
      };
      return mockApi;
    },

    /**
     * Mock a failed API response
     * @param urlPattern URL or regex pattern to match
     * @param errorData Error data to return
     * @param status HTTP status code (default: 400)
     */
    mockError: <T>(urlPattern: string, errorData: T, status = 400) => {
      mockedResponses[urlPattern] = {
        ok: false,
        status,
        statusText: 'Error',
        headers: { 'Content-Type': 'application/json' },
        json: () => Promise.resolve(errorData),
        text: () => Promise.resolve(JSON.stringify(errorData)),
        blob: () => Promise.resolve(new Blob([JSON.stringify(errorData)])),
      };
      return mockApi;
    },

    /**
     * Reset all mocked responses
     */
    reset: () => {
      mockedResponses = {};
      return mockApi;
    },

    /**
     * Restore the original fetch implementation
     */
    restore: () => {
      globalThis.fetch = originalFetch;
    },

    /**
     * Get the mocked fetch function (for testing with specific implementation)
     */
    getMockedFetch: () => fetchMock,
  };

  return mockApi;
}

/**
 * Sample JWKS response for testing
 */
export const sampleJwksResponse = {
  keys: [
    {
      kty: "RSA",
      kid: "test-key-1",
      use: "sig",
      alg: "RS256",
      n: "xAE_Zx1yvPUV3HmhRKTKVY0Qg2PgTzffGvZJRbyPYVUEhUPjNtT0TMnkqHR0_PN-ydZh3nvCrWYvT7NFUbV4L84FeO4OUNRdYi0aD-j7GZnQ3GiYQjZ_iJmLmLcURUQgPBV1_TjCDy-jeE-jTbBwk4v9OYCsQidwYcaKnQcTyjWl4gfjDEJS6UyGF0z_lE2rGkXUOt431WQEIaCGG_bs9m8_m0bsUXPMGgLWDcyZfvqGnVm1LQUh-qXyEqT2Y0UL9u2jVCjyL9fAK8GzWVuaY3aMvnTYF5cUPdcLQTJMKHLyEBZBKnD4oFg0_HNVQLrcj1qwrCLRMGi6Swgg9FrpEQ",
      e: "AQAB"
    }
  ]
};

/**
 * Sample OIDC configuration response for testing
 */
export const sampleOidcConfigResponse = {
  issuer: "https://example.com",
  authorization_endpoint: "https://example.com/oauth2/authorize",
  token_endpoint: "https://example.com/oauth2/token",
  userinfo_endpoint: "https://example.com/oauth2/userinfo",
  jwks_uri: "https://example.com/.well-known/jwks.json",
  response_types_supported: ["code", "token", "id_token", "code token", "code id_token", "token id_token", "code token id_token"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["RS256"],
  scopes_supported: ["openid", "email", "profile"],
  token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
  claims_supported: ["sub", "iss", "auth_time", "name", "given_name", "family_name", "email"]
};

/**
 * Sample JWT for testing
 */
export const sampleJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";