import { test, expect } from '@playwright/test'
import { TestUtils } from '../helpers/test-utils'
import { selectors } from '../helpers/selectors'

test.describe('OIDC Explorer', () => {
  let utils: TestUtils

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
    await utils.navigateTo('/oidc-explorer')
  })

  test('should load OIDC explorer page', async ({ page }) => {
    await expect(page).toHaveTitle(/iam\.tools/)
    await expect(page.locator('text=OIDC Configuration Explorer')).toBeVisible()
  })

  test('should have disabled fetch button initially', async ({ page }) => {
    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeDisabled()
  })

  test('should load random example provider', async ({ page }) => {
    await page.click(selectors.oidcExplorer.randomExample)

    const urlInput = page.locator(selectors.oidcExplorer.urlInput)
    await expect(urlInput).not.toHaveValue('')

    const fullUrl = await urlInput.getAttribute('data-full-url')
    expect(fullUrl).toBeTruthy()
    expect(fullUrl).toMatch(/^https?:\/\//)

    const schemePrefix = await page.locator(selectors.oidcExplorer.schemePrefix).textContent()
    expect(fullUrl?.startsWith((schemePrefix ?? '').trim())).toBeTruthy()

    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeEnabled()
  })

  test('should fetch OIDC configuration for demo endpoint', async ({ page }) => {
    const demoUrl = 'http://localhost:8788/api'
    await utils.fillInput(selectors.oidcExplorer.urlInput, demoUrl)

    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeEnabled()
    await page.click(selectors.oidcExplorer.fetchConfigButton)

    await expect(page.locator('button[role="tab"]:has-text("Configuration")')).toBeVisible({
      timeout: 10000,
    })

    const urlValue = await page.locator(selectors.oidcExplorer.urlInput).inputValue()
    expect(urlValue).toBe(demoUrl.replace(/^https?:\/\//, ''))

    const fullUrl = await page
      .locator(selectors.oidcExplorer.urlInput)
      .getAttribute('data-full-url')
    expect(fullUrl).toBe(demoUrl)

    const schemePrefix = await page.locator(selectors.oidcExplorer.schemePrefix).textContent()
    expect((schemePrefix ?? '').trim()).toBe('http://')
  })

  test('should handle invalid OIDC URL without hanging', async ({ page }) => {
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://invalid.example.com')

    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeEnabled()
    await page.click(selectors.oidcExplorer.fetchConfigButton)

    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeEnabled({
      timeout: 10000,
    })
    await expect(page.locator('text=Fetching configuration...')).not.toBeVisible()
  })

  test('should detect known providers', async ({ page }) => {
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://accounts.google.com')
    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeEnabled()
    await page.click(selectors.oidcExplorer.fetchConfigButton)

    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeEnabled({
      timeout: 10000,
    })

    const urlValue = await page.locator(selectors.oidcExplorer.urlInput).inputValue()
    expect(urlValue).toBe('accounts.google.com')

    const fullUrl = await page
      .locator(selectors.oidcExplorer.urlInput)
      .getAttribute('data-full-url')
    expect(fullUrl).toBe('https://accounts.google.com')
    const schemePrefix = await page.locator(selectors.oidcExplorer.schemePrefix).textContent()
    expect((schemePrefix ?? '').trim()).toBe('https://')
  })

  test('should copy configuration to clipboard', async ({ page }) => {
    await page.locator(selectors.oidcExplorer.urlInput).fill('http://localhost:8788/api')
    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeEnabled()

    await page.click(selectors.oidcExplorer.fetchConfigButton)
    await expect(page.locator('button[role="tab"]:has-text("Configuration")')).toBeVisible({
      timeout: 10000,
    })

    const copyButtons = page.locator('button:has-text("Copy")')
    if ((await copyButtons.count()) > 0) {
      await expect(copyButtons.first()).toBeEnabled()
      await copyButtons.first().click()
    }
  })

  test('should clear input and disable fetch button', async ({ page }) => {
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://iam.tools/demo')
    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeEnabled()

    await page.locator(selectors.oidcExplorer.urlInput).clear()

    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeDisabled()
  })

  test('should validate URL format', async ({ page }) => {
    const urlInput = page.locator(selectors.oidcExplorer.urlInput)
    await urlInput.clear()

    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeDisabled()

    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://example.com')
    await expect(page.locator(selectors.oidcExplorer.fetchConfigButton)).toBeEnabled()
  })
})
