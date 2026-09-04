import { test, expect, type Page } from '@playwright/test'

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

async function openControlledApp(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'IAM Tools', exact: true })).toBeVisible()
  // An installed worker alone does not prove navigation requests are intercepted.
  // Control follows activation, including completion of the install-time precache.
  await page.waitForFunction(
    () => navigator.serviceWorker.controller?.state === 'activated',
    undefined,
    { timeout: 25_000 }
  )
}

test('serves secure, functional documents and permits the local provider through CSP and CORS', async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page)
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  const documentResponse = await page.goto('/')
  expect(documentResponse?.status()).toBe(200)
  const headers = documentResponse!.headers()
  expect(headers['content-type']).toContain('text/html')
  expect(headers['content-security-policy']).toContain("script-src 'self'")
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['referrer-policy']).toBe('no-referrer')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()')
  await expect(page).toHaveTitle(/iam\.tools/)
  await expect(page.getByRole('heading', { name: 'IAM Tools', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Explore tools', exact: true })).toBeVisible()

  const localProviderUrl = new URL('/api/jwks', page.url())
  localProviderUrl.hostname = 'localhost'
  // This must run in the document; an APIRequestContext would bypass both CSP and CORS.
  const localFetch = await page.evaluate(async (url) => {
    const response = await fetch(url)
    const data = await response.json()
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      keys: data.keys,
    }
  }, localProviderUrl.href)
  expect(localFetch.status).toBe(200)
  expect(localFetch.contentType).toContain('application/json')
  expect(Array.isArray(localFetch.keys)).toBe(true)
  expect(localFetch.keys.length).toBeGreaterThan(0)
  expect(runtimeErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('keeps API document navigations out of the service-worker app fallback', async ({
  page,
  baseURL,
}) => {
  const runtimeErrors = collectRuntimeErrors(page)
  await openControlledApp(page)

  const discoveryResponse = await page.goto('/api/.well-known/openid-configuration')
  expect(discoveryResponse?.status()).toBe(200)
  expect(discoveryResponse!.headers()['content-type']).toContain('application/json')
  expect(await discoveryResponse!.json()).toHaveProperty('issuer', `${baseURL}/api`)
  await expect(page.locator('#root')).toHaveCount(0)

  // Re-establish an app document under worker control before the bare-API regression.
  await openControlledApp(page)
  const unknownApiResponse = await page.goto('/api?audit=1')
  expect(unknownApiResponse?.status()).toBe(404)
  expect(unknownApiResponse!.headers()['content-type']).toContain('application/json')
  expect(await unknownApiResponse!.json()).toMatchObject({ error: 'not_found' })
  await expect(page.locator('#root')).toHaveCount(0)
  expect(runtimeErrors).toEqual([])
})

test('opens and operates a previously unvisited local tool while offline', async ({
  page,
  context,
}) => {
  const runtimeErrors = collectRuntimeErrors(page)
  await openControlledApp(page)
  await context.setOffline(true)
  try {
    const response = await page.goto('/ldap/filter-studio')
    expect(response?.fromServiceWorker()).toBe(true)
    await expect(
      page.getByRole('heading', { name: 'LDAP Filter Studio', exact: true })
    ).toBeVisible()
    await expect(page.getByTestId('ldap-filter-studio-root')).toBeVisible()
    await page.getByRole('textbox', { name: 'RFC 4515 filter', exact: true }).fill('(uid=alice)')
    await expect(
      page.getByText('Complete filter parsed successfully', { exact: true })
    ).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'URL-encoded value', exact: true })).toHaveValue(
      '%28uid%3Dalice%29'
    )
    expect(runtimeErrors).toEqual([])
  } finally {
    await context.setOffline(false)
  }
})
