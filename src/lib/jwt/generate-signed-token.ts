import { signToken } from './sign-token'

/**
 * Determines the host URL for the current environment.
 */
export function getIssuerBaseUrl(): string {
  const host = window.location.host
  const protocol = window.location.protocol

  if (host.includes('localhost') && host.includes('5173')) {
    return 'http://localhost:8788/api'
  }

  return `${protocol}//${host}/api`
}

/**
 * Creates a signed demo JWT token using the shared signing utility.
 */
export async function generateSignedToken(payload?: Record<string, unknown>): Promise<string> {
  const currentTime = Math.floor(Date.now() / 1000)
  const issuer = getIssuerBaseUrl()

  const defaultPayload = {
    sub: '1234567890',
    name: 'John Doe',
    email: 'john.doe@example.com',
    iat: currentTime,
    exp: currentTime + 3600,
    aud: 'example-client',
    iss: issuer,
    preferred_username: 'johndoe',
    groups: ['users', 'premium'],
    scope: 'openid profile email api:read',
    is_demo_token: true,
    ...payload,
  }

  if (import.meta?.env?.DEV) {
    console.log('Generating demo signed token')
  }

  return await signToken(defaultPayload)
}
