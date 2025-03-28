# OIDC Explorer

## Overview

The OIDC Explorer is a tool for exploring and analyzing OpenID Connect (OIDC) provider configurations. It allows you to:

- Fetch and display `.well-known/openid-configuration` endpoints
- Analyze OIDC provider metadata
- Fetch and inspect JSON Web Key Sets (JWKS)
- Identify common providers based on configuration patterns

## Usage

### Basic OIDC Configuration Exploration

1. Navigate to the OIDC Explorer tool in the application
2. Enter an issuer URL in the input field (e.g., `https://accounts.google.com`)
3. Click "Fetch Configuration" or press Enter
4. The tool will automatically append `/.well-known/openid-configuration` to the URL and fetch the configuration
5. The configuration will be displayed with syntax highlighting

### Example

For an issuer URL like `https://accounts.google.com`, the tool will:

1. Fetch `https://accounts.google.com/.well-known/openid-configuration`
2. Display the configuration JSON with all endpoints and supported features
3. Identify the provider as Google, if possible
4. Provide quick access to the JWKS URI

### Working with JWKS

To view a provider's JSON Web Key Set:

1. After fetching a configuration, click on the JWKS URI or the "Fetch JWKS" button
2. The JWKS will be fetched and displayed with syntax highlighting
3. The tool will show the number of keys and their types (RSA, EC, etc.)

### Provider Identification

The tool attempts to identify common OIDC providers based on patterns in the configuration:

- **Auth0**: Contains `auth0.com` in the issuer URL
- **Azure AD**: Contains `microsoftonline.com` or has specific Microsoft claims
- **Okta**: Contains `okta.com` in the issuer URL
- **Google**: Contains `google.com` or `googleapis.com` in the issuer URL
- **AWS Cognito**: Contains `cognito-idp.amazonaws.com` in the issuer URL
- **Keycloak**: Contains specific Keycloak patterns in the configuration

When a provider is identified, additional information and tips specific to that provider may be displayed.

## Implementation Details

### Key Components

- **ConfigInput.tsx**: Handles issuer URL input and configuration fetching
- **ConfigDisplay.tsx**: Displays the OIDC configuration with syntax highlighting
- **JwksDisplay.tsx**: Fetches and displays the JWKS
- **ProviderInfo.tsx**: Shows provider-specific information

### CORS Handling

The tool uses the built-in CORS proxy to fetch configurations and JWKS from providers that don't support CORS. This allows the tool to work with any OIDC provider regardless of CORS settings.

### Common Endpoints

The tool includes information about standard OIDC endpoints:

- **authorization_endpoint**: Used for authentication requests
- **token_endpoint**: Used to obtain tokens
- **userinfo_endpoint**: Used to get user information
- **jwks_uri**: Contains the JSON Web Key Set
- **registration_endpoint**: Used for dynamic client registration
- **end_session_endpoint**: Used for logout

## Advanced Usage

### Analyzing Scopes and Claims

For each provider, the tool can display:

1. Supported scopes
2. Claims associated with each scope
3. Custom scopes specific to the provider

### Comparing Providers

To compare multiple providers:

1. Fetch the first provider's configuration
2. Use the "Add Provider" button to create a new input
3. Fetch another provider's configuration
4. The tool will display both configurations for comparison

### Troubleshooting Common Issues

#### Configuration Not Found

If the configuration can't be fetched:

1. Verify the issuer URL is correct
2. Check if the provider uses a non-standard configuration path
3. Try using the direct URL to the configuration endpoint

#### JWKS Fetching Issues

If the JWKS can't be fetched:

1. Verify the JWKS URI in the configuration is correct
2. Check if the provider requires authentication to access the JWKS
3. Try fetching the JWKS directly using the browser

#### Provider Not Identified

If a provider isn't automatically identified:

1. Check if the provider is using a custom domain
2. Look for identifying patterns in the configuration
3. Manually select the provider type if available

## Provider-Specific Information

### Auth0

- Supports custom domains
- Includes tenant information in the issuer URL
- May have multiple signing keys for rotating keys

### Azure AD

- Uses different endpoints for v1.0 and v2.0
- Supports both common endpoints and tenant-specific endpoints
- May include Microsoft Graph permissions

### Okta

- Includes org information in the issuer URL
- Supports custom authorization servers
- May have multiple authentication policies

### Google

- Supports multiple authentication flows
- Includes Google-specific scopes and claims
- Uses consistent key rotation practices

### AWS Cognito

- Includes region and user pool ID in the issuer URL
- Supports custom domains
- Has AWS-specific integration features
