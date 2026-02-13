import { test, expect } from '@playwright/test'
import { TestUtils } from '../helpers/test-utils'
import { selectors } from '../helpers/selectors'

function getIssuerHistoryEntry(url: string) {
  return JSON.stringify([
    {
      id: 'e2e-history-issuer',
      url,
      name: 'Local Demo Issuer',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    },
  ])
}

test.describe('OAuth Playground Endpoint Preflight', () => {
  let utils: TestUtils

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
  })

  test('should auto-run introspection preflight after issuer-history discovery', async ({
    page,
  }) => {
    await utils.navigateTo('/oauth-playground/introspection')

    await page.evaluate((value) => {
      localStorage.setItem('iam-tools-issuer-history', value)
    }, getIssuerHistoryEntry('http://localhost:8788/api'))
    await page.reload()

    await page.click(selectors.oauthPlayground.issuerHistoryButton)
    await page.getByRole('menuitem').filter({ hasText: 'Local Demo Issuer' }).click()

    await expect(page.locator(selectors.oauthPlayground.introspectionEndpointInput)).toHaveValue(
      /\/api\/introspect$/
    )
    await expect(page.locator(selectors.oauthPlayground.preflightReport)).toBeVisible()

    await page
      .locator(selectors.oauthPlayground.introspectionTokenInput)
      .fill('invalid.token.value')
    await page.click(selectors.oauthPlayground.introspectionSubmitButton)
    await expect(page.locator('text=Introspection Result')).toBeVisible()
  })

  test('should auto-run userinfo preflight after issuer-history discovery', async ({ page }) => {
    await utils.navigateTo('/oauth-playground/userinfo')

    await page.evaluate((value) => {
      localStorage.setItem('iam-tools-issuer-history', value)
    }, getIssuerHistoryEntry('http://localhost:8788/api'))
    await page.reload()

    await page.click(selectors.oauthPlayground.issuerHistoryButton)
    await page.getByRole('menuitem').filter({ hasText: 'Local Demo Issuer' }).click()

    await expect(page.locator(selectors.oauthPlayground.userInfoEndpointInput)).toHaveValue(
      /\/api\/userinfo$/
    )
    await expect(page.locator(selectors.oauthPlayground.preflightReport)).toBeVisible()

    await page
      .locator(selectors.oauthPlayground.userInfoAccessTokenInput)
      .fill('invalid.token.value')
    await page.click(selectors.oauthPlayground.userInfoSubmitButton)
    await expect(page.locator('text=UserInfo Result')).toBeVisible()
  })
})
