import { describe, expect, it } from 'bun:test'
import {
  SCIM_ENTERPRISE_USER_SCHEMA,
  SCIM_GROUP_SCHEMA,
  SCIM_USER_SCHEMA,
  validateScimResource,
} from '@/features/scim/utils'

function diagnosticCodes(input: string): string[] {
  return validateScimResource(input).diagnostics.map((diagnostic) => diagnostic.code)
}

describe('SCIM resource validation', () => {
  it('exports the standard resource schema URNs', () => {
    expect(SCIM_USER_SCHEMA).toBe('urn:ietf:params:scim:schemas:core:2.0:User')
    expect(SCIM_GROUP_SCHEMA).toBe('urn:ietf:params:scim:schemas:core:2.0:Group')
    expect(SCIM_ENTERPRISE_USER_SCHEMA).toBe(
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'
    )
  })

  it('accepts a User with common attributes and the Enterprise extension', () => {
    const resource = {
      schemas: [SCIM_USER_SCHEMA, SCIM_ENTERPRISE_USER_SCHEMA],
      id: '2819c223-7f76-453a-919d-413861904646',
      userName: 'bjensen@example.com',
      active: true,
      name: { givenName: 'Barbara', familyName: 'Jensen' },
      emails: [
        { value: 'bjensen@example.com', type: 'work', primary: true },
        { value: 'babs@example.org', type: 'home' },
      ],
      [SCIM_ENTERPRISE_USER_SCHEMA]: {
        employeeNumber: '701984',
        department: 'Tour Operations',
        manager: { value: '26118915-6090-4610-87e4-49d8ca9f808d' },
      },
    }

    const result = validateScimResource(JSON.stringify(resource))

    expect(result.valid).toBe(true)
    expect(result.resourceType).toBe('User')
    expect(result.parsed?.userName).toBe('bjensen@example.com')
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ severity: 'info', code: 'resource_type_detected' })
    )
  })

  it('accepts a Group with members', () => {
    const result = validateScimResource(
      JSON.stringify({
        schemas: [SCIM_GROUP_SCHEMA],
        displayName: 'Tour Guides',
        members: [
          {
            value: '2819c223-7f76-453a-919d-413861904646',
            display: 'Babs Jensen',
          },
        ],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.resourceType).toBe('Group')
  })

  it('rejects invalid JSON and non-object JSON', () => {
    expect(diagnosticCodes('{not-json')).toContain('invalid_json')
    expect(diagnosticCodes('[]')).toContain('resource_type')
    expect(diagnosticCodes('null')).toContain('resource_type')
  })

  it('requires schemas and the resource-specific display attribute', () => {
    const missingSchemas = validateScimResource(JSON.stringify({ userName: 'bjensen' }))
    expect(missingSchemas.valid).toBe(false)
    expect(missingSchemas.resourceType).toBe('Unknown')
    expect(missingSchemas.diagnostics.map((item) => item.code)).toContain('schemas_missing')

    expect(diagnosticCodes(JSON.stringify({ schemas: [SCIM_USER_SCHEMA] }))).toContain(
      'required_attribute_missing'
    )
    expect(diagnosticCodes(JSON.stringify({ schemas: [SCIM_GROUP_SCHEMA] }))).toContain(
      'required_attribute_missing'
    )
  })

  it('checks common, complex, and multi-valued attribute types', () => {
    const result = validateScimResource(
      JSON.stringify({
        schemas: [SCIM_USER_SCHEMA],
        userName: 'bjensen',
        active: 'yes',
        name: 'Barbara Jensen',
        emails: ['bjensen@example.com', { value: 123, primary: 'true' }],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ path: '$.active', code: 'attribute_type' })
    )
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ path: '$.name', code: 'complex_attribute_type' })
    )
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ path: '$.emails[0]', code: 'multi_valued_item_type' })
    )
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ path: '$.emails[1].primary', code: 'primary_type' })
    )
  })

  it('allows at most one primary value per multi-valued attribute', () => {
    const result = validateScimResource(
      JSON.stringify({
        schemas: [SCIM_USER_SCHEMA],
        userName: 'bjensen',
        emails: [
          { value: 'one@example.com', primary: true },
          { value: 'two@example.com', primary: true },
        ],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ path: '$.emails', code: 'multiple_primary_values' })
    )
  })

  it('enforces extension/schema consistency in both directions', () => {
    const missingObject = validateScimResource(
      JSON.stringify({
        schemas: [SCIM_USER_SCHEMA, SCIM_ENTERPRISE_USER_SCHEMA],
        userName: 'bjensen',
      })
    )
    expect(missingObject.diagnostics.map((item) => item.code)).toContain('extension_value_missing')

    const missingSchema = validateScimResource(
      JSON.stringify({
        schemas: [SCIM_USER_SCHEMA],
        userName: 'bjensen',
        [SCIM_ENTERPRISE_USER_SCHEMA]: { department: 'Operations' },
      })
    )
    expect(missingSchema.diagnostics.map((item) => item.code)).toContain('extension_schema_missing')

    const wrongResource = validateScimResource(
      JSON.stringify({
        schemas: [SCIM_GROUP_SCHEMA, SCIM_ENTERPRISE_USER_SCHEMA],
        displayName: 'Operations',
        [SCIM_ENTERPRISE_USER_SCHEMA]: { department: 'Operations' },
      })
    )
    expect(wrongResource.diagnostics.map((item) => item.code)).toContain('extension_resource_type')
  })

  it('requires a top-level extension object for every declared non-core schema URI', () => {
    const customSchema = 'urn:example:scim:schemas:custom:2.0:User'
    const missingObject = validateScimResource(
      JSON.stringify({
        schemas: [SCIM_USER_SCHEMA, customSchema],
        userName: 'bjensen',
      })
    )

    expect(missingObject.valid).toBe(false)
    expect(missingObject.diagnostics).toContainEqual(
      expect.objectContaining({
        path: `$[${JSON.stringify(customSchema)}]`,
        code: 'extension_value_missing',
      })
    )

    const matchingObject = validateScimResource(
      JSON.stringify({
        schemas: [SCIM_USER_SCHEMA, customSchema],
        userName: 'bjensen',
        [customSchema]: { accountTier: 'standard' },
      })
    )

    expect(matchingObject.valid).toBe(true)
    expect(matchingObject.diagnostics.map((item) => item.code)).not.toContain(
      'extension_value_missing'
    )
  })

  it('warns when meta.resourceType disagrees with schemas', () => {
    const result = validateScimResource(
      JSON.stringify({
        schemas: [SCIM_USER_SCHEMA],
        userName: 'bjensen',
        meta: { resourceType: 'Group' },
      })
    )

    expect(result.valid).toBe(true)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ severity: 'warning', code: 'meta_resource_type_mismatch' })
    )
  })
})
