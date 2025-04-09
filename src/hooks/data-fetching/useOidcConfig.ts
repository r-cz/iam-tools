import { useState } from 'react';
import { proxyFetch } from '@/lib/proxy-fetch';
import type { OidcConfiguration } from '@/features/oidcExplorer/utils/types'; // Assuming types exist here

interface UseOidcConfigResult {
  data: OidcConfiguration | null;
  isLoading: boolean;
  error: Error | null;
  fetchConfig: (url: string) => Promise<void>;
}

/**
 * Hook to fetch OIDC configuration from an issuer URL.
 * Handles fetching via proxy if necessary.
 */
export function useOidcConfig(): UseOidcConfigResult {
  const [data, setData] = useState<OidcConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = async (issuerUrl: string) => {
    if (!issuerUrl) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Construct the well-known URL
    let wellKnownUrl = '';
    try {
      const url = new URL(issuerUrl);
      // Ensure trailing slash for correct joining
      const basePath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
      wellKnownUrl = new URL(
        `${basePath}.well-known/openid-configuration`,
        url.origin
      ).toString();
    } catch (e) {
      setError(new Error('Invalid Issuer URL format.'));
      setData(null);
      setIsLoading(false);
      return;
    }


    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await proxyFetch(wellKnownUrl);

      if (!response.ok) {
        let errorMsg = `Failed to fetch OIDC configuration: ${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          errorMsg += ` - ${JSON.stringify(errorBody)}`;
        } catch (e) { /* Ignore if response body is not JSON */ }
        throw new Error(errorMsg);
      }

      const configData: OidcConfiguration = await response.json();
      setData(configData);
    } catch (err) {
      console.error('Error fetching OIDC config:', err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // We don't fetch automatically on mount, but provide a function to trigger fetching
  return { data, isLoading, error, fetchConfig };
}
