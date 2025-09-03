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

  test('generates and signs Redirect URL', async ({ page }) => {
    // Fill Issuer, Destination, ACS
    await page.locator('label:has-text("Issuer")').locator('..').locator('input').fill('https://sp.example.com')
    await page.locator('label:has-text("Destination")').locator('..').locator('input').fill('https://idp.example.com/sso')
    await page
      .locator('label:has-text("AssertionConsumerServiceURL")')
      .locator('..')
      .locator('input')
      .fill('https://sp.example.com/saml/acs')

    // Set Binding = HTTP-Redirect
    await page.locator('label:has-text("Binding")').locator('..').locator('[role="combobox"]').click()
    await page.locator('[role="option"]:has-text("HTTP-Redirect")').click()

    // Go to Launch tab
    await page.click('button:has-text("Launch")')
    // Ensure Redirect URL is generated (contains SAMLRequest)
    await expect(page.locator('text=SAMLRequest=')).toBeVisible()

    // Enable signing
    await page.locator('text=Sign Redirect').locator('..').locator('button[role="switch"]').click()

    // Paste PKCS8 key
    await page
      .locator('label:has-text("Private Key (PKCS8 PEM)")')
      .locator('..')
      .locator('textarea')
      .fill(TEST_PRIVATE_KEY)

    // Sign URL
    await page.click('button:has-text("Sign URL")')

    // Confirm signed URL visible and contains Signature & SigAlg
    await expect(page.locator('text=Signed Redirect URL')).toBeVisible()
    const signedBlock = page.locator('text=Signed Redirect URL').locator('..')
    await expect(signedBlock).toContainText('Signature=')
    await expect(signedBlock).toContainText('SigAlg=')
    await expect(signedBlock).toContainText('SAMLRequest=')
  })
})

