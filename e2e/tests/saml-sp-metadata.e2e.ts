import { test, expect } from '@playwright/test'
import { TestUtils } from '../helpers/test-utils'

test.describe('SAML SP Metadata Generator', () => {
  let utils: TestUtils

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
    await utils.navigateTo('/saml/sp-metadata')
    await expect(page.locator('#main-content').getByText('SP Metadata Generator')).toBeVisible()
  })

  test('should escape metadata fields and include an optional signing certificate', async ({
    page,
  }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    })

    await page.locator('#sp-entity-id').fill('https://sp.example.com/entity?team=iam&name=<Admin>')
    await page.locator('#sp-acs-url').fill('https://sp.example.com/saml/acs?return=<ok>&x=1')
    await page.locator('#sp-slo-url').fill('https://sp.example.com/saml/logout')
    await page.locator('#sp-name-id-format').fill('urn:example:nameid')

    await expect(page.locator('body')).toContainText(
      'entityID="https://sp.example.com/entity?team=iam&amp;name=&lt;Admin&gt;"'
    )
    await expect(page.locator('body')).toContainText(
      'Location="https://sp.example.com/saml/acs?return=&lt;ok&gt;&amp;x=1"'
    )
    await expect(page.locator('body')).toContainText('SingleLogoutService')
    await expect(page.locator('body')).toContainText('urn:example:nameid')

    await page.getByRole('switch', { name: 'Include signing certificate' }).click()
    await page.locator('#sp-certificate').fill('MIICDEMO123')

    await expect(page.locator('body')).toContainText(
      '<ds:X509Certificate>MIICDEMO123</ds:X509Certificate>'
    )

    await page.locator('[data-testid="saml-sp-metadata-copy-button"]').click()
    expect(consoleErrors).toEqual([])
  })
})
