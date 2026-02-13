import { test, expect } from '@playwright/test'
import { TestUtils } from '../helpers/test-utils'
import { selectors } from '../helpers/selectors'

test.describe('Token Inspector', () => {
  let utils: TestUtils

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
    await utils.navigateTo('/token-inspector')
  })

  test('should load token inspector page', async ({ page }) => {
    await expect(page).toHaveTitle(/iam\.tools/)
    await expect(page.locator('text=OAuth/OIDC Token Inspector')).toBeVisible()
  })

  test('should have disabled inspect button initially', async ({ page }) => {
    await expect(page.locator(selectors.buttons.inspectToken)).toBeDisabled()
  })

  test('should generate and inspect example token', async ({ page }) => {
    await page.click(selectors.buttons.example)

    const tokenInput = page.locator(selectors.tokenInspector.tokenInput)
    await expect(tokenInput).toHaveValue(/eyJ/)

    await expect(page.locator(selectors.buttons.inspectToken)).toBeEnabled()
    await page.click(selectors.buttons.inspectToken)

    await expect(page.locator(selectors.tokenInspector.signatureValid)).toBeVisible()
    await expect(page.locator('text=Demo Token')).toBeVisible()

    await expect(page.locator(selectors.tokenInspector.headerTab)).toBeVisible()
    await expect(page.locator(selectors.tokenInspector.payloadTab)).toBeVisible()
    await expect(page.locator(selectors.tokenInspector.signatureTab)).toBeVisible()
    await expect(page.locator(selectors.tokenInspector.timelineTab)).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    await page.click(selectors.buttons.example)
    await expect(page.locator(selectors.buttons.inspectToken)).toBeEnabled()
    await page.click(selectors.buttons.inspectToken)

    await expect(page.locator('text=Common OAuth/JWT Claims')).toBeVisible()

    await page.click(selectors.tokenInspector.headerTab)
    await expect(page.locator(selectors.tokenInspector.headerTab)).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(page.locator('text=alg').first()).toBeVisible()

    await page.click(selectors.tokenInspector.signatureTab)
    await expect(page.locator(selectors.tokenInspector.signatureTab)).toHaveAttribute(
      'aria-selected',
      'true'
    )

    await page.click(selectors.tokenInspector.timelineTab)
    await expect(page.locator(selectors.tokenInspector.timelineTab)).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  test('should reset token input', async ({ page }) => {
    await page.click(selectors.buttons.example)
    await expect(page.locator(selectors.buttons.inspectToken)).toBeEnabled()

    const tokenInput = page.locator(selectors.tokenInspector.tokenInput)
    await expect(tokenInput).not.toHaveValue('')

    await page.click(selectors.buttons.reset)

    await expect(tokenInput).toHaveValue('')
    await expect(page.locator(selectors.buttons.inspectToken)).toBeDisabled()
  })

  test('should handle invalid token', async ({ page }) => {
    await utils.fillInput(selectors.tokenInspector.tokenInput, 'invalid-token')

    await expect(page.locator('text=Invalid token: Invalid JWT format')).toBeVisible()
    await expect(page.locator(selectors.buttons.inspectToken)).toBeEnabled()
  })

  test('should display token size', async ({ page }) => {
    await page.click(selectors.buttons.example)
    await expect(page.locator(selectors.buttons.inspectToken)).toBeEnabled()
    await page.click(selectors.buttons.inspectToken)

    await expect(page.locator(selectors.tokenInspector.tokenSizeToggle)).toBeVisible()
    await page.click(selectors.tokenInspector.tokenSizeToggle)

    await expect(page.locator('text=Base64 Encoding Overhead')).toBeVisible()
  })

  test('should show token claims details', async ({ page }) => {
    await page.click(selectors.buttons.example)
    await expect(page.locator(selectors.buttons.inspectToken)).toBeEnabled()
    await page.click(selectors.buttons.inspectToken)

    await expect(page.locator('text=iss').first()).toBeVisible()
    await expect(page.locator('text=sub').first()).toBeVisible()
    await expect(page.locator('text=aud').first()).toBeVisible()

    await expect(page.locator('text=https://iam.tools/demo').first()).toBeVisible()
    await expect(page.locator('text=user-example-123').first()).toBeVisible()
  })
})
