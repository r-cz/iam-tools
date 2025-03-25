import { proxyFetch } from "@/lib/proxy-fetch";
import { OidcConfiguration, Jwks } from "./types";

/**
 * Fetches the OpenID Connect configuration from a provider
 * @param issuerUrl The base URL of the identity provider
 * @returns The OIDC configuration
 */
export async function fetchOidcConfig(issuerUrl: string): Promise<OidcConfiguration> {
  try {
    // Normalize issuer URL
    const normalizedIssuerUrl = issuerUrl.endsWith("/") 
      ? issuerUrl 
      : `${issuerUrl}/`;
      
    // Construct the configuration URL
    const configUrl = `${normalizedIssuerUrl}.well-known/openid-configuration`;
    console.log(`Fetching OpenID configuration from: ${configUrl}`);
    
    // Fetch the configuration
    const response = await proxyFetch(configUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenID configuration: ${response.status} ${response.statusText}`);
    }
    
    // Parse the configuration
    const config = await response.json();
    
    // Validate required fields
    if (!config.issuer) {
      throw new Error('Invalid OIDC configuration: missing required "issuer" field');
    }
    
    return config;
  } catch (error: any) {
    console.error("Error fetching OIDC configuration:", error);
    
    // Enhance error messages for common issues
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      throw new Error(`CORS error: Could not fetch configuration from ${issuerUrl}. The server may not allow direct browser access.`);
    }
    
    throw error;
  }
}

/**
 * Fetches the JWKS from the provider
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
 * Detects the identity provider from the issuer URL
 * @param issuerUrl The issuer URL
 * @returns The provider name or null if unknown
 */
export function detectProvider(issuerUrl: string): string | null {
  if (!issuerUrl) return null;
  
  const url = issuerUrl.toLowerCase();
  
  if (url.includes('auth0.com')) {
    return 'Auth0';
  } else if (url.includes('okta.com')) {
    return 'Okta';
  } else if (url.includes('login.microsoftonline.com')) {
    return 'Microsoft Entra ID (Azure AD)';
  } else if (url.includes('accounts.google.com')) {
    return 'Google';
  } else if (url.includes('cognito-idp') && url.includes('amazonaws.com')) {
    return 'AWS Cognito';
  } else if (url.includes('login.salesforce.com')) {
    return 'Salesforce';
  } else if (url.includes('pingidentity.com') || url.includes('ping-eng.com')) {
    return 'Ping Identity';
  } else if (url.includes('onelogin.com')) {
    return 'OneLogin';
  } else if (url.includes('keycloak')) {
    return 'Keycloak';
  } else if (url.includes('forgerock.io') || url.includes('forgerock.com')) {
    return 'ForgeRock';
  } else if (url.includes('duendesoftware.com')) {
    return 'Duende IdentityServer';
  } else if (url.includes('identityserver')) {
    return 'IdentityServer';
  }
  
  return null;
}
