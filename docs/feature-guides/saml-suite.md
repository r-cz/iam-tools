# SAML Suite

## Overview

The SAML Suite provides a set of tools to build, inspect, and validate SAML messages and metadata:

- Response Decoder: Decode base64 SAML Responses, inspect assertions, and verify signatures.
- Request Builder: Build AuthnRequest for HTTP-POST and HTTP-Redirect; optional Redirect signing.
- Metadata Validator: Fetch/paste IdP metadata, inspect endpoints/keys, and verify the signature.
- SP Metadata Generator: Generate SP metadata XML with ACS/SLO endpoints and optional signing cert.

All tools follow the app’s standard layout and use syntax-highlighted, copyable code blocks.

## Response Decoder

Path: /saml/response-decoder

- Paste a base64-encoded SAML Response.
- Click “Decode Response”. Tabs show Response, Assertion details, and Signature.
- Signature tab:
  - Paste the IdP certificate (PEM or raw base64). The tool normalizes base64 to PEM.
  - Click “Verify Signatures” to validate Response-level and Assertion-level signatures.

Notes:

- Verification uses xmldsigjs + WebCrypto in the browser. Provide the correct signing certificate used by the IdP.
- This validates XML-DSig cryptographically. Functional validation (audiences, time window, recipients, InResponseTo, etc.) is not enforced yet.

## Request Builder

Path: /saml/request-builder

- Fill Issuer, Destination (IdP SSO URL), ACS URL, NameID format.
- Options: ForceAuthn, optional IsPassive.
- XML tab: Pretty-printed AuthnRequest XML.
- Encoded tab:
  - HTTP-POST: base64-encoded XML for form POST.
  - HTTP-Redirect: deflate-raw + base64 + URL-encoded `SAMLRequest` value.
- Launch tab:
  - HTTP-POST: Submit a form POST to the IdP.
  - HTTP-Redirect: Open a built Redirect URL.

Redirect Signing:

- Toggle “Sign Redirect” to sign the query per SAML Redirect binding spec.
- SigAlg: RSA-SHA256.
- Private key: paste PKCS#8 PEM (-----BEGIN PRIVATE KEY----- ...).
- Generates a “Signed Redirect URL” with SigAlg and Signature appended.

Tips:

- HTTP-Redirect encoding uses the browser `CompressionStream('deflate-raw')` API; prefer Chromium-based browsers.

## Metadata Validator

Path: /saml/metadata-validator

- Enter a metadata URL and click Fetch, or paste XML directly.
- The tool extracts:
  - entityID, presence of IDPSSODescriptor/SPSSODescriptor
  - SingleSignOnService / SingleLogoutService endpoints
  - KeyDescriptor certificates
- Verification:
  - Paste the metadata signing certificate (PEM or base64) and click Verify to validate the XML-DSig on EntityDescriptor.

Proxy

- The built-in proxy allows typical metadata endpoints (e.g., FederationMetadata.xml, /saml/metadata) to avoid CORS issues.

## SP Metadata Generator

Path: /saml/sp-metadata

- Configure entityID, ACS (HTTP-POST), optional SLO (HTTP-Redirect), NameIDFormat.
- Optional: include an X.509 certificate (base64 body, no PEM headers) for signing keys.
- Copy the generated XML and use it when configuring your SP with an IdP.

## Security Notes

- Never paste private keys you do not control or keys from production environments.
- Redirect signing keys are processed only in-browser and not transmitted to servers.
- Signature verification runs on the client side.

## Roadmap

- ECDSA (P-256) support for Redirect signing
- Functional response validation (audience/time/recipient/InResponseTo)
- Richer metadata checks (expiry, multiple keys, key rollover guidance)
