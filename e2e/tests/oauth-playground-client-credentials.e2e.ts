import { test, expect } from '@playwright/test'
import { TestUtils } from '../helpers/test-utils'
import { selectors } from '../helpers/selectors'

test.describe('OAuth Playground - Client Credentials', () => {
  let utils: TestUtils

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
    await utils.navigateTo('/oauth-playground/client-credentials')
  })

  test('should load client credentials page', async ({ page }) => {
    await expect(page).toHaveTitle(/iam\.tools/)
    await expect(page.locator('text=OAuth Client Credentials Flow')).toBeVisible()
  })

  test('should auto-run token endpoint preflight after issuer-history discovery', async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'iam-tools-issuer-history',
        JSON.stringify([
          {
            id: 'e2e-client-credentials-issuer',
            url: 'http://localhost:8788/api',
            name: 'Local Demo Issuer',
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
          },
        ])
      )
    })
    await page.reload()

    await page.click(selectors.oauthPlayground.issuerHistoryButton)
    await page.getByRole('menuitem').filter({ hasText: 'Local Demo Issuer' }).click()

    await expect(
      page.locator(selectors.oauthPlayground.clientCredentialsTokenEndpointInput)
    ).toHaveValue(/\/api\/token$/)
    await expect(page.locator(selectors.oauthPlayground.preflightReport)).toBeVisible()
  })

  test('should run token endpoint preflight for reachable and unreachable issuers', async ({
    page,
  }) => {
    const preflightIssuerInput = page.locator('#oidc-preflight-issuer-url')

    await preflightIssuerInput.fill('http://localhost:8788/api')
    await page.click(selectors.oauthPlayground.preflightRunButton)

    await expect(page.locator(selectors.oauthPlayground.preflightReport)).toBeVisible()
    await expect(
      page.locator(selectors.oauthPlayground.clientCredentialsTokenEndpointInput)
    ).toHaveValue(/\/api\/token$/)

    await preflightIssuerInput.fill('http://localhost:8788/api/not-real')
    await page.click(selectors.oauthPlayground.preflightRunButton)

    await expect(page.locator('[data-testid="oidc-preflight-result-discovery"]')).toBeVisible()
    await expect(page.locator('[data-testid="oidc-preflight-result-discovery"]')).toContainText(
      'FAIL'
    )
  })

  test('should toggle demo mode', async ({ page }) => {
    await page.click(selectors.oauthPlayground.demoModeSwitch)

    await expect(
      page.locator(selectors.oauthPlayground.clientCredentialsTokenEndpointInput)
    ).toHaveValue(/api\/token/)
    await expect(page.locator('#client-id')).toHaveValue(/demo/)
    await expect(page.locator('#client-secret')).toHaveValue(/demo/)
  })

  test('should request token in demo mode', async ({ page }) => {
    await page.click(selectors.oauthPlayground.demoModeSwitch)

    await expect(page.getByRole('button', { name: 'Request Demo Token' })).toBeEnabled()
    await page.getByRole('button', { name: 'Request Demo Token' }).click()

    await expect(page.locator('text=Result')).toBeVisible()
    await expect(page.locator('text=/"access_token"/')).toBeVisible()
    await expect(page.locator('text=/"token_type"/')).toBeVisible()
    await expect(page.locator('text=/"expires_in"/')).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    const demoSwitch = page.locator(selectors.oauthPlayground.demoModeSwitch)
    if (await demoSwitch.isChecked()) {
      await demoSwitch.click()
    }

    const requestButton = page.getByRole('button', { name: 'Request Token' })
    await expect(requestButton).toBeDisabled()

    await page
      .locator(selectors.oauthPlayground.clientCredentialsTokenEndpointInput)
      .fill('https://example.com/token')
    await page.locator('#client-id').fill('test-client-id')
    await page.locator('#client-secret').fill('test-client-secret')

    await expect(requestButton).toBeEnabled()
  })

  test('should handle custom scopes', async ({ page }) => {
    await page.click(selectors.oauthPlayground.demoModeSwitch)

    const scopeInput = page.locator('#scope')
    await scopeInput.clear()
    await scopeInput.fill('read:users write:users admin')

    await page.getByRole('button', { name: 'Request Demo Token' }).click()

    await expect(page.locator('text=Result')).toBeVisible()
    await expect(page.locator('code:has-text("read:users write:users admin")')).toBeVisible()
  })

  test('should handle token request error', async ({ page }) => {
    const demoSwitch = page.locator(selectors.oauthPlayground.demoModeSwitch)
    if (await demoSwitch.isChecked()) {
      await demoSwitch.click()
    }

    await page
      .locator(selectors.oauthPlayground.clientCredentialsTokenEndpointInput)
      .fill('https://invalid.example.com/token')
    await page.locator('#client-id').fill('test-client')
    await page.locator('#client-secret').fill('test-secret')

    await page.getByRole('button', { name: 'Request Token' }).click()

    await expect(page.locator('text=Result')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=/\"error\"/').first()).toBeVisible()
  })
})
