import { decodeJWT, type DecodedJWT } from '@/lib/jwt/decode-token'

export type DifferenceKind = 'added' | 'removed' | 'changed' | 'unchanged'

export interface ClaimDifference {
  section: 'header' | 'payload'
  path: string
  kind: DifferenceKind
  left?: unknown
  right?: unknown
  addedValues?: string[]
  removedValues?: string[]
}

export interface TokenMetadata {
  issuer?: string
  subject?: string
  audiences: string[]
  scopes: string[]
  issuedAt?: number
  expiresAt?: number
  lifetimeSeconds?: number
}

export interface TokenComparisonResult {
  left: DecodedJWT
  right: DecodedJWT
  differences: ClaimDifference[]
  counts: Record<DifferenceKind, number>
  metadata: {
    left: TokenMetadata
    right: TokenMetadata
    issuedAtDeltaSeconds?: number
    expiresAtDeltaSeconds?: number
    lifetimeDeltaSeconds?: number
  }
}

export type TokenDecodeResult = { ok: true; decoded: DecodedJWT } | { ok: false; error: string }

const SET_LIKE_CLAIMS = new Set([
  'aud',
  'scope',
  'scp',
  'roles',
  'groups',
  'permissions',
  'entitlements',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue)
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    )
  }
  return value
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
}

function normalizeStringSet(value: unknown, splitWhitespace: boolean): string[] | null {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? splitWhitespace
        ? value.split(/\s+/)
        : [value]
      : null

  if (!values || values.some((entry) => typeof entry !== 'string')) {
    return null
  }

  return [...new Set(values.map((entry) => entry.trim()).filter(Boolean))].sort()
}

function compareSetLikeClaim(
  section: 'header' | 'payload',
  path: string,
  claimName: string,
  left: unknown,
  right: unknown
): ClaimDifference | null {
  if (section !== 'payload' || !SET_LIKE_CLAIMS.has(claimName)) {
    return null
  }

  const splitWhitespace = claimName === 'scope' || claimName === 'scp'
  const leftValues = normalizeStringSet(left, splitWhitespace)
  const rightValues = normalizeStringSet(right, splitWhitespace)
  if (!leftValues || !rightValues) {
    return null
  }

  const leftSet = new Set(leftValues)
  const rightSet = new Set(rightValues)
  const addedValues = rightValues.filter((value) => !leftSet.has(value))
  const removedValues = leftValues.filter((value) => !rightSet.has(value))

  return {
    section,
    path,
    kind: addedValues.length || removedValues.length ? 'changed' : 'unchanged',
    left: leftValues,
    right: rightValues,
    addedValues,
    removedValues,
  }
}

function compareRecords(
  section: 'header' | 'payload',
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  prefix = ''
): ClaimDifference[] {
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()
  const differences: ClaimDifference[] = []

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key
    const hasLeft = Object.prototype.hasOwnProperty.call(left, key)
    const hasRight = Object.prototype.hasOwnProperty.call(right, key)

    if (!hasLeft) {
      differences.push({ section, path, kind: 'added', right: right[key] })
      continue
    }
    if (!hasRight) {
      differences.push({ section, path, kind: 'removed', left: left[key] })
      continue
    }

    const leftValue = left[key]
    const rightValue = right[key]
    const setComparison = compareSetLikeClaim(section, path, key, leftValue, rightValue)
    if (setComparison) {
      differences.push(setComparison)
      continue
    }

    if (isRecord(leftValue) && isRecord(rightValue)) {
      differences.push(...compareRecords(section, leftValue, rightValue, path))
      continue
    }

    differences.push({
      section,
      path,
      kind: valuesEqual(leftValue, rightValue) ? 'unchanged' : 'changed',
      left: leftValue,
      right: rightValue,
    })
  }

  return differences
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function getMetadata(payload: Record<string, unknown>): TokenMetadata {
  const audiences = normalizeStringSet(payload.aud, false) ?? []
  const scopes = [
    ...(normalizeStringSet(payload.scope, true) ?? []),
    ...(normalizeStringSet(payload.scp, true) ?? []),
  ]
  const issuedAt = readNumber(payload.iat)
  const expiresAt = readNumber(payload.exp)

  return {
    issuer: readString(payload.iss),
    subject: readString(payload.sub),
    audiences,
    scopes: [...new Set(scopes)].sort(),
    issuedAt,
    expiresAt,
    lifetimeSeconds:
      issuedAt !== undefined && expiresAt !== undefined ? expiresAt - issuedAt : undefined,
  }
}

function subtractIfDefined(left?: number, right?: number): number | undefined {
  return left !== undefined && right !== undefined ? right - left : undefined
}

export function decodeTokenForComparison(token: string): TokenDecodeResult {
  if (!token.trim()) {
    return { ok: false, error: 'Enter a compact JWT with three dot-separated segments.' }
  }

  const decoded = decodeJWT(token.trim())
  if (!decoded) {
    return { ok: false, error: 'This value is not a decodable compact JWT.' }
  }

  if (!isRecord(decoded.header)) {
    return { ok: false, error: 'The JWT header must be a JSON object.' }
  }
  if (!isRecord(decoded.payload)) {
    return { ok: false, error: 'The JWT payload must be a JSON object.' }
  }

  return { ok: true, decoded }
}

export function compareTokens(leftToken: string, rightToken: string): TokenComparisonResult {
  const leftResult = decodeTokenForComparison(leftToken)
  const rightResult = decodeTokenForComparison(rightToken)
  if (!leftResult.ok || !rightResult.ok) {
    throw new Error('Both values must be decodable compact JWTs before they can be compared.')
  }

  const differences = [
    ...compareRecords('header', leftResult.decoded.header, rightResult.decoded.header),
    ...compareRecords('payload', leftResult.decoded.payload, rightResult.decoded.payload),
  ]
  const counts: Record<DifferenceKind, number> = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  }
  for (const difference of differences) {
    counts[difference.kind] += 1
  }

  const leftMetadata = getMetadata(leftResult.decoded.payload)
  const rightMetadata = getMetadata(rightResult.decoded.payload)

  return {
    left: leftResult.decoded,
    right: rightResult.decoded,
    differences,
    counts,
    metadata: {
      left: leftMetadata,
      right: rightMetadata,
      issuedAtDeltaSeconds: subtractIfDefined(leftMetadata.issuedAt, rightMetadata.issuedAt),
      expiresAtDeltaSeconds: subtractIfDefined(leftMetadata.expiresAt, rightMetadata.expiresAt),
      lifetimeDeltaSeconds: subtractIfDefined(
        leftMetadata.lifetimeSeconds,
        rightMetadata.lifetimeSeconds
      ),
    },
  }
}

function encodeJsonSegment(value: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function createExampleComparisonTokens(now = Math.floor(Date.now() / 1000)): {
  left: string
  right: string
} {
  const header = { alg: 'RS256', typ: 'JWT', kid: 'demo-key-2026-01' }
  const leftPayload = {
    iss: 'https://id.example.com',
    sub: 'user-2841',
    aud: ['orders-api'],
    scope: 'openid profile orders.read',
    roles: ['support-agent'],
    environment: 'staging',
    iat: now,
    exp: now + 3600,
  }
  const rightPayload = {
    iss: 'https://id.example.com',
    sub: 'user-2841',
    aud: ['orders-api', 'billing-api'],
    scope: 'openid profile orders.read billing.read',
    roles: ['support-agent', 'billing-viewer'],
    environment: 'production',
    authentication_method: 'webauthn',
    iat: now + 120,
    exp: now + 1920,
  }

  return {
    left: `${encodeJsonSegment(header)}.${encodeJsonSegment(leftPayload)}.example-signature-left`,
    right: `${encodeJsonSegment(header)}.${encodeJsonSegment(rightPayload)}.example-signature-right`,
  }
}
