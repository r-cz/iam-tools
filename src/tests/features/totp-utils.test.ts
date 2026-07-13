import { describe, expect, it } from 'bun:test'
import {
  buildOtpauthUri,
  decodeBase32,
  encodeBase32,
  generateBase32Secret,
  generateTotp,
  normalizeBase32,
  parseOtpauthUri,
  verifyTotp,
  type TotpAlgorithm,
} from '@/features/totp/utils'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

describe('Base32 utilities', () => {
  it('encodes and decodes the RFC 4648 foobar example', () => {
    const encoded = encodeBase32(encoder.encode('foobar'))

    expect(encoded).toBe('MZXW6YTBOI')
    expect(decoder.decode(decodeBase32(encoded))).toBe('foobar')
    expect(decoder.decode(decodeBase32('MZXW6YTBOI======'))).toBe('foobar')
  })

  it('normalizes lowercase, whitespace, and valid padding', () => {
    expect(normalizeBase32(' mzxw6ytb oi======\n')).toBe('MZXW6YTBOI')
  })

  it('round-trips arbitrary byte values', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, index) => index)
    expect(decodeBase32(encodeBase32(bytes))).toEqual(bytes)
  })

  it.each([
    ['', 'required'],
    ['MZXW6Y!B', 'invalid characters'],
    ['MZXW6YTB=', 'invalid padding'],
    ['M=ZXW6YTB', 'padding'],
    ['M', 'invalid length'],
    ['MZ', 'trailing bits'],
  ])('rejects malformed Base32 input %p', (input, message) => {
    expect(() => normalizeBase32(input)).toThrow(message)
    expect(() => decodeBase32(input)).toThrow(message)
  })

  it('rejects non-byte-array encode input at runtime', () => {
    expect(() => encodeBase32('not bytes' as unknown as Uint8Array)).toThrow('Uint8Array')
  })
})

describe('otpauth URI utilities', () => {
  const secret = 'JBSWY3DPEHPK3PXP'

  it('parses a complete, percent-encoded TOTP URI', () => {
    const parsed = parseOtpauthUri(
      'otpauth://totp/Example%20Co:alice%40example.com?secret=jbsw%20y3dp%20ehpk%203pxp&issuer=Example%20Co&algorithm=sha-256&digits=8&period=45'
    )

    expect(parsed).toEqual({
      type: 'totp',
      accountName: 'alice@example.com',
      issuer: 'Example Co',
      secret,
      algorithm: 'SHA256',
      digits: 8,
      period: 45,
    })
  })

  it('applies interoperable defaults when optional parameters are absent', () => {
    expect(parseOtpauthUri(`otpauth://totp/alice?secret=${secret}`)).toEqual({
      type: 'totp',
      accountName: 'alice',
      secret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    })
  })

  it('builds a deterministic URI that round-trips Unicode labels', () => {
    const uri = buildOtpauthUri({
      accountName: 'álïce@example.com',
      issuer: 'Example & Co',
      secret: secret.toLowerCase(),
      algorithm: 'SHA512',
      digits: 8,
      period: 60,
    })

    expect(uri).toBe(
      'otpauth://totp/Example%20%26%20Co:%C3%A1l%C3%AFce%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example%20%26%20Co&algorithm=SHA512&digits=8&period=60'
    )
    expect(parseOtpauthUri(uri)).toEqual({
      type: 'totp',
      accountName: 'álïce@example.com',
      issuer: 'Example & Co',
      secret,
      algorithm: 'SHA512',
      digits: 8,
      period: 60,
    })
  })

  it.each([
    ['https://totp/alice?secret=JBSWY3DPEHPK3PXP', 'otpauth scheme'],
    ['otpauth://hotp/alice?secret=JBSWY3DPEHPK3PXP', 'Only otpauth TOTP'],
    ['otpauth://totp/?secret=JBSWY3DPEHPK3PXP', 'account name'],
    ['otpauth://totp/alice', 'secret is required'],
    ['otpauth://totp/alice?secret=INVALID1', 'invalid characters'],
    ['otpauth://totp/Issuer:alice?secret=JBSWY3DPEHPK3PXP&issuer=Other', 'must match'],
    ['otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&secret=JBSWY3DPEHPK3PXP', 'duplicate secret'],
    ['otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&algorithm=MD5', 'algorithm'],
    ['otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&digits=0', 'positive integer'],
    ['otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&period=abc', 'positive integer'],
  ])('rejects malformed or unsupported URI %p', (uri, message) => {
    expect(() => parseOtpauthUri(uri)).toThrow(message)
  })

  it('rejects invalid builder values', () => {
    expect(() => buildOtpauthUri({ accountName: '', secret })).toThrow('account name')
    expect(() => buildOtpauthUri({ accountName: 'alice', secret, digits: 11 })).toThrow('digits')
    expect(() => buildOtpauthUri({ accountName: 'alice', secret, period: 0 })).toThrow('period')
  })
})

describe('RFC 6238 TOTP', () => {
  const secrets: Record<TotpAlgorithm, string> = {
    SHA1: encodeBase32(encoder.encode('12345678901234567890')),
    SHA256: encodeBase32(encoder.encode('12345678901234567890123456789012')),
    SHA512: encodeBase32(
      encoder.encode('1234567890123456789012345678901234567890123456789012345678901234')
    ),
  }

  const vectors: Array<{
    timestamp: number
    expected: Record<TotpAlgorithm, string>
  }> = [
    {
      timestamp: 59,
      expected: { SHA1: '94287082', SHA256: '46119246', SHA512: '90693936' },
    },
    {
      timestamp: 1_111_111_109,
      expected: { SHA1: '07081804', SHA256: '68084774', SHA512: '25091201' },
    },
    {
      timestamp: 1_111_111_111,
      expected: { SHA1: '14050471', SHA256: '67062674', SHA512: '99943326' },
    },
    {
      timestamp: 1_234_567_890,
      expected: { SHA1: '89005924', SHA256: '91819424', SHA512: '93441116' },
    },
    {
      timestamp: 2_000_000_000,
      expected: { SHA1: '69279037', SHA256: '90698825', SHA512: '38618901' },
    },
    {
      timestamp: 20_000_000_000,
      expected: { SHA1: '65353130', SHA256: '77737706', SHA512: '47863826' },
    },
  ]

  for (const vector of vectors) {
    for (const algorithm of ['SHA1', 'SHA256', 'SHA512'] as const) {
      it(`matches Appendix B ${algorithm} at Unix time ${vector.timestamp}`, async () => {
        const code = await generateTotp(secrets[algorithm], {
          timestamp: vector.timestamp,
          period: 30,
          digits: 8,
          algorithm,
        })

        expect(code).toBe(vector.expected[algorithm])
      })
    }
  }

  it('accepts Date and JavaScript millisecond timestamps', async () => {
    const secondsCode = await generateTotp(secrets.SHA1, {
      timestamp: 1_234_567_890,
      digits: 8,
    })
    const millisecondsCode = await generateTotp(secrets.SHA1, {
      timestamp: 1_234_567_890_000,
      digits: 8,
    })
    const dateCode = await generateTotp(secrets.SHA1, {
      timestamp: new Date(1_234_567_890_000),
      digits: 8,
    })

    expect(millisecondsCode).toBe(secondsCode)
    expect(dateCode).toBe(secondsCode)
  })

  it('supports custom period and digit counts', async () => {
    const sixDigits = await generateTotp(secrets.SHA1, {
      timestamp: 59,
      period: 60,
      digits: 6,
    })

    expect(sixDigits).toMatch(/^\d{6}$/)
  })

  it('rejects invalid options and secrets', async () => {
    await expect(generateTotp('', { timestamp: 59 })).rejects.toThrow('required')
    await expect(generateTotp(secrets.SHA1, { timestamp: -1 })).rejects.toThrow('timestamp')
    await expect(generateTotp(secrets.SHA1, { period: 0 })).rejects.toThrow('period')
    await expect(generateTotp(secrets.SHA1, { digits: 11 })).rejects.toThrow('digits')
    await expect(
      generateTotp(secrets.SHA1, { algorithm: 'MD5' as unknown as TotpAlgorithm })
    ).rejects.toThrow('algorithm')
  })
})

describe('TOTP verification', () => {
  const secret = encodeBase32(encoder.encode('12345678901234567890'))

  it('returns delta zero for the current time step', async () => {
    await expect(
      verifyTotp('94287082', secret, {
        timestamp: 59,
        digits: 8,
        algorithm: 'SHA1',
      })
    ).resolves.toEqual({ valid: true, delta: 0 })
  })

  it('finds previous and future codes within the configured drift window', async () => {
    const priorCode = await generateTotp(secret, { timestamp: 29, digits: 8 })
    const futureCode = await generateTotp(secret, { timestamp: 89, digits: 8 })

    await expect(
      verifyTotp(priorCode, secret, { timestamp: 59, digits: 8, window: 1 })
    ).resolves.toEqual({ valid: true, delta: -1 })
    await expect(
      verifyTotp(futureCode, secret, { timestamp: 59, digits: 8, driftWindow: 1 })
    ).resolves.toEqual({ valid: true, delta: 1 })
  })

  it('rejects codes outside the window or with the wrong shape', async () => {
    const futureCode = await generateTotp(secret, { timestamp: 89, digits: 8 })

    await expect(
      verifyTotp(futureCode, secret, { timestamp: 59, digits: 8, window: 0 })
    ).resolves.toEqual({ valid: false, delta: null })
    await expect(
      verifyTotp('not-a-code', secret, { timestamp: 59, digits: 8, window: 1 })
    ).resolves.toEqual({ valid: false, delta: null })
  })

  it('validates drift-window options', async () => {
    await expect(
      verifyTotp('94287082', secret, { timestamp: 59, digits: 8, window: -1 })
    ).rejects.toThrow('drift window')
    await expect(
      verifyTotp('94287082', secret, {
        timestamp: 59,
        digits: 8,
        window: 1,
        driftWindow: 2,
      })
    ).rejects.toThrow('must match')
  })
})

describe('random Base32 secret generation', () => {
  it('uses the requested entropy length and produces valid Base32', () => {
    const secret = generateBase32Secret(20)

    expect(secret).toMatch(/^[A-Z2-7]+$/)
    expect(secret).toHaveLength(32)
    expect(decodeBase32(secret)).toHaveLength(20)
  })

  it('produces distinct values', () => {
    expect(generateBase32Secret()).not.toBe(generateBase32Secret())
  })

  it('rejects invalid entropy lengths', () => {
    expect(() => generateBase32Secret(0)).toThrow('byte length')
    expect(() => generateBase32Secret(65_537)).toThrow('byte length')
  })
})
