# API Documentation

IAM Tools provides several API endpoints that support the frontend application. These endpoints are implemented within a Cloudflare Worker in `src/worker.ts`.

## CORS Proxy

The CORS proxy allows the frontend to make requests to external APIs that don't have CORS headers configured to allow requests from our domain.

### Endpoint

```
GET /api/cors-proxy/:url
```

Where `:url` is the URL-encoded target endpoint you want to access.

### Examples

#### Basic Usage

To fetch an OIDC configuration from a provider that doesn't allow CORS:

```javascript
// Frontend code
const fetchConfig = async (issuerUrl) => {
  const targetUrl = `${issuerUrl}/.well-known/openid-configuration`;
  const proxyUrl = `/api/cors-proxy/${encodeURIComponent(targetUrl)}`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  
  return await response.json();
};
```

#### With Query Parameters

To fetch an endpoint with query parameters:

```javascript
const targetUrl = `https://example.com/api/resource?param1=value1&param2=value2`;
const proxyUrl = `/api/cors-proxy/${encodeURIComponent(targetUrl)}`;
```

#### With Different HTTP Methods

The proxy supports all HTTP methods (GET, POST, PUT, DELETE, etc.):

```javascript
// For a POST request
const targetUrl = `https://example.com/api/resource`;
const proxyUrl = `/api/cors-proxy/${encodeURIComponent(targetUrl)}`;

const response = await fetch(proxyUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ key: 'value' })
});
```

### Implementation Details

The CORS proxy is implemented in `src/worker.ts`. It:

1. Extracts the target URL from the request path
2. Forwards the original request (including headers and body) to the target URL
3. Receives the response from the target
4. Adds appropriate CORS headers to allow the frontend to access the response
5. Returns the modified response to the frontend

### Security and Restrictions

To prevent abuse, the proxy applies strict allow-listing and method limits:

- Allowed targets: only well-known discovery and JWKS-like endpoints
  - Paths containing `/.well-known/`
  - JWKS/certs-style paths such as `/jwks`, `/jwk`, `/keys`, `/oauth2/v1/certs`, or `.json` files that include `jwk` in the name
- Allowed methods: `GET` and `HEAD` only
- Request header filtering: strips Cloudflare-provided headers and sensitive hop-by-hop headers (`host`, `origin`, `referer`)
- CORS: sets permissive `Access-Control-Allow-*` headers on proxy responses for the frontend to consume

## JWKS Endpoint

The JWKS (JSON Web Key Set) endpoint provides a set of public keys that can be used to verify JWT signatures.

### Endpoint

```
GET /api/jwks/
```

### Response Format

The endpoint returns a standard JWKS document with a set of keys:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "example-key-id",
      "use": "sig",
      "alg": "RS256",
      "n": "...",
      "e": "..."
    }
  ]
}
```

### Usage

This endpoint is primarily used for demonstration purposes in the Token Inspector feature to show how JWT validation works with JWKS endpoints.

```javascript
// Example of validating a token against the JWKS endpoint
const validateToken = async (token) => {
  const jwksUrl = '/api/jwks/';
  const jwksResponse = await fetch(jwksUrl);
  const jwks = await jwksResponse.json();
  
  // Use the JWKS to validate the token signature
  return verifyTokenSignature(token, jwks);
};
```

### Implementation Details

The JWKS endpoint is implemented in `src/worker.ts`. It:

1. Generates or retrieves pre-configured RSA key pairs
2. Formats the public keys as a JWKS document
3. Returns the JWKS document with appropriate CORS headers

## Error Handling

All API endpoints follow consistent error handling patterns:

- **400 Bad Request**: When the request is malformed or missing required parameters
- **404 Not Found**: When the requested resource doesn't exist
- **500 Internal Server Error**: For unexpected server errors

Errors are returned as JSON with a consistent format:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Detailed error message"
  }
}
```

## Rate Limiting

These endpoints currently do not implement rate limiting. However, Cloudflare provides rate limiting capabilities that can be configured in the Cloudflare dashboard if needed.

## Future API Enhancements

Planned API enhancements include:

1. Token generation endpoint for creating signed JWTs with custom claims
2. OIDC discovery endpoint for simulating an OIDC provider
3. OAuth 2.0 endpoints for simulating an authorization server
