import { proxyFetch } from "@/lib/proxy-fetch";
import { OidcConfiguration, Jwks } from "./types";

// Modify the URL validation function for greater security
function isUrlFromDomain(urlString: string, domain: string): boolean {
  try {
    // Try to parse the URL
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Check if the hostname exactly matches the domain
    if (hostname === domain.toLowerCase()) {
      return true;
    }
    
    // Check if it's a subdomain (ends with .domain)
    // This ensures only proper subdomains match, not strings that merely contain the domain
    if (hostname.endsWith(`.${domain.toLowerCase()}`)) {
      return true;
    }
    
    return false;
  } catch (e) {
    // If URL parsing fails, consider it not matching
    return false;
  }
}

// Removed fetchOidcConfig function as it's replaced by useOidcConfig hook

/**
 * Fetches the JWKS from the provider (Still used by tests)
 * @param jwksUri The URI to the JWKS
 * @returns The JWKS with public keys
 */
export async function fetchJwks(jwksUri: string): Promise<Jwks> {
  try {
    console.log(`Fetching JWKS from: ${jwksUri}`);
    
    // Fetch the JWKS
    const response = await proxyFetch(jwksUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
    }
    
    // Parse the JWKS
    const jwks = await response.json();
    
    // Validate the JWKS structure
    if (!jwks.keys || !Array.isArray(jwks.keys)) {
      throw new Error("Invalid JWKS format: missing 'keys' array");
    }
    
    // Additional validation: each key should have kid and kty
    for (const key of jwks.keys) {
      if (!key.kid) {
        console.warn('JWKS contains key without kid', key);
      }
      if (!key.kty) {
        console.warn('JWKS contains key without kty', key);
      }
    }
    
    return jwks;
  } catch (error: any) {
    console.error("Error fetching JWKS:", error);
    
    // Enhance error messages for common issues
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      throw new Error(`CORS error: Could not fetch JWKS from ${jwksUri}. The server may not allow direct browser access.`);
    }
    
    throw error;
  }
}

/**
 * Formats a JWK for display
 * @param key The JWK object
 * @returns A formatted string representation
 */
export function formatJwkForDisplay(key: any): string {
  if (!key) return 'No key provided';
  
  let output = '';
  
  if (key.kid) {
    output += `Key ID: ${key.kid}\n`;
  }
  
  if (key.kty) {
    output += `Key Type: ${key.kty}\n`;
  }
  
  if (key.use) {
    output += `Usage: ${key.use === 'sig' ? 'Signature' : key.use}\n`;
  }
  
  if (key.alg) {
    output += `Algorithm: ${key.alg}\n`;
  }
  
  return output;
}

/**
 * Detects the identity provider from the configuration
 * Uses both the issuer URL and configuration-specific markers
 * @param config The OpenID Connect configuration
 * @returns The provider name or null if unknown
 */
export function detectProvider(issuerUrl: string, config?: OidcConfiguration): string | null {
  if (!issuerUrl && !config) return null;
  
  const url = issuerUrl.toLowerCase();
  let parsedUrl: URL | null = null;
  
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    // If we can't parse the URL, just use the string version
    console.warn('Could not parse issuer URL:', url);
  }
  
  // First try to detect provider using the configuration if available
  if (config) {
    // PingFederate detection
    // Look for PingFederate-specific endpoints and properties
    if (
      // Look for Ping-specific fields/values in the configuration
      hasPingFederateMarkers(config) ||
      // Fallback to URL matching for Ping
      (parsedUrl && (isUrlFromDomain(url, 'pingidentity.com') || 
                     isUrlFromDomain(url, 'ping-eng.com'))) ||
      url.includes('pingfederate') ||
      url.includes('ping.') ||
      // PingOne detection
      url.includes('pingone.') ||
      url.includes('ping-one.')
    ) {
      return config.ping_provider_display_name || 'Ping Identity';
    }

    // Okta detection
    if (
      // Check for Okta-specific properties
      hasOktaMarkers(config) ||
      // Fallback to URL detection
      (parsedUrl && isUrlFromDomain(url, 'okta.com')) ||
      url.includes('.okta.')
    ) {
      return 'Okta';
    }

    // Auth0 detection
    if (
      // Check for Auth0-specific properties
      hasAuth0Markers(config) ||
      // Fallback to URL detection
      (parsedUrl && isUrlFromDomain(url, 'auth0.com')) ||
      url.includes('.auth0.')
    ) {
      return 'Auth0';
    }

    // Microsoft Entra ID / Azure AD detection
    if (
      // Check for Microsoft-specific properties
      hasMicrosoftMarkers(config) ||
      // Fallback to URL detection
      (parsedUrl && (isUrlFromDomain(url, 'login.microsoftonline.com') ||
                     isUrlFromDomain(url, 'login.windows.net') ||
                     isUrlFromDomain(url, 'sts.windows.net')))
    ) {
      return 'Microsoft Entra ID (Azure AD)';
    }

    // Google detection
    if (
      // Check for Google-specific properties
      hasGoogleMarkers(config) ||
      // Fallback to URL detection
      (parsedUrl && isUrlFromDomain(url, 'accounts.google.com'))
    ) {
      return 'Google';
    }

    // AWS Cognito detection
    if (
      // Check for Cognito-specific properties
      hasCognitoMarkers(config) ||
      // Fallback to URL detection
      (parsedUrl && url.includes('cognito-idp') && isUrlFromDomain(url, 'amazonaws.com'))
    ) {
      return 'AWS Cognito';
    }

    // Keycloak detection
    if (
      // Check for Keycloak-specific properties
      hasKeycloakMarkers(config) ||
      // Fallback to URL detection
      url.includes('keycloak')
    ) {
      return 'Keycloak';
    }

    // ForgeRock detection
    if (
      // Check for ForgeRock-specific properties
      hasForgeRockMarkers(config) ||
      // Fallback to URL detection
      (parsedUrl && (isUrlFromDomain(url, 'forgerock.io') || 
                     isUrlFromDomain(url, 'forgerock.com')))
    ) {
      return 'ForgeRock';
    }

    // IdentityServer/Duende detection
    if (
      // Check for IdentityServer-specific properties
      hasIdentityServerMarkers(config) ||
      // Fallback to URL detection
      (parsedUrl && isUrlFromDomain(url, 'duendesoftware.com')) ||
      url.includes('identityserver')
    ) {
      return config.server ? 'Duende IdentityServer' : 'IdentityServer';
    }
  }
  
  // Fallback to URL matching only
  if (parsedUrl) {
    if (isUrlFromDomain(url, 'auth0.com')) {
      return 'Auth0';
    } else if (isUrlFromDomain(url, 'okta.com')) {
      return 'Okta';
    } else if (isUrlFromDomain(url, 'login.microsoftonline.com')) {
      return 'Microsoft Entra ID (Azure AD)';
    } else if (isUrlFromDomain(url, 'accounts.google.com')) {
      return 'Google';
    } else if (url.includes('cognito-idp') && isUrlFromDomain(url, 'amazonaws.com')) {
      return 'AWS Cognito';
    } else if (isUrlFromDomain(url, 'login.salesforce.com')) {
      return 'Salesforce';
    } else if (isUrlFromDomain(url, 'pingidentity.com') || isUrlFromDomain(url, 'ping-eng.com') || url.includes('pingfederate')) {
      return 'Ping Identity';
    } else if (isUrlFromDomain(url, 'onelogin.com')) {
      return 'OneLogin';
    } else if (url.includes('keycloak')) {
      return 'Keycloak';
    } else if (isUrlFromDomain(url, 'forgerock.io') || isUrlFromDomain(url, 'forgerock.com')) {
      return 'ForgeRock';
    } else if (isUrlFromDomain(url, 'duendesoftware.com')) {
      return 'Duende IdentityServer';
    } else if (url.includes('identityserver')) {
      return 'IdentityServer';
    }
  }
  
  return null;
}

// Helper functions to detect provider-specific markers

/**
 * Checks for PingFederate specific properties in the OIDC configuration
 */
function hasPingFederateMarkers(config: OidcConfiguration): boolean {
  // PingFederate typically has properties with the ping_ prefix
  const hasPingPrefix = Object.keys(config).some(key => key.startsWith('ping_'));
  
  // Check for PingAccess-specific endpoints or features
  const hasPingAccessFeatures = config.backchannel_logout_supported &&
    config.backchannel_logout_session_supported &&
    (config.device_authorization_endpoint?.includes('/as/device_authz') || false) &&
    (config.registration_endpoint?.includes('/as/clients') || false);
  
  // Check for PingFederate version info
  const hasPingVersionInfo = !!config.ping_identity_version;

  // Check for PingAccess specifics
  const hasPingAccessSpecifics = !!config.pingaccess_logout_capable || !!config.pingaccess_supported;
  
  return hasPingPrefix || hasPingAccessFeatures || hasPingVersionInfo || hasPingAccessSpecifics;
}

/**
 * Checks for Okta specific properties in the OIDC configuration
 */
function hasOktaMarkers(config: OidcConfiguration): boolean {
  // Okta has specific endpoints for its OAuth/OIDC service
  const hasOktaEndpoints = 
    (config.registration_endpoint?.includes('/oauth2/v1/clients') || false) ||
    (config.issuer && isUrlFromDomain(config.issuer, 'okta.com') && config.issuer.includes('/oauth2'));
  
  // Okta sometimes uses the 'okta_' prefix for custom properties
  const hasOktaPrefix = Object.keys(config).some(key => key.startsWith('okta_'));
  
  // Check for Okta-specific claims and features
  const hasOktaSpecificClaims = 
    config.claims_supported?.includes('groups') &&
    config.claims_supported?.includes('email_verified') &&
    !!config.request_parameter_supported;
    
  // Check for typical Okta scopes
  const hasOktaScopes =
    config.scopes_supported?.includes('okta.users.read') ||
    config.scopes_supported?.includes('okta.apps.read');
    
  return !!(hasOktaEndpoints || hasOktaPrefix || hasOktaSpecificClaims || hasOktaScopes);
}

/**
 * Checks for Auth0 specific properties in the OIDC configuration
 */
function hasAuth0Markers(config: OidcConfiguration): boolean {
  // Auth0 has specific endpoints and patterns
  const hasAuth0Endpoints = 
    (config.issuer && isUrlFromDomain(config.issuer, 'auth0.com')) ||
    (config.userinfo_endpoint?.includes('userinfo') || false);
  
  // Auth0 often includes specific scopes
  const hasAuth0Scopes = 
    config.scopes_supported?.includes('offline_access') &&
    config.scopes_supported?.includes('openid') &&
    config.scopes_supported?.includes('device');
    
  // Auth0 specific properties
  const hasAuth0Properties = 
    Object.keys(config).includes('device_code_validity_seconds') ||
    Object.keys(config).includes('mfa_challenge_endpoint');
    
  return hasAuth0Endpoints || hasAuth0Scopes || hasAuth0Properties;
}

/**
 * Checks for Microsoft Entra ID specific properties in the OIDC configuration
 */
function hasMicrosoftMarkers(config: OidcConfiguration): boolean {
  // Microsoft Entra ID has specific endpoints
  const hasMicrosoftEndpoints = 
    (config.issuer && isUrlFromDomain(config.issuer, 'login.microsoftonline.com')) ||
    (config.token_endpoint?.includes('oauth2/v2.0/token') || false);
  
  // Microsoft often includes tenant info
  const hasTenantInfo = !!config.tenant_region_scope;
  
  // Microsoft specific claims
  const hasMicrosoftClaims = 
    config.claims_supported?.includes('tid') &&
    config.claims_supported?.includes('acct');
    
  // Microsoft specific properties
  const hasMicrosoftProperties = 
    Object.keys(config).includes('msgraph_host') ||
    Object.keys(config).includes('cloud_graph_host_name');
    
  return hasMicrosoftEndpoints || hasTenantInfo || hasMicrosoftClaims || hasMicrosoftProperties;
}

/**
 * Checks for Google specific properties in the OIDC configuration
 */
function hasGoogleMarkers(config: OidcConfiguration): boolean {
  // Google has specific endpoints
  const hasGoogleEndpoints = 
    (config.issuer === 'https://accounts.google.com') ||
    (config.token_endpoint?.includes('oauth2/v4/token') || false);
  
  // Google specific properties
  const hasGoogleProperties = 
    !!config.code_challenge_methods_supported &&
    config.code_challenge_methods_supported.includes('S256');
    
  return hasGoogleEndpoints || hasGoogleProperties;
}

/**
 * Checks for AWS Cognito specific properties in the OIDC configuration
 */
function hasCognitoMarkers(config: OidcConfiguration): boolean {
  // Cognito has specific endpoints
  const hasCognitoEndpoints = 
    (config.issuer && config.issuer.includes('cognito-idp') && isUrlFromDomain(config.issuer, 'amazonaws.com'));
  
  // Cognito includes specific claims
  const hasCognitoClaims = 
    config.claims_supported?.includes('cognito:username') ||
    config.claims_supported?.includes('cognito:groups');
    
  return !!(hasCognitoEndpoints || hasCognitoClaims);
}

/**
 * Checks for Keycloak specific properties in the OIDC configuration
 */
function hasKeycloakMarkers(config: OidcConfiguration): boolean {
  // Keycloak has specific endpoints and patterns
  const hasKeycloakEndpoints = 
    (config.token_endpoint?.includes('/realms/') || false) ||
    (config.authorization_endpoint?.includes('/auth') || false);
  
  // Keycloak specific properties
  const hasKeycloakProperties = 
    !!config.resource_registration_endpoint ||
    (config.backchannel_authentication_endpoint?.includes('/realms/') || false);
  
  // Check for Keycloak version info
  const hasKeycloakVersionInfo = !!config.keycloak_version;
    
  return hasKeycloakEndpoints || hasKeycloakProperties || hasKeycloakVersionInfo;
}

/**
 * Checks for ForgeRock specific properties in the OIDC configuration
 */
function hasForgeRockMarkers(config: OidcConfiguration): boolean {
  // ForgeRock has specific endpoints
  let hasForgeRockEndpoints = false;
  
  if (config.issuer) {
    hasForgeRockEndpoints = isUrlFromDomain(config.issuer, 'forgerock.com') || 
                            isUrlFromDomain(config.issuer, 'forgerock.io');
  }
  
  hasForgeRockEndpoints = hasForgeRockEndpoints || 
    (config.token_endpoint?.includes('/oauth2/access_token') || false);
  
  // ForgeRock specific properties
  const hasForgeRockProperties = 
    !!config.userinfo_signing_alg_values_supported &&
    !!config.claims_parameter_supported;
  
  // Check for ForgeRock-specific scopes
  const hasForgeRockScopes = 
    config.scopes_supported?.includes('fr:idm:*') ||
    config.scopes_supported?.includes('am-introspect');
    
  return !!(hasForgeRockEndpoints || hasForgeRockProperties || hasForgeRockScopes);
}

/**
 * Checks for IdentityServer specific properties in the OIDC configuration
 */
function hasIdentityServerMarkers(config: OidcConfiguration): boolean {
  // IdentityServer has specific endpoints and patterns
  const isDuende = !!config.frontchannel_logout_session_supported;
  
  // Common IdentityServer properties
  const hasIdentityServerProperties = 
    config.scopes_supported?.includes('offline_access') &&
    config.grant_types_supported?.includes('authorization_code') &&
    config.response_types_supported?.includes('code id_token');
  
  // Check for version information to differentiate between Duende and older IdentityServer
  return !!(hasIdentityServerProperties && isDuende);
}
