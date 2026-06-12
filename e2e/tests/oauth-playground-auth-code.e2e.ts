import { test, expect } from '@playwright/test'
import { TestUtils } from '../helpers/test-utils'
import { selectors } from '../helpers/selectors'

test.describe('OAuth Playground - Auth Code with PKCE', () => {
  let utils: TestUtils

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
    await utils.navigateTo('/oauth-playground/auth-code-pkce')
  })

  test('should load auth code PKCE page', async ({ page }) => {
    await expect(page).toHaveTitle(/iam\.tools/)
    await expect(page.locator('text=OAuth Authorization Code Flow')).toBeVisible()
  })

  test('should auto-run endpoint preflight after discovery and continue auth flow', async ({
    page,
  }) => {
    await page.locator('#issuer-url-discovery').fill('http://localhost:8788/api')

    const discoveryResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/.well-known/openid-configuration') &&
        response.request().method() === 'GET'
    )

    await page.click('[data-testid="oauth-authcode-discover-button"]')
    const discoveryResponse = await discoveryResponsePromise
    expect(discoveryResponse.ok()).toBeTruthy()

    await expect(page.locator(selectors.oauthPlayground.tokenUrlInput)).toHaveValue(/\/api\/token$/)
    await expect(page.locator(selectors.oauthPlayground.preflightReport)).toBeVisible()
    await expect(page.locator(selectors.oauthPlayground.preflightRawReport)).toBeVisible()

    await page.locator(selectors.oauthPlayground.clientIdInput).fill('test-client')
    await page.click(selectors.oauthPlayground.startAuthButton)

    await expect(page.locator(selectors.oauthPlayground.tabAuth)).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  test('should support manual preflight runs', async ({ page }) => {
    await page.locator('#issuer-url-discovery').fill('http://localhost:8788/api')

    await page.click(selectors.oauthPlayground.preflightRunButton)

    await expect(page.locator(selectors.oauthPlayground.preflightPanel)).toBeVisible()
    await expect(page.locator(selectors.oauthPlayground.preflightReport)).toBeVisible()
    await expect(page.locator(selectors.oauthPlayground.preflightRawReport)).toBeVisible()
  })

  test('should toggle demo mode', async ({ page }) => {
    const demoSwitch = page.locator(selectors.oauthPlayground.demoModeSwitch)
    await demoSwitch.click()

    await expect(page.locator('#issuer-url-discovery')).not.toBeVisible()
    await expect(page.locator(selectors.oauthPlayground.authUrlInput)).not.toBeVisible()
    await expect(page.locator(selectors.oauthPlayground.tokenUrlInput)).not.toBeVisible()

    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput)
    await expect(clientIdInput).toBeVisible()
    await expect(clientIdInput).toHaveAttribute('placeholder', 'demo-client')

    await expect(page.locator(selectors.oauthPlayground.startAuthButton)).toBeEnabled()
  })

  test('should start authorization flow in demo mode', async ({ page }) => {
    await page.click(selectors.oauthPlayground.demoModeSwitch)

    await page.locator(selectors.oauthPlayground.clientIdInput).fill('test-client')
    await page.click(selectors.oauthPlayground.startAuthButton)

    await expect(page.locator(selectors.oauthPlayground.tabAuth)).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(page.locator(selectors.oauthPlayground.launchAuthorizationButton)).toBeVisible()
  })

  test('should launch demo authorization page instead of the app 404', async ({ page }) => {
    await page.click(selectors.oauthPlayground.demoModeSwitch)

    await page.locator(selectors.oauthPlayground.clientIdInput).fill('test-client')
    await page.click(selectors.oauthPlayground.startAuthButton)

    const popupPromise = page.waitForEvent('popup')
    await page.click(selectors.oauthPlayground.launchAuthorizationButton)
    const popup = await popupPromise

    await expect(popup).toHaveURL(/\/oauth-playground\/demo-auth/)
    await expect(popup.getByText('Demo Identity Provider', { exact: true })).toBeVisible()
    await expect(popup.getByText('Page Not Found')).not.toBeVisible()

    await popup.close()
  })

  test('should exchange demo authorization code and refresh tokens', async ({ page }) => {
    await page.click(selectors.oauthPlayground.demoModeSwitch)

    await page.locator(selectors.oauthPlayground.clientIdInput).fill('test-client')
    await page
      .locator(selectors.oauthPlayground.scopeInput)
      .fill('openid profile email offline_access')
    await page.click(selectors.oauthPlayground.startAuthButton)

    const popupPromise = page.waitForEvent('popup')
    await page.click(selectors.oauthPlayground.launchAuthorizationButton)
    const popup = await popupPromise

    await expect(popup).toHaveURL(/\/oauth-playground\/demo-auth/)
    await popup.getByRole('button', { name: 'Authorize' }).click()

    await expect(page.locator(selectors.oauthPlayground.tabToken)).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(page.getByText('Token Exchange', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Exchange Code for Tokens' }).click()

    await expect(page.getByText('Access Token', { exact: true })).toBeVisible()
    await expect(page.getByText('Refresh Token Flow', { exact: true })).toBeVisible()
    await expect(page.getByText('Failed to exchange code for tokens')).not.toBeVisible()

    await page.getByRole('button', { name: 'Refresh Tokens' }).click()

    await expect(page.getByText('Refresh Response', { exact: true })).toBeVisible()
    await expect(page.getByText('Failed to refresh tokens')).not.toBeVisible()
  })

  test('should regenerate PKCE values', async ({ page }) => {
    await expect(page.locator('text=PKCE Parameters')).toBeVisible()

    const regenerateButton = page.locator('button:has-text("Regenerate")')
    await expect(regenerateButton).toBeVisible()
    await regenerateButton.click()

    await expect(page.locator('text=Code Verifier').first()).toBeVisible()
    await expect(page.locator('text=Code Challenge (S256)')).toBeVisible()
    await expect(page.locator('text=State').first()).toBeVisible()
  })

  test('should show step indicators', async ({ page }) => {
    await expect(page.locator(selectors.oauthPlayground.tabConfig)).toBeVisible()
    await expect(page.locator(selectors.oauthPlayground.tabAuth)).toBeVisible()
    await expect(page.locator(selectors.oauthPlayground.tabToken)).toBeVisible()

    await expect(page.locator(selectors.oauthPlayground.tabConfig)).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })
})
