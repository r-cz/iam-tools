
/**
 * Cloudflare Pages Functions middleware
 * This middleware applies to all functions and adds CORS headers for preflight requests
 */
export const onRequest: PagesFunction = async (context) => {
  // Handle CORS preflight requests
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Forward to the next handler (the actual function)
  return context.next();
};
