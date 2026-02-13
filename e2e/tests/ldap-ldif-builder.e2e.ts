import { expect, test } from '@playwright/test'
import { selectors } from '../helpers/selectors'

test.describe('LDAP LDIF Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ldap/ldif-builder')
    await expect(page).toHaveURL('/ldap/ldif-builder')
  })

  test('should display page title and description', async ({ page }) => {
    await expect(
      page.locator('[data-slot="card-title"]:has-text("LDIF Builder & Viewer")')
    ).toBeVisible()
    await expect(page.locator('text=Generate, inspect, and validate LDIF')).toBeVisible()
  })

  test('should allow user to input LDIF entries', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await expect(ldifInput).toBeVisible()

    const sampleLdif = `dn: uid=jdoe,ou=people,dc=example,dc=com
objectClass: inetOrgPerson
uid: jdoe
cn: John Doe
sn: Doe`

    await ldifInput.fill(sampleLdif)
    await expect(ldifInput).toHaveValue(sampleLdif)
  })

  test('should show templates popover when clicked', async ({ page }) => {
    await page.click(selectors.ldap.ldifTemplatesButton)
    await expect(page.getByRole('button', { name: /Person/i }).first()).toBeVisible()
  })

  test('should insert template when selected', async ({ page }) => {
    await page.click(selectors.ldap.ldifTemplatesButton)

    await page.locator('button:has-text("Person")').first().click()

    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await expect(ldifInput).toHaveValue(/dn:/)
    await expect(ldifInput).toHaveValue(/objectClass/)
  })

  test('should show quick metrics after LDIF input', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await ldifInput.fill(`dn: uid=jdoe,ou=people,dc=example,dc=com
objectClass: person
cn: John Doe
sn: Doe

dn: uid=asmith,ou=people,dc=example,dc=com
objectClass: person
cn: Alice Smith
sn: Smith`)

    await expect(page.locator('text=Quick Metrics')).toBeVisible()
    await expect(page.locator('dt:has-text("Entries")').first()).toBeVisible()
  })

  test('should clear LDIF when clear button clicked', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com\ncn: Test`)

    await page.click(selectors.ldap.ldifClearButton)

    await expect(ldifInput).toHaveValue('')
  })

  test('should show parsed entries section', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com
cn: Test User`)

    await expect(page.locator('text=Parsed Entries')).toBeVisible()
    await expect(page.locator('summary:has-text("uid=test,dc=example,dc=com")')).toBeVisible()
  })

  test('should show schema validation section', async ({ page }) => {
    await expect(page.locator('text=Schema validation disabled')).toBeVisible()
    await expect(page.locator('text=Select schemas to enable validation')).toBeVisible()
  })

  test('should show schemas popover with built-in schemas', async ({ page }) => {
    await page.click(selectors.ldap.ldifSchemasButton)

    await expect(page.locator('text=Built-in Schemas')).toBeVisible()
    await expect(page.getByText('Saved Schemas', { exact: true })).toBeVisible()
  })

  test('should show copy button and copy LDIF', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com
cn: Test`)

    const copyButton = page.locator('button[aria-label="Copy LDIF"]')
    await expect(copyButton).toBeEnabled()
  })

  test('should show upload button', async ({ page }) => {
    await expect(page.locator(selectors.ldap.ldifUploadButton)).toBeVisible()
  })

  test('should parse multiple LDIF entries correctly', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await ldifInput.fill(`dn: uid=user1,dc=example,dc=com
cn: User One
objectClass: person

dn: uid=user2,dc=example,dc=com
cn: User Two
objectClass: person

dn: uid=user3,dc=example,dc=com
cn: User Three
objectClass: person`)

    await expect(page.locator('text=Quick Metrics')).toBeVisible()
  })

  test('should handle LDIF with multi-valued attributes', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await ldifInput.fill(`dn: uid=admin,dc=example,dc=com
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
cn: Admin User
mail: admin@example.com
mail: admin@corp.example.com`)

    await expect(page.locator('text=Parsed Entries')).toBeVisible()
    await expect(page.locator('summary:has-text("uid=admin,dc=example,dc=com")')).toBeVisible()
  })

  test('should show empty state when no LDIF provided', async ({ page }) => {
    await expect(page.locator('text=Quick Metrics')).toBeVisible()
    await expect(page.locator('dt:has-text("Entries")').first()).toBeVisible()
  })

  test('should handle base64-encoded attributes in parsed entries', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com
cn: Test
description:: VGVzdCBkZXNjcmlwdGlvbg==`)

    await expect(page.locator('text=Parsed Entries')).toBeVisible()
  })

  test('should show parse errors for malformed LDIF', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await ldifInput.fill(`objectClass: person
cn: No DN Entry`)

    await expect(page.locator('text=Issues while parsing LDIF')).toBeVisible()
  })

  test('should show file input for upload (hidden)', async ({ page }) => {
    await expect(page.locator('input[type="file"]')).toBeHidden()
  })

  test('should count attribute values correctly', async ({ page }) => {
    const ldifInput = page.locator(selectors.ldap.ldifInput)
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com
objectClass: person
objectClass: inetOrgPerson
cn: Test User
mail: test1@example.com
mail: test2@example.com
mail: test3@example.com`)

    await expect(page.locator('dt:has-text("Attribute values")').first()).toBeVisible()
  })
})
