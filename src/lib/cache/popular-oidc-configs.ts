import { OidcConfiguration } from '@/features/oidcExplorer/utils/types';

interface PopularProvider {
  name: string;
  url: string;
  config: OidcConfiguration;
}

// Popular OIDC configurations for cache warming
// Note: These are based on real configurations but may need periodic updates
export const popularOidcConfigs: PopularProvider[] = [
  {
    name: 'Google',
    url: 'https://accounts.google.com',
    config: {
      issuer: 'https://accounts.google.com',
      authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_endpoint: 'https://oauth2.googleapis.com/token',
      userinfo_endpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
      jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
      registration_endpoint: 'https://developers.google.com/identity/protocols/oauth2',
      scopes_supported: ['openid', 'email', 'profile'],
      response_types_supported: ['code', 'token', 'id_token', 'code token', 'code id_token', 'token id_token', 'code token id_token', 'none'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      claims_supported: ['aud', 'email', 'email_verified', 'exp', 'family_name', 'given_name', 'iat', 'iss', 'locale', 'name', 'picture', 'sub'],
      code_challenge_methods_supported: ['plain', 'S256'],
    }
  },
  {
    name: 'Microsoft',
    url: 'https://login.microsoftonline.com/common',
    config: {
      issuer: 'https://login.microsoftonline.com/{tenantid}/v2.0',
      authorization_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      token_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
      jwks_uri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      response_types_supported: ['code', 'id_token', 'code id_token', 'id_token token'],
      subject_types_supported: ['pairwise'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'private_key_jwt', 'client_secret_basic'],
      claims_supported: ['sub', 'iss', 'cloud_instance_name', 'cloud_instance_host_name', 'cloud_graph_host_name', 'msgraph_host', 'aud', 'exp', 'iat', 'auth_time', 'acr', 'nonce', 'preferred_username', 'name', 'tid', 'ver', 'at_hash', 'c_hash', 'email'],
      code_challenge_methods_supported: ['plain', 'S256'],
    }
  },
  {
    name: 'Auth0 Demo',
    url: 'https://samples.auth0.com',
    config: {
      issuer: 'https://samples.auth0.com/',
      authorization_endpoint: 'https://samples.auth0.com/authorize',
      token_endpoint: 'https://samples.auth0.com/oauth/token',
      userinfo_endpoint: 'https://samples.auth0.com/userinfo',
      jwks_uri: 'https://samples.auth0.com/.well-known/jwks.json',
      scopes_supported: ['openid', 'profile', 'offline_access', 'name', 'given_name', 'family_name', 'nickname', 'email', 'email_verified', 'picture', 'created_at', 'identities', 'phone', 'address'],
      response_types_supported: ['code', 'token', 'id_token', 'code token', 'code id_token', 'token id_token', 'code token id_token'],
      code_challenge_methods_supported: ['S256', 'plain'],
      grant_types_supported: ['authorization_code', 'implicit', 'refresh_token', 'client_credentials'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['HS256', 'RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    }
  },
  {
    name: 'Okta Demo',
    url: 'https://demo.okta.com',
    config: {
      issuer: 'https://demo.okta.com',
      authorization_endpoint: 'https://demo.okta.com/oauth2/v1/authorize',
      token_endpoint: 'https://demo.okta.com/oauth2/v1/token',
      userinfo_endpoint: 'https://demo.okta.com/oauth2/v1/userinfo',
      jwks_uri: 'https://demo.okta.com/oauth2/v1/keys',
      registration_endpoint: 'https://demo.okta.com/oauth2/v1/clients',
      scopes_supported: ['openid', 'email', 'profile', 'address', 'phone', 'offline_access', 'groups'],
      response_types_supported: ['code', 'token', 'id_token', 'code id_token', 'code token', 'id_token token', 'code id_token token'],
      grant_types_supported: ['authorization_code', 'implicit', 'refresh_token', 'password'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'client_secret_jwt', 'none'],
      claims_supported: ['iss', 'ver', 'sub', 'aud', 'iat', 'exp', 'jti', 'auth_time', 'amr', 'idp', 'nonce', 'name', 'nickname', 'preferred_username', 'given_name', 'middle_name', 'family_name', 'email', 'email_verified', 'profile', 'zoneinfo', 'locale', 'address', 'phone_number', 'picture', 'website', 'gender', 'birthdate', 'updated_at', 'at_hash', 'c_hash'],
      code_challenge_methods_supported: ['S256'],
    }
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    config: {
      issuer: 'https://github.com',
      authorization_endpoint: 'https://github.com/login/oauth/authorize',
      token_endpoint: 'https://github.com/login/oauth/access_token',
      userinfo_endpoint: 'https://api.github.com/user',
      jwks_uri: 'https://github.com/.well-known/jwks',
      scopes_supported: ['user', 'user:email', 'user:follow', 'public_repo', 'repo', 'repo_deployment', 'repo:status', 'delete_repo', 'notifications', 'gist', 'read:repo_hook', 'write:repo_hook', 'admin:repo_hook', 'admin:org_hook', 'read:org', 'write:org', 'admin:org', 'read:public_key', 'write:public_key', 'admin:public_key'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    }
  },
  {
    name: 'AWS Cognito',
    url: 'https://cognito-idp.us-east-1.amazonaws.com',
    config: {
      issuer: 'https://cognito-idp.us-east-1.amazonaws.com/{userPoolId}',
      authorization_endpoint: 'https://auth.{region}.amazoncognito.com/oauth2/authorize',
      token_endpoint: 'https://auth.{region}.amazoncognito.com/oauth2/token',
      userinfo_endpoint: 'https://auth.{region}.amazoncognito.com/oauth2/userInfo',
      jwks_uri: 'https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json',
      scopes_supported: ['openid', 'email', 'phone', 'profile'],
      response_types_supported: ['code', 'token'],
      grant_types_supported: ['authorization_code', 'implicit', 'client_credentials'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      claims_supported: ['sub', 'name', 'given_name', 'family_name', 'middle_name', 'nickname', 'preferred_username', 'profile', 'picture', 'website', 'email', 'email_verified', 'gender', 'birthdate', 'zoneinfo', 'locale', 'phone_number', 'phone_number_verified', 'address', 'updated_at', 'cognito:username', 'cognito:groups'],
      code_challenge_methods_supported: ['S256'],
    }
  }
];

// Function to warm the cache with popular configurations
export async function warmOidcCache(cache: any): Promise<void> {
  const configs = popularOidcConfigs.map(provider => ({
    url: provider.url,
    config: provider.config
  }));
  
  await cache.warmCache(configs);
  console.log(`Warmed OIDC config cache with ${configs.length} popular providers`);
}