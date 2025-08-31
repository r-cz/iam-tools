import { ProviderSpecificClaim } from '../utils/types'

const providerSpecificClaims: ProviderSpecificClaim[] = [
  // Microsoft Azure AD claims
  {
    name: 'tid',
    description: 'Tenant ID - Represents the Azure AD tenant that the user belongs to',
    provider: 'Microsoft Azure AD',
    example: '72f988bf-86f1-41af-91ab-2d7cd011db47',
  },
  {
    name: 'preferred_username',
    description: 'The username that the end user prefers to be referred to as',
    provider: 'Microsoft Azure AD',
    example: 'john.doe@example.com',
  },
  {
    name: 'roles',
    description: 'Array of app roles the user is assigned to',
    provider: 'Microsoft Azure AD',
    format: 'Array of strings',
    example: '["Admin", "User"]',
  },

  // Auth0 claims
  {
    name: 'https://example.com/roles',
    description: 'Custom namespace claim for roles',
    provider: 'Auth0',
    format: 'Array of strings',
    example: '["admin", "editor"]',
  },
  {
    name: 'https://example.com/permissions',
    description: 'Custom namespace claim for permissions',
    provider: 'Auth0',
    format: 'Array of strings',
    example: '["read:users", "write:users"]',
  },

  // Okta claims
  {
    name: 'ver',
    description: 'Version of the Okta ID token',
    provider: 'Okta',
    example: '1.0',
  },

  // PingFederate claims
  {
    name: 'pi.atm',
    description: 'Identifies the Access Token Manager used to issue the token',
    provider: 'PingFederate',
    example: 'exampleAppTokenManager',
  },
  {
    name: 'pi.sri',
    description: 'A session identifier that is unique to the user and the application',
    provider: 'PingFederate',
    example: 'abc123xyz456',
  },

  // Google claims
  {
    name: 'hd',
    description: 'G Suite domain - hosted domain parameter',
    provider: 'Google',
    example: 'example.com',
  },

  // AWS Cognito claims
  {
    name: 'cognito:username',
    description: "User's Cognito username",
    provider: 'AWS Cognito',
    example: 'johndoe',
  },
  {
    name: 'cognito:groups',
    description: 'Groups that the user belongs to',
    provider: 'AWS Cognito',
    format: 'Array of strings',
    example: '["admin", "standard-users"]',
  },
]

export function getProviderSpecificClaimInfo(claim: string): ProviderSpecificClaim | undefined {
  return providerSpecificClaims.find((c) => c.name === claim)
}

export function getAllProviderSpecificClaims(): ProviderSpecificClaim[] {
  return providerSpecificClaims
}
