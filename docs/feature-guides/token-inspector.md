# Token Inspector

## Overview

The Token Inspector is a tool for inspecting and validating JWT (JSON Web Tokens). It allows you to:

- Decode JWT headers and payloads
- Validate token signatures using JWKS
- Analyze token expiration and validity periods
- Validate standard JWT claims
- View token size metrics

## Usage

### Basic Token Inspection

1. Navigate to the Token Inspector tool in the application
2. Paste a JWT into the input field
3. The token will be automatically decoded and displayed with:
   - Header section showing the algorithm, key ID, and other header claims
   - Payload section showing all claims in the token payload
   - Timeline showing the token's validity period
   - Size metrics showing the token's byte size

### Example

For a token like:

```
eyJhbGciOiJSUzI1NiIsImtpZCI6ImV4YW1wbGUta2V5LWlkIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.signature
```

The tool will show:

- **Header**: Algorithm (RS256) and Key ID (example-key-id)
- **Payload**: Subject, Name, Issued At, and Expiration claims
- **Timeline**: Visual representation of when the token was issued and when it expires
- **Size**: Token size in bytes and how it compares to common size limits

### Signature Validation

To validate a token's signature:

1. Enter a JWT with a signature
2. In the Signature section, enter the JWKS URI or paste a JWKS document
3. Click "Validate Signature"
4. The tool will fetch the JWKS (if a URI was provided) and validate the signature
5. The result will show whether the signature is valid or invalid

### Common JWKS URIs

The tool provides shortcuts for common identity providers' JWKS URIs, including:

- Auth0
- Azure AD
- Okta
- Google
- AWS Cognito

### Example Tokens

The tool includes example tokens to demonstrate various scenarios:

1. Valid RS256 token
2. Expired token
3. Token with standard OAuth claims
4. Token with custom claims

## Implementation Details

### Key Components

- **TokenInput.tsx**: Handles token input and parsing
- **TokenHeader.tsx**: Displays the decoded token header
- **TokenPayload.tsx**: Displays the decoded token payload with syntax highlighting
- **TokenTimeline.tsx**: Visualizes the token's validity period
- **TokenSignature.tsx**: Handles signature validation
- **TokenSize.tsx**: Shows token size metrics and warnings

### JWKS Resolution

The tool supports JWKS resolution through:

1. Direct URI input (with CORS proxy support)
2. Pasting JWKS JSON
3. Predefined provider shortcuts

### Claim Descriptions

The tool includes descriptions for standard JWT claims to help users understand:

- `iss` (Issuer)
- `sub` (Subject)
- `aud` (Audience)
- `exp` (Expiration Time)
- `nbf` (Not Before)
- `iat` (Issued At)
- `jti` (JWT ID)
- And many more standard and custom claims

## Advanced Usage

### Working with Custom Claims

The tool automatically detects and displays custom claims. It includes specialized rendering for known formats:

- URLs are displayed as clickable links
- Timestamps are displayed as human-readable dates
- JSON objects are properly formatted and syntax-highlighted

### Handling Large Tokens

For large tokens, the tool provides:

- Size warnings when tokens approach common size limits
- Performance optimizations to handle tokens with many claims
- Collapsible sections to focus on specific parts of the token

### Copying Values

To copy values from the token:

1. Hover over any claim value
2. Click the copy icon that appears
3. The value will be copied to your clipboard

## Troubleshooting

### Token Doesn't Decode

If a token doesn't decode properly, check:

1. The token format - it should be a standard JWT with three dot-separated parts
2. Whether the token includes any padding characters that need to be removed
3. If the token uses non-standard base64 encoding

### Signature Validation Fails

If signature validation fails:

1. Verify the JWKS URI is correct
2. Check if the token's `kid` (Key ID) matches a key in the JWKS
3. Ensure the token was signed with the algorithm specified in its header
4. Verify the token hasn't been tampered with

### CORS Issues with JWKS URI

If you encounter CORS issues when validating signatures:

1. Use the built-in CORS proxy by enabling "Use CORS Proxy" in the interface
2. Alternatively, download the JWKS document manually and paste it into the JWKS input field
