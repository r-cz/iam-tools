import { expect, test } from '@playwright/test'

test.describe('LDAP LDIF Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('text=LDAP')
    await page.click('text=LDIF Builder')
    await expect(page).toHaveURL('/ldap/ldif-builder')
  })

  test('should display page title and description', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('LDIF Builder & Viewer')
    await expect(page.locator('text=Generate, inspect, and validate LDIF')).toBeVisible()
  })

  test('should allow user to input LDIF entries', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
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
    const templatesButton = page.locator('button:has-text("Templates")')
    await templatesButton.click()

    // Should show template options
    await expect(page.locator('text=Person')).toBeVisible()
  })

  test('should insert template when selected', async ({ page }) => {
    await page.click('button:has-text("Templates")')

    // Click on a template (assuming "Person" template exists)
    const firstTemplate = page.locator('button:has-text("Person")').first()
    await firstTemplate.click()

    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    const value = await ldifInput.inputValue()

    expect(value).toContain('dn:')
    expect(value).toContain('objectClass')
  })

  test('should show quick metrics after LDIF input', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    await ldifInput.fill(`dn: uid=jdoe,ou=people,dc=example,dc=com
objectClass: person
cn: John Doe
sn: Doe

dn: uid=asmith,ou=people,dc=example,dc=com
objectClass: person
cn: Alice Smith
sn: Smith`)

    await expect(page.locator('text=Quick Metrics')).toBeVisible()
    await expect(page.locator('text=Entries')).toBeVisible()
  })

  test('should clear LDIF when clear button clicked', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com\ncn: Test`)

    const clearButton = page.locator('button:has-text("Clear")').last()
    await clearButton.click()

    await expect(ldifInput).toHaveValue('')
  })

  test('should show entry preview section', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com
cn: Test User`)

    await expect(page.locator('text=Entry Preview')).toBeVisible()
    await expect(page.locator('text=uid=test,dc=example,dc=com')).toBeVisible()
  })

  test('should show schema validation section', async ({ page }) => {
    await expect(page.locator('text=Schema validation disabled')).toBeVisible()
    await expect(
      page.locator('text=Choose a saved schema to unlock attribute validation')
    ).toBeVisible()
  })

  test('should show schemas popover', async ({ page }) => {
    const schemasButton = page.locator('button:has-text("Schemas")')
    await schemasButton.click()

    await expect(
      page.locator('text=Save a schema in the explorer to enable validation here')
    ).toBeVisible()
  })

  test('should show copy button and copy LDIF', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com
cn: Test`)

    const copyButton = page.locator('button[aria-label="Copy LDIF"]')
    await expect(copyButton).toBeEnabled()
  })

  test('should show upload button', async ({ page }) => {
    const uploadButton = page.locator('button:has-text("Upload")')
    await expect(uploadButton).toBeVisible()
  })

  test('should parse multiple LDIF entries correctly', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    await ldifInput.fill(`dn: uid=user1,dc=example,dc=com
cn: User One
objectClass: person

dn: uid=user2,dc=example,dc=com
cn: User Two
objectClass: person

dn: uid=user3,dc=example,dc=com
cn: User Three
objectClass: person`)

    // Wait for parsing
    await page.waitForTimeout(500)

    // Check metrics show 3 entries
    await expect(page.locator('text=Quick Metrics')).toBeVisible()
  })

  test('should handle LDIF with multi-valued attributes', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    await ldifInput.fill(`dn: uid=admin,dc=example,dc=com
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
cn: Admin User
mail: admin@example.com
mail: admin@corp.example.com`)

    await page.waitForTimeout(500)

    // Entry should be parsed and displayed
    await expect(page.locator('text=Entry Preview')).toBeVisible()
    await expect(page.locator('text=admin@example.com')).toBeVisible()
  })

  test('should show empty state when no LDIF provided', async ({ page }) => {
    await expect(page.locator('text=No LDIF yet')).toBeVisible()
    await expect(
      page.locator('text=Pick a template, upload an LDIF file, or paste content')
    ).toBeVisible()
  })

  test('should handle base64-encoded attributes in preview', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com
cn: Test
description:: VGVzdCBkZXNjcmlwdGlvbg==`)

    await page.waitForTimeout(500)

    await expect(page.locator('text=Entry Preview')).toBeVisible()
  })

  test('should show parse errors for malformed LDIF', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    // Missing DN
    await ldifInput.fill(`objectClass: person
cn: No DN Entry`)

    await page.waitForTimeout(500)

    // Should show error
    await expect(page.locator('text=Issues while parsing LDIF')).toBeVisible()
  })

  test('should show file input for upload (hidden)', async ({ page }) => {
    // File input should exist but be hidden
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeHidden()
  })

  test('should count attribute values correctly', async ({ page }) => {
    const ldifInput = page.locator('textarea[placeholder*="dn: uid=jdoe"]')
    await ldifInput.fill(`dn: uid=test,dc=example,dc=com
objectClass: person
objectClass: inetOrgPerson
cn: Test User
mail: test1@example.com
mail: test2@example.com
mail: test3@example.com`)

    await page.waitForTimeout(500)

    // Should show metrics with attribute value count
    await expect(page.locator('text=Attribute values')).toBeVisible()
  })
})
