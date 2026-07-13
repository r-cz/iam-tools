# Local IAM Utilities

These tools run entirely in the browser. They do not make network requests, persist pasted inputs, or place sensitive values in URLs.

## Token Claims Diff

Route: `/token-comparison`

Compare two compact JWTs to identify:

- Added, removed, changed, and unchanged header or payload paths
- Set-aware differences for `aud`, `scope`, `scp`, `roles`, `groups`, `permissions`, and `entitlements`
- Issuer, subject, audience, scope, issuance, expiration, and lifetime drift
- Nested custom-claim changes

The tool only decodes tokens. It does not verify signatures or prove that either token is trustworthy. Use Token Inspector for cryptographic verification and issuer/audience policy checks.

## Redirect URI Debugger

Route: `/oauth/redirect-uri`

Compare one requested OAuth redirect URI against a line-separated registration allowlist. The debugger checks:

- Exact string matching
- Native-app loopback IP redirects with dynamic ports
- Prohibited fragments and embedded credentials
- HTTPS, insecure non-loopback HTTP, and custom URI schemes
- Existing query retention
- Normalized-but-not-exact values and wildcard registrations

The tool never opens or contacts a redirect URI. Its checks follow the redirect endpoint rules in [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749.html) and native-app guidance in [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html).

## SCIM Resource Validator

Route: `/scim/resource-validator`

Validate SCIM 2.0 User and Group resources with field-level JSON paths. Checks include:

- Core User and Group schema declarations
- Required `userName` and Group `displayName` attributes
- Common scalar, complex, and multi-valued attribute types
- At most one `primary: true` value per multi-valued attribute
- Enterprise User and custom-extension declaration consistency
- Common metadata shape and resource-type mismatches

This is a structural validator based on [SCIM Core Schema RFC 7643](https://www.rfc-editor.org/rfc/rfc7643.html). A service provider can apply additional custom schemas, mutability rules, and policy.

## SCIM PATCH Builder

Route: `/scim/patch-builder`

Build or validate SCIM PatchOp documents:

- Compose `add`, `remove`, and `replace` operations
- Validate filtered and schema-qualified attribute paths
- Require paths and values according to operation semantics
- Produce canonical `application/scim+json` request JSON
- Inspect existing raw PatchOp documents

PATCH behavior follows [SCIM Protocol RFC 7644](https://www.rfc-editor.org/rfc/rfc7644.html).

## LDAP Filter Studio

Route: `/ldap/filter-studio`

Work with RFC 4515 LDAP search filters:

- Parse nested AND, OR, and NOT expressions
- Parse equality, presence, substring, ordering, and approximate comparisons
- Produce compact and indented filters
- Read a plain-language explanation and typed expression tree
- Generate strict URL percent encoding
- Escape untrusted assertion values to prevent filter injection

Syntax validation follows [RFC 4515](https://www.rfc-editor.org/rfc/rfc4515.html). Whether an entry matches can still vary by directory schema and server matching rules.

## TOTP Debugger

Route: `/mfa/totp`

Debug time-based one-time passwords with:

- Strict Base32 parsing
- `otpauth://totp` URI parsing
- SHA-1, SHA-256, and SHA-512 HMAC algorithms
- Six- or eight-digit codes and 30- or 60-second periods
- Previous, current, and next time windows
- Candidate-code verification with a configurable drift window
- Cryptographically random test-secret generation

The implementation is tested against all [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238.html) Appendix B vectors. Secrets remain in memory only; prefer non-production seeds.
