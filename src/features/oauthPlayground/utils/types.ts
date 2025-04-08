/**
 * OAuth flow types
 */
export enum OAuthFlowType {
  AUTH_CODE_PKCE = 'authorization_code_pkce',
  AUTH_CODE = 'authorization_code',
  CLIENT_CREDENTIALS = 'client_credentials',
  IMPLICIT = 'implicit',
  PASSWORD = 'password', // Legacy, not recommended
}

/**
 * OAuth configuration interface
 */
export interface OAuthConfig {
  // flowType: OAuthFlowType; // Removed as flow is determined by the page/route
  issuerUrl?: string;
  authEndpoint?: string;
  tokenEndpoint?: string;
  jwksEndpoint?: string;
  clientId: string;
  clientSecret?: string; // Only for confidential clients
  redirectUri: string;
  scopes: string[];
  demoMode?: boolean;
}

/**
 * PKCE parameters
 */
export interface PkceParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Authorization response
 */
export interface AuthorizationResponse {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * Token response
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * OAuth flow state
 */
export interface OAuthFlowState {
  config: OAuthConfig;
  pkce?: PkceParams;
  authResponse?: AuthorizationResponse;
  tokenResponse?: TokenResponse;
  step: 'config' | 'authorization' | 'token' | 'complete';
}
