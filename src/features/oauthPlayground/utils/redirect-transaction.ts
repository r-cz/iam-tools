import type { OAuthConfig, PkceParams } from './types'

export const OAUTH_PLAYGROUND_REDIRECT_STATE_KEY = 'oauth_playground_redirect_state_v2'
const LEGACY_REDIRECT_STATE_KEY = 'oauth_playground_redirect_state'
export const OAUTH_REDIRECT_TRANSACTION_TTL_MS = 10 * 60 * 1000
export const OAUTH_AUTH_CODE_FLOW_PATH = '/oauth-playground/auth-code-pkce'

export interface OAuthRedirectTransaction {
  version: 2
  config: Omit<OAuthConfig, 'clientSecret'>
  pkce: PkceParams
  flowPath: typeof OAUTH_AUTH_CODE_FLOW_PATH
  callbackOrigin: string
  createdAt: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function decodeOAuthRedirectTransaction(value: unknown): OAuthRedirectTransaction | null {
  if (!isRecord(value) || value.version !== 2 || !isRecord(value.config) || !isRecord(value.pkce)) {
    return null
  }
  const config = value.config
  const pkce = value.pkce
  if (
    value.flowPath !== OAUTH_AUTH_CODE_FLOW_PATH ||
    typeof value.callbackOrigin !== 'string' ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt) ||
    typeof config.clientId !== 'string' ||
    typeof config.redirectUri !== 'string' ||
    !Array.isArray(config.scopes) ||
    !config.scopes.every((scope) => typeof scope === 'string') ||
    typeof pkce.codeVerifier !== 'string' ||
    !pkce.codeVerifier ||
    typeof pkce.codeChallenge !== 'string' ||
    !pkce.codeChallenge ||
    typeof pkce.state !== 'string' ||
    !pkce.state
  )
    return null
  try {
    if (new URL(config.redirectUri).origin !== value.callbackOrigin) return null
  } catch {
    return null
  }
  for (const field of [
    'issuerUrl',
    'authEndpoint',
    'tokenEndpoint',
    'jwksEndpoint',
    'clientId',
  ] as const) {
    if (config[field] !== undefined && typeof config[field] !== 'string') return null
  }
  return value as unknown as OAuthRedirectTransaction
}

export function createOAuthRedirectTransaction(
  config: OAuthConfig,
  pkce: PkceParams,
  now = Date.now()
): OAuthRedirectTransaction {
  const { clientSecret: _secret, ...safeConfig } = config
  return {
    version: 2,
    config: safeConfig,
    pkce,
    flowPath: OAUTH_AUTH_CODE_FLOW_PATH,
    callbackOrigin: new URL(config.redirectUri).origin,
    createdAt: now,
  }
}

export function storeOAuthRedirectTransaction(transaction: OAuthRedirectTransaction): void {
  sessionStorage.removeItem(LEGACY_REDIRECT_STATE_KEY)
  sessionStorage.setItem(OAUTH_PLAYGROUND_REDIRECT_STATE_KEY, JSON.stringify(transaction))
}

export function readOAuthRedirectTransaction(): OAuthRedirectTransaction | null {
  try {
    const serialized = sessionStorage.getItem(OAUTH_PLAYGROUND_REDIRECT_STATE_KEY)
    return serialized ? decodeOAuthRedirectTransaction(JSON.parse(serialized)) : null
  } catch {
    return null
  }
}

export function validateOAuthRedirectCallback(
  transaction: OAuthRedirectTransaction | null,
  callback: { state: string | null; origin: string; now?: number }
): transaction is OAuthRedirectTransaction {
  const now = callback.now ?? Date.now()
  return (
    !!transaction &&
    callback.origin === transaction.callbackOrigin &&
    callback.state === transaction.pkce.state &&
    now >= transaction.createdAt &&
    now - transaction.createdAt <= OAUTH_REDIRECT_TRANSACTION_TTL_MS
  )
}

export function consumeOAuthRedirectTransaction(callback: {
  state: string | null
  origin: string
  now?: number
}): OAuthRedirectTransaction | null {
  const transaction = readOAuthRedirectTransaction()
  sessionStorage.removeItem(OAUTH_PLAYGROUND_REDIRECT_STATE_KEY)
  sessionStorage.removeItem(LEGACY_REDIRECT_STATE_KEY)
  return validateOAuthRedirectCallback(transaction, callback) ? transaction : null
}
