# API Documentation

IAM Tools provides several API endpoints that support the frontend application. These endpoints are implemented within a Cloudflare Worker in `src/worker.ts`.

## CORS Proxy

The CORS proxy allows the frontend to make requests to external APIs that don't have CORS headers configured to allow requests from our domain.

### Endpoint

```
GET|HEAD /api/cors-proxy/:encoded-url
```

Where `:url` is the URL-encoded target endpoint you want to access.

### Examples

#### Basic Usage

To fetch an OIDC configuration from a provider that doesn't allow CORS:

```javascript
// Frontend code
const fetchConfig = async (issuerUrl) => {
  const targetUrl = `${issuerUrl}/.well-known/openid-configuration`
  const proxyUrl = `/api/cors-proxy/${encodeURIComponent(targetUrl)}`

  const response = await fetch(proxyUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }

  return await response.json()
}
```

#### With Query Parameters

To fetch an endpoint with query parameters:

```javascript
const targetUrl = `https://example.com/api/resource?param1=value1&param2=value2`
const proxyUrl = `/api/cors-proxy/${encodeURIComponent(targetUrl)}`
```

#### Method Support

The proxy only allows `GET` and `HEAD` requests. Other methods return `405`.

### Implementation Details

The CORS proxy is implemented in `src/worker.ts`. It:

1. Extracts the target URL from the request path
2. Forwards a filtered GET/HEAD request to the target URL
3. Receives the response from the target
4. Adds appropriate CORS headers to allow the frontend to access the response
5. Returns the modified response to the frontend

Outbound proxy requests identify themselves with the `iam.tools/1.0 (+https://iam.tools)` user agent. Browser-supplied user-agent and other arbitrary headers are not forwarded.

### Security and Restrictions

To prevent abuse, the proxy applies strict allow-listing and method limits:

- Allowed targets: only well-known discovery and JWKS-like endpoints
  - Paths containing `/.well-known/`
  - JWKS/certs-style paths such as `/jwks`, `/jwk`, `/keys`, `/oauth2/v1/certs`, or `.json` files that include `jwk` in the name
- Allowed methods: `GET` and `HEAD` only
- Request header filtering: strips Cloudflare-provided headers and sensitive hop-by-hop headers (`host`, `origin`, `referer`)
- CORS allowlist: if `CORS_ALLOWED_ORIGINS` is set, only those origins are echoed back; disallowed origins receive `403`
- Local development: requests from `localhost` or `127.0.0.1` are always allowed
- CORS: sets `Access-Control-Allow-*` headers on proxy responses for the frontend to consume
- Rate limiting: 60 requests/min per client IP (in-worker, per instance)

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
  const jwksUrl = '/api/jwks/'
  const jwksResponse = await fetch(jwksUrl)
  const jwks = await jwksResponse.json()

  // Use the JWKS to validate the token signature
  return verifyTokenSignature(token, jwks)
}
```

### Implementation Details

The JWKS endpoint is implemented in `src/worker.ts`. It:

1. Generates or retrieves pre-configured RSA key pairs
2. Formats the public keys as a JWKS document
3. Returns the JWKS document with appropriate CORS headers

## Error Handling

HTTP status codes carry the transport result. Demo OAuth endpoints use the standard flat OAuth
shape (`error` and optional `error_description`); proxy and infrastructure routes may return a
route-specific JSON error. Callers should not assume one nested error envelope across all routes.

- **400 Bad Request**: When the request is malformed or missing required parameters
- **404 Not Found**: When the requested resource doesn't exist
- **500 Internal Server Error**: For unexpected server errors

```json
{ "error": "invalid_request", "error_description": "Detailed error message" }
```

## Rate Limiting

Rate limiting is enforced in-worker (per instance):

- CORS proxy: 60 requests/min per client IP
- OIDC endpoint preflight probe: 90 requests/min per client IP
- Demo OAuth/OIDC endpoints: 120 requests/min per client IP

When exceeded, the API responds with `429` and a `Retry-After` header. Local development on `localhost` is not rate limited. For global enforcement across regions, consider Cloudflare's rate limiting products.

## Demo OAuth/OIDC Endpoints

IAM Tools also ships a demo OAuth/OIDC provider for local testing and the OAuth Playground demo mode:

- `GET /api/.well-known/openid-configuration` (discovery)
- `GET /api/auth` (authorization code redirect)
- `POST /api/token` (authorization_code, refresh_token, client_credentials)
- `POST /api/token/generate` (direct token generation with custom claims)
- `GET /api/userinfo` (Bearer token required)
- `POST /api/introspect` (RFC 7662-style response)
- `POST /api/revoke` (always returns 200)

## OIDC Endpoint Preflight Probe

`POST /api/oidc-preflight-probe` performs the Worker-assisted fallback used when a browser cannot
directly probe a discovered endpoint because of CORS or network policy. The JSON body supplies the
target `url`, probe `method`, and sanitized probe headers/body. The Worker accepts only HTTP(S)
targets that pass its public-network checks and returns `{ "ok": true, "status", "statusText" }`
or `{ "ok": false, "error" }`. This route is not a general proxy.

The demo token endpoints accept an optional `claims` JSON object; reserved standard claims are ignored.

### Demo Token/Auth Code Integrity

- Access tokens and ID tokens are JWTs signed with the demo RSA key.
- `/api/userinfo` and `/api/introspect` verify signature integrity for demo-issued JWTs before treating them as active.
- Authorization codes and refresh tokens operate in two modes:
  - Compatibility mode (default): tagged payload encoding without an integrity signature.
  - Strict mode (`DEMO_TOKEN_SIGNING_SECRET` set): HMAC-signed, artifact-tagged envelopes in `v2.<payload>.<sig>` format.
- Auth codes and refresh tokens carry distinct `kind` tags and cannot be exchanged through the wrong grant.
- In strict mode, tampered, legacy, or wrong-kind artifacts are rejected with `invalid_grant`.
- Demo authorization redirects default to this app's exact `/oauth-playground/callback` URI (with localhost/127.0.0.1 cross-port support in local development). Additional exact callback URIs can be registered with the comma-separated `DEMO_REDIRECT_URIS` Worker variable.
