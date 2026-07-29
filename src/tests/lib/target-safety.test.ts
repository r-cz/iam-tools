import { describe, expect, test } from 'bun:test'
import { assessPublicNetworkTarget, isPrivateOrLocalHostname } from '@/lib/network/target-safety'

describe('public network target safety', () => {
  test.each([
    'http://localhost/token',
    'http://localhost./token',
    'http://api.localhost/token',
    'http://service.local/token',
    'http://metadata.google.internal/token',
    'http://home.arpa/token',
    'http://localtest.me/token',
    'http://lvh.me/token',
    'http://vcap.me/token',
    'http://nip.io/token',
    'http://sslip.io/token',
    'http://127.0.0.1.nip.io/token',
    'http://intranet/token',
    'http://0.0.0.0/token',
    'http://127.0.0.1/token',
    'http://127.1/token',
    'http://2130706433/token',
    'http://10.20.30.40/token',
    'http://100.64.0.1/token',
    'http://169.254.169.254/latest/meta-data',
    'http://172.31.255.255/token',
    'http://192.168.1.1/token',
    'http://198.18.0.1/token',
    'http://[::1]/token',
    'http://[fe80::1]/token',
    'http://[fc00::1]/token',
  ])('blocks non-public target %s', (target) => {
    expect(assessPublicNetworkTarget(target)).toMatchObject({
      allowed: false,
      reason: 'private_or_local',
    })
  })

  test('blocks embedded credentials and non-HTTP protocols', () => {
    expect(assessPublicNetworkTarget('https://user:secret@issuer.example.com/token')).toMatchObject(
      {
        allowed: false,
        reason: 'embedded_credentials',
      }
    )
    expect(assessPublicNetworkTarget('file:///etc/passwd')).toMatchObject({
      allowed: false,
      reason: 'unsupported_protocol',
    })
  })

  test('allows public DNS names and public IPv4 literals', () => {
    expect(assessPublicNetworkTarget('https://issuer.example.com/oauth2/token').allowed).toBe(true)
    expect(assessPublicNetworkTarget('https://8.8.8.8/oauth2/token').allowed).toBe(true)
    expect(isPrivateOrLocalHostname('issuer.example.com')).toBe(false)
  })
})
