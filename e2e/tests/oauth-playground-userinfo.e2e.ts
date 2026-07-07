import { test, expect } from '@playwright/test'
import { TestUtils } from '../helpers/test-utils'
import { selectors } from '../helpers/selectors'

test.describe('OAuth Playground - UserInfo', () => {
  let utils: TestUtils

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
    await utils.navigateTo('/oauth-playground/userinfo')
    await expect(page.locator('text=OAuth UserInfo Endpoint')).toBeVisible()
  })

  test('should request demo UserInfo claims with a generated access token', async ({ page }) => {
    await page.click(selectors.oauthPlayground.demoModeSwitch)

    await expect(page.locator(selectors.oauthPlayground.userInfoEndpointInput)).toHaveValue(
      /\/api\/userinfo$/
    )
    await expect(page.locator(selectors.oauthPlayground.userInfoAccessTokenInput)).not.toHaveValue(
      ''
    )

    await page.click(selectors.oauthPlayground.userInfoSubmitButton)

    await expect(page.locator('text=UserInfo Result')).toBeVisible()
    await expect(page.locator('p').filter({ hasText: 'Example User' })).toBeVisible()
    await expect(page.locator('p').filter({ hasText: 'example@iam.tools' })).toBeVisible()
    await expect(page.locator('text=Demo Response')).toBeVisible()
    await expect(page.locator('text=Subject identifier for the authenticated user.')).toBeVisible()
  })
})
