const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const BASE32_VALUES = new Map(
  Array.from(BASE32_ALPHABET, (character, index) => [character, index] as const)
)

const DEFAULT_ALGORITHM = 'SHA1' as const
const DEFAULT_DIGITS = 6
const DEFAULT_PERIOD = 30
const DEFAULT_SECRET_BYTES = 20
const MAX_DRIFT_WINDOW = 100

export type TotpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512'
export type TotpSecret = string | Uint8Array

export interface TotpOptions {
  /**
   * Unix time in seconds. JavaScript millisecond timestamps such as Date.now()
   * and Date instances are also accepted for convenience.
   */
  timestamp?: number | Date
  /** Time-step duration in seconds. */
  period?: number
  /** Number of decimal digits in the generated code. */
  digits?: number
  algorithm?: TotpAlgorithm
}

export interface VerifyTotpOptions extends TotpOptions {
  /** Number of time steps to inspect on either side of the requested timestamp. */
  window?: number
  /** More descriptive alias for window. */
  driftWindow?: number
}

export interface TotpVerificationResult {
  valid: boolean
  /** Matching offset in time steps. Null when no code matched. */
  delta: number | null
}

export interface OtpauthTotpConfig {
  type: 'totp'
  accountName: string
  issuer?: string
  secret: string
  algorithm: TotpAlgorithm
  digits: number
  period: number
}

export interface BuildOtpauthUriOptions {
  accountName: string
  issuer?: string
  secret: string
  algorithm?: TotpAlgorithm
  digits?: number
  period?: number
}

interface ResolvedTotpOptions {
  timestampSeconds: number
  period: number
  digits: number
  algorithm: TotpAlgorithm
}

const BASE32_REMAINDER_PADDING: Readonly<Record<number, number>> = {
  0: 0,
  2: 6,
  4: 4,
  5: 3,
  7: 1,
}

const BASE32_REMAINDER_UNUSED_BITS: Readonly<Record<number, number>> = {
  0: 0,
  2: 2,
  4: 4,
  5: 1,
  7: 3,
}

/**
 * Normalizes an RFC 4648 Base32 value to uppercase, unpadded form.
 * ASCII/Unicode whitespace is ignored, while malformed padding, characters,
 * lengths, and non-zero trailing bits are rejected.
 */
export function normalizeBase32(value: string): string {
  if (typeof value !== 'string') {
    throw new TypeError('Base32 value must be a string')
  }

  const compact = value.replace(/\s/g, '').toUpperCase()
  if (!compact) {
    throw new Error('Base32 value is required')
  }

  const paddingStart = compact.indexOf('=')
  const unpadded = paddingStart === -1 ? compact : compact.slice(0, paddingStart)
  const padding = paddingStart === -1 ? '' : compact.slice(paddingStart)

  if (padding && !/^=+$/.test(padding)) {
    throw new Error('Base32 padding must appear only at the end')
  }

  if (!/^[A-Z2-7]+$/.test(unpadded)) {
    throw new Error('Base32 value contains invalid characters')
  }

  const remainder = unpadded.length % 8
  const expectedPadding = BASE32_REMAINDER_PADDING[remainder]
  if (expectedPadding === undefined) {
    throw new Error('Base32 value has an invalid length')
  }

  if (padding) {
    if (compact.length % 8 !== 0 || padding.length !== expectedPadding || expectedPadding === 0) {
      throw new Error('Base32 value has invalid padding')
    }
  }

  const unusedBits = BASE32_REMAINDER_UNUSED_BITS[remainder] ?? 0
  if (unusedBits > 0) {
    const finalValue = BASE32_VALUES.get(unpadded[unpadded.length - 1]!)
    if (finalValue === undefined || (finalValue & (2 ** unusedBits - 1)) !== 0) {
      throw new Error('Base32 value has non-zero trailing bits')
    }
  }

  return unpadded
}

/** Encodes bytes as uppercase, unpadded RFC 4648 Base32. */
export function encodeBase32(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('Base32 input must be a Uint8Array')
  }

  let accumulator = 0
  let availableBits = 0
  let encoded = ''

  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte
    availableBits += 8

    while (availableBits >= 5) {
      availableBits -= 5
      encoded += BASE32_ALPHABET[(accumulator >>> availableBits) & 0x1f]
      accumulator &= 2 ** availableBits - 1
    }
  }

  if (availableBits > 0) {
    encoded += BASE32_ALPHABET[(accumulator << (5 - availableBits)) & 0x1f]
  }

  return encoded
}

/** Decodes padded or unpadded RFC 4648 Base32 into bytes. */
export function decodeBase32(value: string): Uint8Array<ArrayBuffer> {
  const normalized = normalizeBase32(value)
  const outputLength = Math.floor((normalized.length * 5) / 8)
  const decoded = new Uint8Array(outputLength)

  let accumulator = 0
  let availableBits = 0
  let outputIndex = 0

  for (const character of normalized) {
    const characterValue = BASE32_VALUES.get(character)
    if (characterValue === undefined) {
      // normalizeBase32 already performs this check, but keep the decoder total.
      throw new Error('Base32 value contains invalid characters')
    }

    accumulator = (accumulator << 5) | characterValue
    availableBits += 5

    if (availableBits >= 8) {
      availableBits -= 8
      decoded[outputIndex] = (accumulator >>> availableBits) & 0xff
      outputIndex += 1
      accumulator &= 2 ** availableBits - 1
    }
  }

  return decoded
}

/** Parses a standard otpauth://totp URI without retaining the source URI. */
export function parseOtpauthUri(value: string): OtpauthTotpConfig {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('otpauth URI is required')
  }

  let uri: URL
  try {
    uri = new URL(value.trim())
  } catch {
    throw new Error('Invalid otpauth URI')
  }

  if (uri.protocol.toLowerCase() !== 'otpauth:') {
    throw new Error('URI must use the otpauth scheme')
  }
  if (uri.hostname.toLowerCase() !== 'totp') {
    throw new Error('Only otpauth TOTP URIs are supported')
  }
  if (uri.username || uri.password || uri.port || uri.hash) {
    throw new Error('otpauth URI contains unsupported authority or fragment data')
  }

  rejectDuplicateParameters(uri.searchParams, ['secret', 'issuer', 'algorithm', 'digits', 'period'])

  const rawLabel = uri.pathname.replace(/^\/+/, '')
  let label: string
  try {
    label = decodeURIComponent(rawLabel).trim()
  } catch {
    throw new Error('otpauth label is not valid percent-encoding')
  }
  if (!label) {
    throw new Error('otpauth account name is required')
  }

  const separatorIndex = label.indexOf(':')
  const labelIssuer = separatorIndex === -1 ? undefined : label.slice(0, separatorIndex).trim()
  const accountName = (separatorIndex === -1 ? label : label.slice(separatorIndex + 1)).trim()
  if (!accountName) {
    throw new Error('otpauth account name is required')
  }
  if (separatorIndex !== -1 && !labelIssuer) {
    throw new Error('otpauth label issuer cannot be empty')
  }

  const rawSecret = uri.searchParams.get('secret')
  if (!rawSecret) {
    throw new Error('otpauth secret is required')
  }
  const secret = normalizeBase32(rawSecret)

  const queryIssuer = normalizeOptionalLabel(uri.searchParams.get('issuer'), 'issuer')
  if (labelIssuer && queryIssuer && labelIssuer !== queryIssuer) {
    throw new Error('otpauth label issuer must match the issuer query parameter')
  }

  const algorithm = normalizeAlgorithm(uri.searchParams.get('algorithm') ?? DEFAULT_ALGORITHM)
  const digits = parsePositiveIntegerParameter(
    uri.searchParams.get('digits'),
    'digits',
    DEFAULT_DIGITS
  )
  validateDigits(digits)
  const period = parsePositiveIntegerParameter(
    uri.searchParams.get('period'),
    'period',
    DEFAULT_PERIOD
  )
  validatePeriod(period)

  return {
    type: 'totp',
    accountName,
    issuer: queryIssuer ?? labelIssuer,
    secret,
    algorithm,
    digits,
    period,
  }
}

/** Builds a deterministic otpauth://totp URI from validated inputs. */
export function buildOtpauthUri(options: BuildOtpauthUriOptions): string {
  if (!options || typeof options !== 'object') {
    throw new TypeError('otpauth options are required')
  }

  const accountName = normalizeRequiredLabel(options.accountName, 'account name')
  const issuer = normalizeOptionalLabel(options.issuer, 'issuer')
  const secret = normalizeBase32(options.secret)
  const algorithm = normalizeAlgorithm(options.algorithm ?? DEFAULT_ALGORITHM)
  const digits = options.digits ?? DEFAULT_DIGITS
  const period = options.period ?? DEFAULT_PERIOD
  validateDigits(digits)
  validatePeriod(period)

  const encodedAccount = encodeURIComponent(accountName)
  const label = issuer ? `${encodeURIComponent(issuer)}:${encodedAccount}` : encodedAccount
  const query = [
    `secret=${encodeURIComponent(secret)}`,
    ...(issuer ? [`issuer=${encodeURIComponent(issuer)}`] : []),
    `algorithm=${algorithm}`,
    `digits=${digits}`,
    `period=${period}`,
  ].join('&')

  return `otpauth://totp/${label}?${query}`
}

/** Generates a TOTP value using HMAC through the Web Crypto API. */
export async function generateTotp(secret: TotpSecret, options: TotpOptions = {}): Promise<string> {
  const secretBytes = resolveSecretBytes(secret)
  const resolved = resolveTotpOptions(options)
  const counter = Math.floor(resolved.timestampSeconds / resolved.period)
  const counterBytes = encodeCounter(counter)
  const cryptoApi = getCryptoApi()
  const hashName = toWebCryptoHash(resolved.algorithm)

  const key = await cryptoApi.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: hashName },
    false,
    ['sign']
  )
  const digest = new Uint8Array(await cryptoApi.subtle.sign('HMAC', key, counterBytes))
  const offset = digest[digest.length - 1]! & 0x0f
  const binaryCode =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff)
  const code = binaryCode % 10 ** resolved.digits

  return code.toString().padStart(resolved.digits, '0')
}

/**
 * Verifies a TOTP code across the configured drift window. Delta is measured
 * in time steps: -1 is the prior period, +1 is the next period.
 */
export async function verifyTotp(
  code: string,
  secret: TotpSecret,
  options: VerifyTotpOptions = {}
): Promise<TotpVerificationResult> {
  const resolved = resolveTotpOptions(options)
  const driftWindow = resolveDriftWindow(options)
  const normalizedCode = typeof code === 'string' ? code.trim() : ''

  if (!new RegExp(`^\\d{${resolved.digits}}$`).test(normalizedCode)) {
    return { valid: false, delta: null }
  }

  const deltas = buildDriftSearchOrder(driftWindow)
  for (const delta of deltas) {
    const candidate = await generateTotp(secret, {
      timestamp: resolved.timestampSeconds + delta * resolved.period,
      period: resolved.period,
      digits: resolved.digits,
      algorithm: resolved.algorithm,
    })

    if (constantTimeEqual(normalizedCode, candidate)) {
      return { valid: true, delta }
    }
  }

  return { valid: false, delta: null }
}

/** Generates a cryptographically random, unpadded Base32 secret. */
export function generateBase32Secret(byteLength = DEFAULT_SECRET_BYTES): string {
  if (!Number.isInteger(byteLength) || byteLength <= 0 || byteLength > 65_536) {
    throw new RangeError('Secret byte length must be an integer between 1 and 65536')
  }

  const cryptoApi = getCryptoApi()
  const bytes = new Uint8Array(byteLength)
  cryptoApi.getRandomValues(bytes)
  return encodeBase32(bytes)
}

function rejectDuplicateParameters(parameters: URLSearchParams, names: string[]): void {
  for (const name of names) {
    if (parameters.getAll(name).length > 1) {
      throw new Error(`otpauth URI contains duplicate ${name} parameters`)
    }
  }
}

function normalizeRequiredLabel(value: string, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`otpauth ${fieldName} must be a string`)
  }

  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`otpauth ${fieldName} is required`)
  }
  rejectControlCharacters(normalized, fieldName)
  return normalized
}

function normalizeOptionalLabel(
  value: string | null | undefined,
  fieldName: string
): string | undefined {
  if (value === null || value === undefined) return undefined
  const normalized = normalizeRequiredLabel(value, fieldName)
  return normalized
}

function rejectControlCharacters(value: string, fieldName: string): void {
  if (/\p{Cc}/u.test(value)) {
    throw new Error(`otpauth ${fieldName} cannot contain control characters`)
  }
}

function parsePositiveIntegerParameter(
  value: string | null,
  name: string,
  defaultValue: number
): number {
  if (value === null) return defaultValue
  if (!/^\d+$/.test(value)) {
    throw new Error(`otpauth ${name} must be a positive integer`)
  }

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`otpauth ${name} must be a positive integer`)
  }
  return parsed
}

function normalizeAlgorithm(value: string): TotpAlgorithm {
  const normalized = value.toUpperCase().replace(/-/g, '')
  if (normalized === 'SHA1' || normalized === 'SHA256' || normalized === 'SHA512') {
    return normalized
  }
  throw new Error('TOTP algorithm must be SHA1, SHA256, or SHA512')
}

function validateDigits(digits: number): void {
  if (!Number.isInteger(digits) || digits < 1 || digits > 10) {
    throw new RangeError('TOTP digits must be an integer between 1 and 10')
  }
}

function validatePeriod(period: number): void {
  if (!Number.isSafeInteger(period) || period <= 0) {
    throw new RangeError('TOTP period must be a positive integer number of seconds')
  }
}

function resolveTotpOptions(options: TotpOptions): ResolvedTotpOptions {
  const period = options.period ?? DEFAULT_PERIOD
  const digits = options.digits ?? DEFAULT_DIGITS
  const algorithm = normalizeAlgorithm(options.algorithm ?? DEFAULT_ALGORITHM)
  validatePeriod(period)
  validateDigits(digits)

  return {
    timestampSeconds: resolveTimestampSeconds(options.timestamp),
    period,
    digits,
    algorithm,
  }
}

function resolveTimestampSeconds(timestamp: number | Date | undefined): number {
  if (timestamp instanceof Date) {
    const milliseconds = timestamp.getTime()
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new RangeError('TOTP timestamp must be a valid non-negative date')
    }
    return milliseconds / 1000
  }

  const numericTimestamp = timestamp ?? Date.now()
  if (!Number.isFinite(numericTimestamp) || numericTimestamp < 0) {
    throw new RangeError('TOTP timestamp must be a finite non-negative number')
  }

  // RFC examples use Unix seconds, while browser callers commonly provide Date.now().
  return numericTimestamp >= 100_000_000_000 ? numericTimestamp / 1000 : numericTimestamp
}

function resolveDriftWindow(options: VerifyTotpOptions): number {
  if (
    options.window !== undefined &&
    options.driftWindow !== undefined &&
    options.window !== options.driftWindow
  ) {
    throw new Error('TOTP window and driftWindow options must match when both are provided')
  }

  const driftWindow = options.driftWindow ?? options.window ?? 0
  if (!Number.isInteger(driftWindow) || driftWindow < 0 || driftWindow > MAX_DRIFT_WINDOW) {
    throw new RangeError(`TOTP drift window must be an integer between 0 and ${MAX_DRIFT_WINDOW}`)
  }
  return driftWindow
}

function resolveSecretBytes(secret: TotpSecret): Uint8Array<ArrayBuffer> {
  const bytes = typeof secret === 'string' ? decodeBase32(secret) : secret
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('TOTP secret must be a Base32 string or Uint8Array')
  }
  if (bytes.length === 0) {
    throw new Error('TOTP secret is required')
  }
  // Copy caller-owned views so Web Crypto receives a concrete ArrayBuffer-backed
  // source rather than a view that could be backed by SharedArrayBuffer.
  return new Uint8Array(bytes)
}

function encodeCounter(counter: number): Uint8Array<ArrayBuffer> {
  if (!Number.isSafeInteger(counter) || counter < 0) {
    throw new RangeError('TOTP counter is outside the supported range')
  }

  let remaining = BigInt(counter)
  const encoded = new Uint8Array(8)
  for (let index = encoded.length - 1; index >= 0; index -= 1) {
    encoded[index] = Number(remaining & 0xffn)
    remaining >>= 8n
  }
  return encoded
}

function toWebCryptoHash(algorithm: TotpAlgorithm): 'SHA-1' | 'SHA-256' | 'SHA-512' {
  switch (algorithm) {
    case 'SHA1':
      return 'SHA-1'
    case 'SHA256':
      return 'SHA-256'
    case 'SHA512':
      return 'SHA-512'
  }
}

function getCryptoApi(): Crypto {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('Web Crypto API is unavailable')
  }
  return cryptoApi
}

function buildDriftSearchOrder(window: number): number[] {
  const deltas = [0]
  for (let offset = 1; offset <= window; offset += 1) {
    deltas.push(-offset, offset)
  }
  return deltas
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false

  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}
