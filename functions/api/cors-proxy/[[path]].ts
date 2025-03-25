
export interface Env {
  // Add any environment variables you need here
}

/**
 * CORS Proxy for IAM Tools
 * 
 * This function acts as a proxy for external APIs that don't support CORS,
 * such as .well-known configuration endpoints and JWKS URIs.
 * 
 * Usage: /api/cors-proxy/https://example.com/path
 */
export const onRequest: PagesFunction = async (context) => {
  // Extract the target URL from the request path
  // The [[path]] syntax in the filename allows us to capture everything after /api/cors-proxy/
  const url = context.params.path?.join('/');
  
  if (!url) {
    return new Response('No URL provided', { status: 400 });
  }

  try {
    // Verify this is a valid URL
    const targetUrl = decodeURIComponent(url);
    new URL(targetUrl); // This will throw if the URL is invalid
    
    // We only want to proxy specific endpoints
    if (!isAllowedEndpoint(targetUrl)) {
      return new Response('This endpoint is not allowed', { status: 403 });
    }

    const request = new Request(targetUrl, {
      method: context.request.method,
      headers: filterHeaders(context.request.headers),
      body: ['GET', 'HEAD'].includes(context.request.method) 
        ? undefined 
        : await context.request.blob(),
    });

    // Fetch the target URL
    const response = await fetch(request);
    
    // Clone the response to modify its headers
    const newResponse = new Response(response.body, response);
    
    // Add CORS headers
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return newResponse;
  } catch (error) {
    return new Response(`Error proxying request: ${error.message}`, { status: 500 });
  }
};

/**
 * Check if the requested endpoint is allowed for proxying
 */
function isAllowedEndpoint(url: string): boolean {
  // Parse the URL
  const parsedUrl = new URL(url);
  
  // Check if it's a well-known configuration or jwks endpoint
  const isWellKnown = parsedUrl.pathname.includes('/.well-known/');
  
  // Make the JWKS check case-insensitive and more inclusive
  const pathnameUpperCase = parsedUrl.pathname.toUpperCase();
  const isJwks = pathnameUpperCase.includes('/JWKS') || 
                pathnameUpperCase.includes('/JWK') || 
                parsedUrl.pathname.includes('/keys') ||
                parsedUrl.pathname.includes('/oauth2/v1/certs') ||
                parsedUrl.pathname.endsWith('.json') && pathnameUpperCase.includes('JWK');
  
  const allowed = isWellKnown || isJwks;
  
  // Log for debugging purposes
  console.log(`Proxy request to: ${url}`);
  console.log(`Path: ${parsedUrl.pathname}`);
  console.log(`isWellKnown: ${isWellKnown}, isJwks: ${isJwks}`);
  console.log(`Request allowed: ${allowed}`);
  
  return allowed;
}

/**
 * Filter request headers to forward to the target
 */
function filterHeaders(headers: Headers): Headers {
  const filtered = new Headers();
  
  // Copy allowed headers
  for (const [key, value] of headers.entries()) {
    // Skip headers that might cause issues
    if (
      !key.toLowerCase().startsWith('cf-') && 
      !key.toLowerCase().startsWith('cloudflare-') &&
      key.toLowerCase() !== 'host' &&
      key.toLowerCase() !== 'origin' &&
      key.toLowerCase() !== 'referer'
    ) {
      filtered.set(key, value);
    }
  }
  
  return filtered;
}
