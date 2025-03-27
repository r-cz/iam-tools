
import type { PagesFunction } from '@cloudflare/workers-types';

/**
 * This function serves a mock OpenID Connect discovery document
 * for the example tokens created in the token inspector.
 * 
 * It follows the OpenID Connect Discovery 1.0 specification.
 */
export const onRequest: PagesFunction = async (context) => {
  // Determine the base URL of our service
  const url = new URL(context.request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const issuer = `${baseUrl}/api`;

  const configuration = {
    issuer: issuer,
    jwks_uri: `${issuer}/jwks`,
    authorization_endpoint: `${issuer}/auth`, // Mock endpoint, not implemented
    token_endpoint: `${issuer}/token`, // Mock endpoint, not implemented
    userinfo_endpoint: `${issuer}/userinfo`, // Mock endpoint, not implemented
    response_types_supported: ["code", "token", "id_token", "code token", "code id_token", "token id_token", "code token id_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email", "api"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    claims_supported: [
      "sub", "name", "preferred_username", "given_name", "family_name", 
      "email", "email_verified", "locale", "updated_at"
    ]
  };

  return new Response(JSON.stringify(configuration, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=86400" // Cache for 24 hours
    }
  });
};
