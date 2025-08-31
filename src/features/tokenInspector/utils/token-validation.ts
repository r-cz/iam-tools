import { ValidationResult, TokenType } from './types'
import { getClaimDescription } from '../data/claim-descriptions'

export function determineTokenType(header: any, payload: any): TokenType {
  // Check for RFC9068 OAuth JWT Access Token
  if (header.typ === 'at+jwt' || header.typ === 'application/at+jwt') {
    return 'access_token'
  }

  // ID Token detection (comprehensive checks)
  if (
    payload.nonce ||
    payload.at_hash ||
    payload.c_hash ||
    payload.sid || // Session ID is common in ID tokens
    (header.typ === 'JWT' && payload.auth_time)
  ) {
    // auth_time is typically in ID tokens
    return 'id_token'
  }

  // Access Token detection
  if (
    payload.scope ||
    payload.scp ||
    (payload.azp && !payload.nonce) ||
    payload.client_id ||
    (header.typ === 'JWT' &&
      (payload.authorities || payload.roles || payload.permissions || payload.entitlements))
  ) {
    return 'access_token'
  }

  // If we have the required claims for both, but no specific markers, let's check for scope
  if (payload.iss && payload.sub && payload.aud && payload.exp && payload.iat) {
    if (payload.scope || payload.scp) {
      return 'access_token'
    }
    // If it has all the required claims but doesn't have scope, treat as ID token
    return 'id_token'
  }

  return 'unknown'
}

export function validateToken(header: any, payload: any, tokenType: TokenType): ValidationResult[] {
  const results: ValidationResult[] = []

  // Validate header for all token types
  validateHeader(header, results, tokenType)

  // Validate payload based on token type
  if (tokenType === 'id_token') {
    validateIdToken(payload, results)
  } else if (tokenType === 'access_token') {
    validateAccessToken(payload, results)
  }

  // Common validations for all token types
  validateCommonClaims(payload, results)

  return results
}

function validateHeader(header: any, results: ValidationResult[], tokenType: TokenType) {
  // Check alg
  if (!header.alg) {
    results.push({
      claim: 'header.alg',
      valid: false,
      message: 'Algorithm (alg) is missing from header',
      severity: 'error',
    })
  } else if (header.alg === 'none') {
    results.push({
      claim: 'header.alg',
      valid: false,
      message: "Algorithm 'none' is not secure",
      severity: 'error',
    })
  } else if (header.alg === 'HS256') {
    results.push({
      claim: 'header.alg',
      valid: true,
      message: 'HMAC with SHA-256',
      severity: 'info',
    })
  } else if (['RS256', 'RS384', 'RS512'].includes(header.alg)) {
    results.push({
      claim: 'header.alg',
      valid: true,
      message: `RSA with SHA-${header.alg.substring(2)}`,
      severity: 'info',
    })
  } else if (['ES256', 'ES384', 'ES512'].includes(header.alg)) {
    results.push({
      claim: 'header.alg',
      valid: true,
      message: `ECDSA with SHA-${header.alg.substring(2)}`,
      severity: 'info',
    })
  }

  // Check typ
  if (!header.typ) {
    results.push({
      claim: 'header.typ',
      valid: false,
      message: 'Type (typ) is missing from header',
      severity: 'warning',
    })
  } else if (tokenType === 'access_token' && header.typ === 'at+jwt') {
    results.push({
      claim: 'header.typ',
      valid: true,
      message: 'Token type correctly set to at+jwt as per RFC 9068',
      severity: 'info',
    })
  } else if (tokenType === 'access_token' && header.typ === 'application/at+jwt') {
    results.push({
      claim: 'header.typ',
      valid: true,
      message: 'Token type correctly set to application/at+jwt as per RFC 9068',
      severity: 'info',
    })
  } else if (tokenType === 'id_token' && header.typ !== 'JWT') {
    results.push({
      claim: 'header.typ',
      valid: false,
      message: `Unexpected token type for ID Token: ${header.typ}`,
      severity: 'warning',
    })
  } else if (
    tokenType === 'access_token' &&
    !['at+jwt', 'application/at+jwt', 'JWT'].includes(header.typ)
  ) {
    results.push({
      claim: 'header.typ',
      valid: false,
      message: `Unexpected token type for Access Token: ${header.typ}`,
      severity: 'warning',
      details: "RFC 9068 recommends using 'at+jwt' or 'application/at+jwt' for JWT access tokens",
    })
  } else {
    results.push({
      claim: 'header.typ',
      valid: true,
      message: `Token type is ${header.typ}`,
      severity: 'info',
    })
  }

  // Check kid
  if (!header.kid) {
    results.push({
      claim: 'header.kid',
      valid: false,
      message: 'Key ID (kid) is missing from header',
      severity: 'warning',
      details: "The 'kid' claim helps identify which key to use for validation",
    })
  } else {
    results.push({
      claim: 'header.kid',
      valid: true,
      message: 'Key ID is present',
      severity: 'info',
    })
  }
}

function validateIdToken(payload: any, results: ValidationResult[]) {
  // Required claims for ID Tokens
  const requiredClaims = ['iss', 'sub', 'aud', 'exp', 'iat']

  for (const claim of requiredClaims) {
    if (!payload[claim]) {
      results.push({
        claim,
        valid: false,
        message: `Required claim '${claim}' is missing`,
        severity: 'error',
        details: getClaimDescription(claim)?.description,
      })
    }
  }

  // Check specific ID Token claims
  // nonce - not required but recommended
  if (!payload.nonce) {
    results.push({
      claim: 'nonce',
      valid: false,
      message: 'Nonce is missing - recommended for replay protection',
      severity: 'warning',
      details: "The 'nonce' claim helps prevent replay attacks",
    })
  }

  // at_hash - required if access token is issued
  if (payload.at_hash) {
    results.push({
      claim: 'at_hash',
      valid: true,
      message: 'Access Token hash is present',
      severity: 'info',
      details: 'This token was issued alongside an access token',
    })
  }

  // auth_time - required if max_age was requested
  if (!payload.auth_time) {
    results.push({
      claim: 'auth_time',
      valid: false,
      message: 'auth_time is missing - required if max_age was requested',
      severity: 'warning',
      details: "The 'auth_time' claim indicates when the user authenticated",
    })
  }
}

function validateAccessToken(payload: any, results: ValidationResult[]) {
  // Check for required claims in JWT Access Tokens per RFC 9068
  const requiredClaims = ['iss', 'exp', 'aud', 'sub', 'client_id', 'iat', 'jti']

  for (const claim of requiredClaims) {
    if (!payload[claim]) {
      let severity: 'error' | 'warning' = 'error'
      let details = ''

      // Adjust severity based on common practice
      if (claim === 'jti') {
        severity = 'warning'
        details = "RFC 9068 requires 'jti' but it's not universally implemented"
      } else if (claim === 'client_id') {
        severity = 'warning'
        details = "RFC 9068 requires 'client_id' but some implementations use 'azp' instead"
      }

      results.push({
        claim,
        valid: false,
        message: `Required claim '${claim}' for JWT Access Token is missing`,
        severity,
        details: getClaimDescription(claim)?.description + (details ? ` ${details}` : ''),
      })
    }
  }

  // Check for alternative to client_id
  if (!payload.client_id && payload.azp) {
    results.push({
      claim: 'azp',
      valid: true,
      message: "Using 'azp' instead of 'client_id'",
      severity: 'info',
      details: "While RFC 9068 specifies 'client_id', some implementations use 'azp' instead",
    })
  }

  // Check for scopes
  if (!payload.scope && !payload.scp) {
    results.push({
      claim: 'scope/scp',
      valid: false,
      message: 'No scope claim found in access token',
      severity: 'warning',
      details: 'Access tokens typically include scope or scp claim to indicate permissions',
    })
  } else {
    const scopeValue = payload.scope || payload.scp
    results.push({
      claim: payload.scope ? 'scope' : 'scp',
      valid: true,
      message: `Token includes ${typeof scopeValue === 'string' ? 'scope' : 'scopes'}`,
      severity: 'info',
    })
  }

  // Check for authorization claims from RFC 9068
  checkAuthorizationClaims(payload, results)
}

function checkAuthorizationClaims(payload: any, results: ValidationResult[]) {
  // Check for roles, groups, entitlements
  const authzClaims = ['roles', 'groups', 'entitlements']

  for (const claim of authzClaims) {
    if (payload[claim]) {
      if (Array.isArray(payload[claim])) {
        results.push({
          claim,
          valid: true,
          message: `Token includes ${claim} authorization claim`,
          severity: 'info',
          details: `This is a standard authorization claim as per RFC 9068`,
        })
      } else {
        results.push({
          claim,
          valid: false,
          message: `${claim} is present but not in the expected array format`,
          severity: 'warning',
          details: `RFC 9068 expects ${claim} to be an array of strings`,
        })
      }
    }
  }
}

function validateCommonClaims(payload: any, results: ValidationResult[]) {
  // Issuer should be a valid URL
  if (payload.iss) {
    try {
      new URL(payload.iss)
      results.push({
        claim: 'iss',
        valid: true,
        message: 'Issuer is a valid URL',
        severity: 'info',
      })
    } catch {
      results.push({
        claim: 'iss',
        valid: false,
        message: 'Issuer is not a valid URL',
        severity: 'warning',
      })
    }
  }

  // Check expiration
  if (payload.exp) {
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      results.push({
        claim: 'exp',
        valid: false,
        message: 'Token has expired',
        severity: 'error',
        details: `Expired at ${new Date(payload.exp * 1000).toLocaleString()}`,
      })
    } else {
      const expiresIn = payload.exp - now
      results.push({
        claim: 'exp',
        valid: true,
        message: `Token expires in ${formatTimespan(expiresIn)}`,
        severity: 'info',
        details: `Expires at ${new Date(payload.exp * 1000).toLocaleString()}`,
      })
    }
  }

  // Check issuance time
  if (payload.iat) {
    const now = Math.floor(Date.now() / 1000)
    const issueAge = now - payload.iat
    results.push({
      claim: 'iat',
      valid: true,
      message: `Token was issued ${formatTimespan(issueAge)} ago`,
      severity: 'info',
      details: `Issued at ${new Date(payload.iat * 1000).toLocaleString()}`,
    })

    // Warn if token is too old
    if (issueAge > 86400) {
      // More than a day old
      results.push({
        claim: 'iat',
        valid: false,
        message: 'Token is quite old',
        severity: 'warning',
        details: 'This token was issued more than 24 hours ago',
      })
    }
  }

  // Check for not-before time
  if (payload.nbf) {
    const now = Math.floor(Date.now() / 1000)
    if (payload.nbf > now) {
      results.push({
        claim: 'nbf',
        valid: false,
        message: 'Token is not yet valid',
        severity: 'error',
        details: `Valid from ${new Date(payload.nbf * 1000).toLocaleString()}`,
      })
    } else {
      results.push({
        claim: 'nbf',
        valid: true,
        message: 'Token is currently valid (nbf)',
        severity: 'info',
        details: `Valid from ${new Date(payload.nbf * 1000).toLocaleString()}`,
      })
    }
  }
}

// Helper function to format timespan in a human-readable way
function formatTimespan(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  } else {
    const days = Math.floor(seconds / 86400)
    return `${days} day${days !== 1 ? 's' : ''}`
  }
}
