import { expect, test } from '@playwright/test'
import { selectors } from '../helpers/selectors'

test.describe('LDAP Schema Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ldap/schema-explorer')
    await expect(page).toHaveURL('/ldap/schema-explorer')
  })

  test('should display page title and description', async ({ page }) => {
    await expect(
      page.locator('[data-slot="card-title"]:has-text("LDAP Schema Explorer")')
    ).toBeVisible()
    await expect(page.locator('text=Visualize LDAP schema definitions')).toBeVisible()
  })

  test('should allow user to input schema definitions', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await expect(schemaInput).toBeVisible()

    const sampleSchema = `attributeTypes: ( 2.5.4.41 NAME 'name' DESC 'Test attribute' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )`

    await schemaInput.fill(sampleSchema)
    await expect(schemaInput).toHaveValue(sampleSchema)
  })

  test('should load built-in schema when clicked', async ({ page }) => {
    await page.click(selectors.ldap.schemaBuiltInButton)
    await page.click('button:has-text("PingDirectory")')

    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await expect(schemaInput).toHaveValue(/attributeTypes/)
    await expect(schemaInput).toHaveValue(/objectClasses/)
    await expect(schemaInput).toHaveValue(/pingDirectoryPerson/)
  })

  test('should parse and display attribute types', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(
      `attributeTypes: ( 2.5.4.3 NAME 'cn' DESC 'Common Name' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )`
    )

    await expect(page.locator('h2:has-text("Attribute Types")').first()).toBeVisible()
    await expect(page.locator('text=1 found')).toBeVisible()
    await expect(page.locator('text=cn').first()).toBeVisible()
    await expect(page.locator('text=Common Name').first()).toBeVisible()
  })

  test('should parse and display object classes', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(
      `objectClasses: ( 2.5.6.6 NAME 'person' DESC 'RFC4519: represents a person' SUP top STRUCTURAL MUST ( sn $ cn ) MAY ( userPassword $ telephoneNumber ) )`
    )

    await expect(page.locator('h2:has-text("Object Classes")').first()).toBeVisible()
    await expect(page.locator('text=1 found')).toBeVisible()
    await expect(page.locator('text=person').first()).toBeVisible()
    await expect(page.locator('text=RFC4519: represents a person').first()).toBeVisible()
  })

  test('should show quick summary metrics', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(`attributeTypes: ( 2.5.4.3 NAME 'cn' )
objectClasses: ( 2.5.6.6 NAME 'person' STRUCTURAL MUST cn )`)

    await expect(page.locator('text=Quick Summary')).toBeVisible()
    await expect(page.locator('dt:has-text("Object classes")').first()).toBeVisible()
    await expect(page.locator('dt:has-text("Attribute types")').first()).toBeVisible()
  })

  test('should display parse warnings for errors', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(`attributeTypes: ( INVALID SYNTAX WITHOUT PROPER FORMAT `)

    await expect(page.getByRole('heading', { name: 'Attribute Types' })).toBeVisible()
  })

  test('should clear schema when clear button clicked', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(`attributeTypes: ( 2.5.4.3 NAME 'cn' )`)

    await page.click(selectors.ldap.schemaClearButton)
    await expect(schemaInput).toHaveValue('')
  })

  test('should show OID and type information for object classes', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(
      `objectClasses: ( 2.5.6.0 NAME 'top' DESC 'Top of superclass chain' ABSTRACT MUST objectClass )`
    )

    await expect(page.locator('span.font-mono:has-text("2.5.6.0")').first()).toBeVisible()
    await expect(page.locator('text=ABSTRACT').first()).toBeVisible()
  })

  test('should display required and optional attributes for object classes', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(
      `objectClasses: ( 2.5.6.6 NAME 'person' STRUCTURAL MUST ( sn $ cn ) MAY ( userPassword $ telephoneNumber ) )`
    )

    await expect(page.locator('span.font-medium:has-text("Required:")').first()).toBeVisible()
    await expect(page.locator('text=sn, cn').first()).toBeVisible()
    await expect(page.locator('span.font-medium:has-text("Optional:")').first()).toBeVisible()
    await expect(page.locator('text=userPassword, telephoneNumber').first()).toBeVisible()
  })

  test('should show attribute details including syntax and equality', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(
      `attributeTypes: ( 2.5.4.41 NAME 'name' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )`
    )

    await expect(page.locator('text=name').first()).toBeVisible()
    await expect(page.locator('span.font-medium:has-text("Equality")').first()).toBeVisible()
    await expect(page.locator('text=caseIgnoreMatch').first()).toBeVisible()
    await expect(page.locator('text=Single-valued').first()).toBeVisible()
  })

  test('should expand raw definition on click', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(`attributeTypes: ( 2.5.4.3 NAME 'cn' DESC 'Common Name' )`)

    const detailsElement = page.locator('details:has-text("Raw definition")').first()
    await detailsElement.click()

    await expect(detailsElement.locator('pre:has-text("2.5.4.3")')).toBeVisible()
  })

  test('should handle empty state gracefully', async ({ page }) => {
    await expect(page.locator('text=No object classes yet')).toBeVisible()
    await expect(page.locator('text=No attribute types yet')).toBeVisible()
  })

  test('should show saved schemas popover', async ({ page }) => {
    await expect(page.locator(selectors.ldap.schemaSavedButton)).toBeVisible()

    await page.click(selectors.ldap.schemaSavedButton)
    await expect(page.locator('text=No saved schemas yet')).toBeVisible()
  })

  test('should save schema with custom name via save dialog', async ({ page }) => {
    const schemaInput = page.locator(selectors.ldap.schemaInput)
    await schemaInput.fill(`attributeTypes: ( 2.5.4.3 NAME 'cn' )
objectClasses: ( 2.5.6.6 NAME 'person' STRUCTURAL MUST cn )`)

    await page.click(selectors.ldap.schemaSaveButton)

    await expect(page.getByRole('heading', { name: 'Save Schema' })).toBeVisible()

    const nameInput = page.locator('#schema-name')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue('person')

    await page.getByRole('button', { name: 'Save Schema' }).click()

    await page.click(selectors.ldap.schemaSavedButton)
    await expect(page.locator('p.text-sm.font-medium:has-text("person")')).toBeVisible()
  })
})
