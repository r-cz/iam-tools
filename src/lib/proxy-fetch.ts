/**
 * Utility for fetching resources through the CORS proxy
 */

/**
 * Fetches a resource through the CORS proxy
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns The fetch response
 */
export async function proxyFetch(url: string, options?: RequestInit): Promise<Response> {
  // Determine if we need to use the proxy
  const useProxy = needsProxy(url);
  
  console.log(`[proxyFetch] Request to: ${url}`);
  console.log(`[proxyFetch] Using proxy: ${useProxy}`);
  
  if (useProxy) {
    // Use the proxy URL
    // In development, the proxy is at localhost:8788
    // In production, it's at our deployed domain
    const baseProxyUrl = import.meta.env.DEV 
      ? 'http://localhost:8788/api/cors-proxy/'
      : '/api/cors-proxy/';
      
    const proxyUrl = `${baseProxyUrl}${encodeURIComponent(url)}`;
    console.log(`[proxyFetch] Proxying through: ${proxyUrl}`);
    return fetch(proxyUrl, options)
      .then(response => {
        console.log(`[proxyFetch] Proxy response status: ${response.status}`);
        return response;
      })
      .catch(error => {
        console.error(`[proxyFetch] Proxy error: ${error.message}`);
        throw error;
      });
  }
  
  // Otherwise, fetch directly
  console.log(`[proxyFetch] Fetching directly (no proxy needed)`);
  return fetch(url, options);
}

/**
 * Gets the current hostname, handling both browser and test environments
 * @returns The current hostname or empty string if not available
 */
function getCurrentHostname(): string {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && window?.location?.hostname) {
    return window.location.hostname;
  }
  
  // Check if we're in a test environment with globalThis.window
  if (typeof globalThis !== 'undefined' && (globalThis as any).window?.location?.hostname) {
    return (globalThis as any).window.location.hostname;
  }
  
  // Default to empty string
  return '';
}

/**
 * Determines if a URL needs to be proxied
 * @param url The URL to check
 * @returns True if the URL should be proxied
 */
function needsProxy(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Don't proxy requests to our own domain
    const currentHostname = getCurrentHostname();
    const isSameDomain = currentHostname && urlObj.hostname === currentHostname;
    if (isSameDomain) {
      return false;
    }
    
    // Don't proxy requests to localhost
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return false;
    }
    
    // Check if it's a well-known configuration or jwks endpoint
    const isWellKnown = urlObj.pathname.includes('/.well-known/');
    // Make the JWKS check case-insensitive and more inclusive
    const pathnameUpperCase = urlObj.pathname.toUpperCase();
    const isJwks = pathnameUpperCase.includes('/JWKS') || 
                  pathnameUpperCase.includes('/JWK') || 
                  urlObj.pathname.includes('/keys') ||
                  urlObj.pathname.includes('/oauth2/v1/certs') ||
                  urlObj.pathname.endsWith('.json') && pathnameUpperCase.includes('JWK');
    
    return isWellKnown || isJwks;
  } catch (e) {
    // If the URL is invalid, don't proxy
    return false;
  }
}
