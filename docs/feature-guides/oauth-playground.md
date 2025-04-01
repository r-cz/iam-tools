# OAuth Playground

The OAuth Playground is a feature that allows users to test and explore OAuth 2.0 flows interactively. It provides both a real IdP integration mode and a simulated demo mode for educational purposes.

## Features

- Interactive OAuth 2.0 flow testing
- Support for Authorization Code with PKCE flow
- Real-world mode to connect to your own Identity Provider
- Demo mode with a simulated IdP for testing
- Step-by-step flow visualization
- PKCE code generation and verification
- Integration with the Token Inspector for examining received tokens

## How to Use

### Authorization Code with PKCE Flow

The OAuth Playground walks you through the Authorization Code with PKCE flow in four steps:

1. **Select Flow**: Choose the OAuth flow you want to test (currently only Authorization Code with PKCE is supported).

2. **Configuration**:
   - **Real IdP Mode**: Enter your IdP issuer URL for auto-discovery or manually configure endpoints.
   - **Demo Mode**: Enable demo mode to use a simulated Identity Provider.
   - Configure client ID, redirect URI, and scopes.
   - View and manage PKCE parameters (code verifier, code challenge).

3. **Authorization**:
   - View the constructed authorization request URL.
   - Launch the authorization request to your IdP.
   - In demo mode, a simplified login form will be displayed.

4. **Token Exchange**:
   - After receiving the authorization code, exchange it for tokens.
   - View the received tokens (access token, ID token, refresh token).
   - Inspect tokens using the Token Inspector feature.

### Demo Mode

Demo mode provides a simulated Identity Provider for testing the OAuth flow without needing a real IdP. It includes:

- Simulated authorization server
- Simple login page
- Automatic token generation
- JWKS endpoint for validation

## Implementation Details

### Real IdP Mode

In real IdP mode, the OAuth Playground:

1. Discovers OAuth endpoints from the issuer URL.
2. Generates cryptographically secure PKCE parameters.
3. Constructs and launches an authorization request to your IdP.
4. Receives the authorization code via the callback endpoint.
5. Exchanges the code for tokens using your IdP's token endpoint.
6. Displays and allows inspection of the received tokens.

### Demo Mode

In demo mode, the OAuth Playground:

1. Uses a simulated OAuth server for token issuance.
2. Provides a simple login page with no actual authentication.
3. Simulates the complete OAuth flow for educational purposes.

## Security Considerations

- The OAuth Playground is intended for educational and testing purposes only.
- Do not use production credentials in the tool.
- Client IDs and generated tokens are visible in the UI - do not use sensitive credentials.
- For real-world implementations, follow OAuth security best practices:
  - Use HTTPS for all endpoints
  - Validate all tokens and state parameters
  - Implement proper PKCE for public clients
  - Follow the principle of least privilege for scopes

## Next Steps

Future enhancements to the OAuth Playground include:

- Support for additional OAuth flows (Client Credentials, Implicit, etc.)
- Advanced token introspection and validation
- Custom claim configuration for demo mode
- Support for confidential clients with client secret
- Refresh token flow demonstration
- OAuth 2.1 support
