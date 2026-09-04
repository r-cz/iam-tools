import type { TokenResponse } from './types'

export class OAuthTokenResponseError extends Error {
  constructor(
    message: string,
    readonly code = 'invalid_token_response'
  ) {
    super(message)
    this.name = 'OAuthTokenResponseError'
  }
}

/** Validate both HTTP status and the OAuth response before presenting usable tokens. */
export async function readTokenResponse(response: Response): Promise<TokenResponse> {
  const httpFailure = `Token endpoint returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new OAuthTokenResponseError(
      response.ok ? 'Token endpoint did not return valid JSON' : httpFailure
    )
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new OAuthTokenResponseError(
      response.ok ? 'Token response must be a JSON object' : httpFailure
    )
  }
  const data = value as Record<string, unknown>
  if (typeof data.error === 'string' && data.error) {
    throw new OAuthTokenResponseError(
      typeof data.error_description === 'string' && data.error_description
        ? data.error_description
        : data.error,
      data.error
    )
  }
  if (!response.ok) throw new OAuthTokenResponseError(httpFailure, 'http_error')

  for (const name of ['access_token', 'token_type'] as const) {
    if (typeof data[name] !== 'string' || !data[name].trim()) {
      throw new OAuthTokenResponseError(`Token response is missing a valid ${name}`)
    }
  }
  for (const name of ['refresh_token', 'id_token', 'scope'] as const) {
    if (data[name] !== undefined && typeof data[name] !== 'string') {
      throw new OAuthTokenResponseError(`Token response ${name} must be a string`)
    }
  }
  if (
    data.expires_in !== undefined &&
    (typeof data.expires_in !== 'number' ||
      !Number.isFinite(data.expires_in) ||
      data.expires_in < 0)
  ) {
    throw new OAuthTokenResponseError('Token response expires_in must be a non-negative number')
  }
  return data as unknown as TokenResponse
}
