import { describe, expect, test } from 'bun:test'

describe('Token Inspector', () => {
  // Test JWT parsing functionality
  test('should parse JWT components correctly', () => {
    // Sample JWT
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    // Split JWT into parts
    const parts = jwt.split('.')
    expect(parts.length).toBe(3)

    // Parse header
    const headerBase64 = parts[0]
    const headerJson = Buffer.from(headerBase64, 'base64').toString()
    const header = JSON.parse(headerJson)

    // Check header values
    expect(header.alg).toBe('HS256')
    expect(header.typ).toBe('JWT')

    // Parse payload
    const payloadBase64 = parts[1]
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString()
    const payload = JSON.parse(payloadJson)

    // Check payload values
    expect(payload.sub).toBe('1234567890')
    expect(payload.name).toBe('John Doe')
    expect(payload.iat).toBe(1516239022)
  })

  // Test token validation
  test('should validate token format', () => {
    // Valid token format (3 parts separated by dots)
    const validToken = 'part1.part2.part3'
    expect(validToken.split('.').length).toBe(3)

    // Invalid token format
    const invalidToken = 'invalid-token'
    expect(invalidToken.split('.').length).not.toBe(3)
  })
})
