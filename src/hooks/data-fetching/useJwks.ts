import { useState } from 'react';
import { proxyFetch } from '@/lib/proxy-fetch';

// Basic JWK and JWK Set types (adjust if more specific types exist)
interface Jwk {
  kty: string;
  use?: string;
  kid?: string;
  alg?: string;
  [key: string]: any; // Allow other properties
}

interface JwkSet {
  keys: Jwk[];
}

interface UseJwksResult {
  data: JwkSet | null;
  isLoading: boolean;
  error: Error | null;
  fetchJwks: (url: string) => Promise<void>;
}

/**
 * Hook to fetch a JSON Web Key Set (JWKS) from a given URI.
 * Handles fetching via proxy if necessary.
 */
export function useJwks(): UseJwksResult {
  const [data, setData] = useState<JwkSet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchJwks = async (jwksUri: string) => {
    if (!jwksUri) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Validate URL format
    try {
      new URL(jwksUri);
    } catch (e) {
      setError(new Error('Invalid JWKS URI format.'));
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await proxyFetch(jwksUri);

      if (!response.ok) {
        let errorMsg = `Failed to fetch JWKS: ${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          errorMsg += ` - ${JSON.stringify(errorBody)}`;
        } catch (e) { /* Ignore if response body is not JSON */ }
        throw new Error(errorMsg);
      }

      const jwksData: JwkSet = await response.json();

      // Basic validation: Check if it has a 'keys' array
      if (!jwksData || !Array.isArray(jwksData.keys)) {
        throw new Error('Invalid JWKS format: Missing "keys" array.');
      }

      setData(jwksData);
    } catch (err) {
      console.error('Error fetching JWKS:', err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred while fetching JWKS'));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Provide a function to trigger fetching manually
  return { data, isLoading, error, fetchJwks };
}
