export interface DecodedJWT {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  raw: {
    header: string
    payload: string
    signature: string
  }
}

/**
 * Decodes a base64url encoded string to a regular string
 */
export function base64UrlDecode(str: string): string {
  // Replace URL-safe characters with base64 standard characters
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')

  // Add padding if necessary
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)

  return atob(base64 + padding)
}

/**
 * Decodes a JWT token into its components
 * @param token The JWT token to decode
 * @returns The decoded JWT components or null if invalid
 */
export function decodeJWT(token: string): DecodedJWT | null {
  try {
    // Check if token is valid format
    if (!token || typeof token !== 'string') {
      return null
    }

    // Split the token into its three parts
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [encodedHeader, encodedPayload, signature] = parts

    // Decode header
    const decodedHeader = base64UrlDecode(encodedHeader)
    const header = JSON.parse(decodedHeader)

    // Decode payload
    const decodedPayload = base64UrlDecode(encodedPayload)
    const payload = JSON.parse(decodedPayload)

    return {
      header,
      payload,
      signature,
      raw: {
        header: encodedHeader,
        payload: encodedPayload,
        signature,
      },
    }
  } catch {
    // Return null for any decoding errors
    return null
  }
}

/**
 * Decodes only the payload portion of a JWT
 * @param token The JWT token to decode
 * @returns The decoded payload or null if invalid
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const decoded = decodeJWT(token)
  return decoded?.payload || null
}

/**
 * Decodes only the header portion of a JWT
 * @param token The JWT token to decode
 * @returns The decoded header or null if invalid
 */
export function decodeJwtHeader(token: string): Record<string, unknown> | null {
  const decoded = decodeJWT(token)
  return decoded?.header || null
}

/**
 * Checks if a JWT token is expired
 * @param token The JWT token to check
 * @returns true if the token is expired, false otherwise
 */
export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') {
    return false // If no exp claim, assume not expired
  }

  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

/**
 * Gets the expiration date of a JWT token
 * @param token The JWT token to check
 * @returns The expiration date or null if no exp claim
 */
export function getJwtExpiration(token: string): Date | null {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') {
    return null
  }

  return new Date(payload.exp * 1000)
}
