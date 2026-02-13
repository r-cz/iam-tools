import { test, expect } from '@playwright/test'
import { TestUtils } from '../helpers/test-utils'

// Test-only PKCS#8 RSA private key (short) for signing Redirect URL
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCzK1T0l7YwHt8W
8mHnJc3p2u2sJcW0y0hQv2Yq0G9e4dVJm7jYJ1kM2qGz6lK6a0Sj5j9GqC7h9c5H
0j5f+J0v5u6T8J8mJX8rj5S3l1i1iJX4I4lg1w4d2S7r6YQO3j6x2z5m0m5J6b1B
3Fv2cX5bXw+u6Nn0jzO2Pv8l5Qbiq1Jq4jzYqC3C7lJ2j8vD2p9xYt+gS0cJzH8G
QwIDAQABAoIBAQCi3sQ0g8M0VnqO8l8ZQkMra4HfJX2m3w2C+L0qk6DQqfFJp4D4
QMmF8w1Yqj6+1hQvF2Qf1B8Wl2eV0f3r1l3Zr5d5B5b3V3f1g1O0QyC2R0H+vKQ9
uQIDAQAB
-----END PRIVATE KEY-----`

test.describe('SAML Request Builder', () => {
  let utils: TestUtils
  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
    await utils.navigateTo('/saml/request-builder')
    await expect(page.locator('text=SAML AuthnRequest Builder')).toBeVisible()
  })

  test('generates SAML AuthnRequest', async ({ page }) => {
    const issuerInput = page.locator('#saml-request-issuer-input')
    await issuerInput.clear()
    await issuerInput.fill('https://sp.example.com')

    const destinationInput = page.locator('#saml-request-destination-input')
    await destinationInput.clear()
    await destinationInput.fill('https://idp.example.com/sso')

    const acsInput = page.locator('#saml-request-acs-input')
    await acsInput.clear()
    await acsInput.fill('https://sp.example.com/saml/acs')

    await page.click('[data-testid="saml-request-tab-xml"]')
    await expect(page.locator('text=Generated AuthnRequest XML')).toBeVisible()

    // Verify XML contains our values
    const xmlPanel = page.getByRole('tabpanel', { name: 'XML' })
    await expect(xmlPanel).toContainText('https://sp.example.com')
    await expect(xmlPanel).toContainText('https://idp.example.com/sso')
    await expect(xmlPanel).toContainText('https://sp.example.com/saml/acs')

    await page.click('[data-testid="saml-request-tab-encoded"]')
    await expect(page.locator('text=HTTP-POST: Base64 SAMLRequest')).toBeVisible()

    await page.click('[data-testid="saml-request-tab-launch"]')
    const postForm = page.locator('form[method="post"]')
    await expect(postForm).toBeVisible()
    await expect(page.locator('[data-testid="saml-request-submit-post-button"]')).toBeVisible()
  })
})
