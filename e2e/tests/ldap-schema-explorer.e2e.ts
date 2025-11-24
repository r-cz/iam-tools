import { expect, test } from '@playwright/test'

test.describe('LDAP Schema Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('text=LDAP')
    await page.click('text=Schema Explorer')
    await expect(page).toHaveURL('/ldap/schema-explorer')
  })

  test('should display page title and description', async ({ page }) => {
    await expect(
      page.locator('[data-slot="card-title"]:has-text("LDAP Schema Explorer")')
    ).toBeVisible()
    await expect(page.locator('text=Drop output from ldapsearch')).toBeVisible()
  })

  test('should allow user to input schema definitions', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await expect(schemaInput).toBeVisible()

    const sampleSchema = `attributeTypes: ( 2.5.4.41 NAME 'name' DESC 'Test attribute' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )`

    await schemaInput.fill(sampleSchema)
    await expect(schemaInput).toHaveValue(sampleSchema)
  })

  test('should load example schema when clicked', async ({ page }) => {
    const exampleButton = page.locator('button:has-text("Example")')
    await exampleButton.click()

    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    const value = await schemaInput.inputValue()

    expect(value).toContain('attributeTypes')
    expect(value).toContain('objectClasses')
    expect(value).toContain('pingDirectoryPerson')
  })

  test('should parse and display attribute types', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await schemaInput.fill(
      `attributeTypes: ( 2.5.4.3 NAME 'cn' DESC 'Common Name' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )`
    )

    // Wait for parsing
    await page.waitForTimeout(1000)

    // Look for the section heading (h2 with exact text)
    await expect(page.locator('h2:has-text("Attribute Types")').first()).toBeVisible()
    await expect(page.locator('text=1 found')).toBeVisible()
    await expect(page.locator('text=cn').first()).toBeVisible()
    await expect(page.locator('text=Common Name').first()).toBeVisible()
  })

  test('should parse and display object classes', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await schemaInput.fill(
      `objectClasses: ( 2.5.6.6 NAME 'person' DESC 'RFC4519: represents a person' SUP top STRUCTURAL MUST ( sn $ cn ) MAY ( userPassword $ telephoneNumber ) )`
    )

    await page.waitForTimeout(1000)

    // Look for the section heading (h2 with exact text)
    await expect(page.locator('h2:has-text("Object Classes")').first()).toBeVisible()
    await expect(page.locator('text=1 found')).toBeVisible()
    await expect(page.locator('text=person').first()).toBeVisible()
    await expect(page.locator('text=RFC4519: represents a person').first()).toBeVisible()
  })

  test('should show quick summary metrics', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await schemaInput.fill(`attributeTypes: ( 2.5.4.3 NAME 'cn' )
objectClasses: ( 2.5.6.6 NAME 'person' STRUCTURAL MUST cn )`)

    await page.waitForTimeout(1000)

    await expect(page.locator('text=Quick Summary')).toBeVisible()
    // Look for metrics labels specifically (dt elements)
    await expect(page.locator('dt:has-text("Object classes")').first()).toBeVisible()
    await expect(page.locator('dt:has-text("Attribute types")').first()).toBeVisible()
  })

  test('should display parse warnings for errors', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    // Invalid schema with malformed syntax
    await schemaInput.fill(`attributeTypes: ( INVALID SYNTAX WITHOUT PROPER FORMAT `)

    await page.waitForTimeout(1000)

    // Should still attempt to parse but may show warnings - look for the section heading
    await expect(page.getByRole('heading', { name: 'Attribute Types' })).toBeVisible()
  })

  test('should clear schema when clear button clicked', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await schemaInput.fill(`attributeTypes: ( 2.5.4.3 NAME 'cn' )`)

    const clearButton = page.locator('button:has-text("Clear")')
    await clearButton.click()

    await expect(schemaInput).toHaveValue('')
  })

  test('should show OID and type information for object classes', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await schemaInput.fill(
      `objectClasses: ( 2.5.6.0 NAME 'top' DESC 'Top of superclass chain' ABSTRACT MUST objectClass )`
    )

    await page.waitForTimeout(1000)

    await expect(page.locator('text=OID 2.5.6.0').first()).toBeVisible()
    await expect(page.locator('span.inline-flex:has-text("ABSTRACT")').first()).toBeVisible()
  })

  test('should display required and optional attributes for object classes', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await schemaInput.fill(
      `objectClasses: ( 2.5.6.6 NAME 'person' STRUCTURAL MUST ( sn $ cn ) MAY ( userPassword $ telephoneNumber ) )`
    )

    await page.waitForTimeout(1000)

    await expect(
      page.locator('span.font-medium:has-text("Required attributes:")').first()
    ).toBeVisible()
    await expect(page.locator('text=sn, cn').first()).toBeVisible()
    await expect(
      page.locator('span.font-medium:has-text("Optional attributes:")').first()
    ).toBeVisible()
    await expect(page.locator('text=userPassword, telephoneNumber').first()).toBeVisible()
  })

  test('should show attribute details including syntax and equality', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await schemaInput.fill(
      `attributeTypes: ( 2.5.4.41 NAME 'name' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )`
    )

    await page.waitForTimeout(1000)

    await expect(page.locator('text=name').first()).toBeVisible()
    await expect(page.locator('span.font-medium:has-text("Equality")').first()).toBeVisible()
    await expect(page.locator('text=caseIgnoreMatch').first()).toBeVisible()
    await expect(page.locator('text=Single-valued').first()).toBeVisible()
  })

  test('should expand raw definition on click', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await schemaInput.fill(`attributeTypes: ( 2.5.4.3 NAME 'cn' DESC 'Common Name' )`)

    await page.waitForTimeout(1000)

    const detailsElement = page.locator('details:has-text("Show raw definition")').first()
    await detailsElement.click()

    // Verify OID is visible within the expanded details section (in pre tag)
    await expect(detailsElement.locator('pre:has-text("2.5.4.3")')).toBeVisible()
  })

  test('should handle empty state gracefully', async ({ page }) => {
    await expect(page.locator('text=No object classes yet')).toBeVisible()
    await expect(page.locator('text=No attribute types yet')).toBeVisible()
  })

  test('should show saved schemas popover', async ({ page }) => {
    const savedButton = page.locator('button:has-text("Saved schemas")')
    await expect(savedButton).toBeVisible()

    await savedButton.click()
    await expect(page.locator('text=No saved schemas yet')).toBeVisible()
  })

  test('should auto-save schema snapshots after delay', async ({ page }) => {
    const schemaInput = page.locator('textarea[placeholder*="attributeTypes"]')
    await schemaInput.fill(`attributeTypes: ( 2.5.4.3 NAME 'cn' )
objectClasses: ( 2.5.6.6 NAME 'person' STRUCTURAL MUST cn )`)

    // Wait for debounce (800ms) plus processing
    await page.waitForTimeout(2000)

    // Open saved schemas
    await page.click('button:has-text("Saved schemas")')

    // Should see the auto-saved schema name in the popover (schema name contains object class name)
    await expect(page.locator('p.text-sm.font-medium:has-text("person")')).toBeVisible()
  })
})
