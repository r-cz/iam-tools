# OAuth Playground

The OAuth Playground is a feature that allows users to test and explore OAuth 2.0 flows interactively. It provides both a real IdP integration mode and a simulated demo mode for educational purposes.

## Features

- Interactive OAuth 2.0 flow testing
- Support for Authorization Code with PKCE flow
- Support for Client Credentials flow
- Real-world mode to connect to your own Identity Provider
- Demo mode with a simulated IdP for testing
- Step-by-step flow visualization
- PKCE code generation and verification
- Integration with the Token Inspector for examining received tokens
- Token introspection (RFC 7662) with demo mode support

## How to Use

### Authorization Code with PKCE Flow

The OAuth Playground walks you through the Authorization Code with PKCE flow in four steps:

### Client Credentials Flow

The Client Credentials flow is designed for server-to-server and machine-to-machine authentication, where no user is involved. To use this flow in the OAuth Playground:

1. **Select Flow**: Choose "Client Credentials" from the flow selector or the main playground page.
2. **Configuration**:
   - Enter the Token Endpoint URL of your Identity Provider.
   - Provide your Client ID and Client Secret.
   - Optionally, specify the scopes you want to request (space-separated).
3. **Request Token**:
   - Click "Request Token" to perform the client credentials grant.
   - The access token response will be displayed in the UI.
   - You can copy and inspect the token using the Token Inspector feature.

This flow is useful for testing API integrations and service accounts that require direct access to protected resources without user interaction.

### Token Introspection

The Token Introspection feature allows you to inspect and validate access tokens according to RFC 7662. This tool helps you:

1. **Configuration**:
   - Enter the introspection endpoint URL for your Identity Provider
   - Provide the token you want to introspect
   - Add client credentials if required by your IdP

2. **Demo Mode**:
   - Toggle demo mode to test introspection without making real API calls
   - Auto-fills demo tokens when enabled
   - Generates simulated introspection responses locally

3. **Introspection Response**:
   - View the full introspection response in JSON format
   - See whether the token is active or inactive
   - Review key claims like scope, expiration, issued at time
   - RFC 7662 claim explanations are provided for better understanding

4. **Integration**:
   - Recent tokens from other OAuth flows are available for quick access
   - Navigate directly to the Token Inspector for deeper JWT analysis
   - Copy introspection responses for debugging purposes

### General Usage Steps

1. **Select Flow**: Choose the OAuth flow you want to test from the available options.

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

- Support for additional OAuth flows (Implicit, etc.)
- Custom claim configuration for demo mode
- Support for confidential clients with client secret
- Refresh token flow demonstration
- OAuth 2.1 support
- Extended introspection features (revocation, token metadata)
