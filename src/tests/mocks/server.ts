import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Define your request handlers here.
// For now, it's empty. We'll add handlers as needed.
export const handlers = [
  // Handler for OpenID configuration endpoint
  http.get('https://login.my.chick-fil-a.com/.well-known/openid-configuration', () => {
    return HttpResponse.json({
      issuer: 'https://login.my.chick-fil-a.com',
      jwks_uri: 'https://login.my.chick-fil-a.com/.well-known/jwks.json',
      token_endpoint: 'https://login.my.chick-fil-a.com/oauth2/token',
      authorization_endpoint: 'https://login.my.chick-fil-a.com/oauth2/authorize'
    });
  }),

  // Handler for JWKS endpoint
  http.get('https://login.my.chick-fil-a.com/.well-known/jwks.json', () => {
    return HttpResponse.json({
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          kid: 'test-kid-1',
          n: 'sample-modulus',
          e: 'AQAB',
          alg: 'RS256'
        }
      ]
    });
  }),

  // Add more handlers here as needed
];

// This configures a request mocking server with the given handlers.
export const server = setupServer(...handlers);

// Re-export http and HttpResponse for use in test files
export { http, HttpResponse };