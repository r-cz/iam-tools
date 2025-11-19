import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { setupApiMocks, sampleJwksResponse } from '@/tests/utils/test-api-mocks'

const originalFetch = globalThis.fetch
let mockApi: ReturnType<typeof setupApiMocks>

describe('setupApiMocks', () => {
  beforeEach(() => {
    mockApi = setupApiMocks()
  })

  afterEach(() => {
    mockApi.restore()
  })

  test('provides mocked success responses for exact URLs', async () => {
    const url = 'https://example.com/jwks'

    mockApi.reset().mockSuccess(url, sampleJwksResponse)

    const response = await fetch(url)

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(sampleJwksResponse)

    mockApi.restore()
    expect(globalThis.fetch).toBe(originalFetch)
  })

  test('supports regex matching and error responses', async () => {
    mockApi.reset().mockError('https://api\\.example\\.com/.*', { error: 'bad-request' }, 418)

    const response = await fetch('https://api.example.com/test')

    expect(response.ok).toBe(false)
    expect(response.status).toBe(418)
    await expect(response.text()).resolves.toContain('bad-request')
  })

  test('returns default not-found when no mock is defined', async () => {
    mockApi.reset()

    const response = await fetch('https://unmocked.example.com/value')

    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'No mock defined for this URL',
    })
  })

  test('exposes the mocked fetch handler for advanced assertions', () => {
    const handler = mockApi.getMockedFetch()

    expect(typeof handler).toBe('function')
    expect(handler).toBe(globalThis.fetch)
  })
})
