import { test, expect } from '@playwright/test'
import { TestUtils } from '../helpers/test-utils'

test.describe('OAuth Playground Endpoint Preflight', () => {
  let utils: TestUtils

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
  })

  test('should run introspection preflight and validate endpoint before submit', async ({
    page,
  }) => {
    await utils.navigateTo('/oauth-playground/introspection')

    const preflightIssuerInput = page.locator('input[placeholder="https://example.com"]').first()
    await preflightIssuerInput.fill('http://localhost:8788/api')
    await page.click('button:has-text("Run Preflight")')

    await expect(page.locator('text=Raw Report JSON')).toBeVisible()
    await expect(page.locator('#introspection-endpoint')).toHaveValue(/\/api\/introspect$/)

    await page.locator('#token').fill('invalid.token.value')
    await page.click('button:has-text("Introspect Token")')
    await expect(page.locator('text=Introspection Result')).toBeVisible()
  })

  test('should run userinfo preflight and validate endpoint before submit', async ({ page }) => {
    await utils.navigateTo('/oauth-playground/userinfo')

    const preflightIssuerInput = page.locator('input[placeholder="https://example.com"]').first()
    await preflightIssuerInput.fill('http://localhost:8788/api')
    await page.click('button:has-text("Run Preflight")')

    await expect(page.locator('text=Raw Report JSON')).toBeVisible()
    await expect(page.locator('#userinfo-endpoint')).toHaveValue(/\/api\/userinfo$/)

    await page.locator('#access-token').fill('invalid.token.value')
    await page.click('button:has-text("Get UserInfo")')
    await expect(page.locator('text=UserInfo Result')).toBeVisible()
  })
})
