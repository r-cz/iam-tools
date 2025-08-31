import { Page, expect } from '@playwright/test'

export class TestUtils {
  constructor(private page: Page) {}

  async navigateTo(path: string) {
    await this.page.goto(path)
    await this.page.waitForLoadState('networkidle')
  }

  async clickAndWait(selector: string, waitForSelector?: string) {
    await this.page.click(selector)
    if (waitForSelector) {
      await this.page.waitForSelector(waitForSelector, { state: 'visible' })
    }
  }

  async fillInput(selector: string, value: string) {
    await this.page.fill(selector, value)
  }

  async waitForToast(type: 'success' | 'error' = 'success') {
    // Wait for toast in the notifications region
    const toastSelector =
      type === 'success'
        ? 'region[aria-label="Notifications"] >> text=/success/'
        : 'region[aria-label="Notifications"] >> text=/error/'
    await this.page.waitForSelector(toastSelector, { state: 'visible', timeout: 5000 })
  }

  async closeToast() {
    const closeButton = this.page.locator('button[aria-label="Close toast"]')
    if (await closeButton.isVisible()) {
      await closeButton.click()
    }
  }

  async getButtonByText(text: string) {
    return this.page.locator(`button:has-text("${text}")`)
  }

  async waitForButtonEnabled(buttonText: string) {
    const button = await this.getButtonByText(buttonText)
    await expect(button).toBeEnabled()
  }

  async waitForTextVisible(text: string) {
    await this.page.waitForSelector(`text="${text}"`, { state: 'visible' })
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true })
  }
}
