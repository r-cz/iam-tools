import { expect, test } from '@playwright/test'

test.describe('New local-first IAM tools', () => {
  test('compares example JWT claims', async ({ page }) => {
    await page.goto('/token-comparison')
    await page.getByTestId('token-comparison-example').click()

    await expect(page.getByText('Claim differences', { exact: true })).toBeVisible()
    await expect(page.getByText('authentication_method', { exact: true })).toBeVisible()
  })

  test('rejects a non-object JWT payload without crashing', async ({ page }) => {
    await page.goto('/token-comparison')
    await page.getByTestId('token-comparison-left').fill('e30.bnVsbA.signature')
    await page.getByTestId('token-comparison-right').fill('e30.e30.signature')

    await expect(
      page.getByText('The JWT payload must be a JSON object.', { exact: true })
    ).toBeVisible()
    await expect(page.getByTestId('token-comparison-root')).toBeVisible()
    await expect(page.getByText('Something went wrong.', { exact: true })).toHaveCount(0)
  })

  test('validates a SCIM User example', async ({ page }) => {
    await page.goto('/scim/resource-validator')
    await page.getByTestId('scim-resource-user-example').click()

    await expect(page.getByText('Valid', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('User', { exact: true }).first()).toBeVisible()
  })

  test('builds and validates SCIM PATCH JSON', async ({ page }) => {
    await page.goto('/scim/patch-builder')
    await expect(page.getByText('Canonical PatchOp document', { exact: true })).toBeVisible()

    await page.getByRole('tab', { name: 'Raw validator' }).click()
    await page.getByTestId('scim-patch-example').click()
    await expect(page.getByText('Valid PatchOp', { exact: true })).toBeVisible()
  })

  test('parses and explains an LDAP filter', async ({ page }) => {
    await page.goto('/ldap/filter-studio')
    await page.getByTestId('ldap-filter-example').click()

    await expect(page.getByText('Valid', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Explanation' }).click()
    await expect(page.getByText(/All of the following must match/)).toBeVisible()
  })

  test('generates and verifies a TOTP test code', async ({ page }) => {
    await page.goto('/mfa/totp')
    await page.getByTestId('totp-example').click()

    const currentCode = page.getByTestId('totp-current-code')
    await expect(currentCode).toHaveText(/^\d{6}$/)
    await page.getByTestId('totp-candidate-code').fill((await currentCode.textContent()) ?? '')
    await page.getByTestId('totp-verify').click()
    await expect(page.getByText('Candidate verified', { exact: true })).toBeVisible()
  })

  test('checks a safe redirect registration', async ({ page }) => {
    await page.goto('/oauth/redirect-uri')
    await page.getByTestId('redirect-uri-example').click()

    await expect(page.getByText('No blocking issue found', { exact: true })).toBeVisible()
    await expect(page.getByText('Exact match', { exact: true }).first()).toBeVisible()
  })

  test('blocks an exact registration using an unsupported redirect scheme', async ({ page }) => {
    await page.goto('/oauth/redirect-uri')
    await page.getByTestId('redirect-uri-requested').fill('mailto:user@example.com')
    await page.getByTestId('redirect-uri-registered').fill('mailto:user@example.com')

    await expect(page.getByText('Redirect needs attention', { exact: true })).toBeVisible()
    await expect(page.getByText('Unsupported redirect scheme', { exact: true })).toBeVisible()
  })
})
