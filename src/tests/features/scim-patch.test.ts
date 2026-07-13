import { describe, expect, it } from 'bun:test'
import {
  SCIM_PATCH_OP_SCHEMA,
  buildScimPatch,
  isValidScimPath,
  validateScimPatch,
} from '@/features/scim/utils'

function diagnosticCodes(input: string): string[] {
  return validateScimPatch(input).diagnostics.map((diagnostic) => diagnostic.code)
}

describe('SCIM PATCH utilities', () => {
  it('exports the PatchOp schema URN', () => {
    expect(SCIM_PATCH_OP_SCHEMA).toBe('urn:ietf:params:scim:api:messages:2.0:PatchOp')
  })

  it('accepts add, remove, and replace operations', () => {
    const result = validateScimPatch(
      JSON.stringify({
        schemas: [SCIM_PATCH_OP_SCHEMA],
        Operations: [
          { op: 'add', path: 'members', value: [{ value: 'user-123' }] },
          { op: 'replace', path: 'name.givenName', value: 'Barbara' },
          { op: 'remove', path: 'emails[type eq "work"].value' },
        ],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.operations).toEqual([
      { op: 'add', path: 'members', value: [{ value: 'user-123' }] },
      { op: 'replace', path: 'name.givenName', value: 'Barbara' },
      { op: 'remove', path: 'emails[type eq "work"].value' },
    ])
  })

  it('supports schema-qualified and filtered paths', () => {
    expect(isValidScimPath('userName')).toBe(true)
    expect(isValidScimPath('name.givenName')).toBe(true)
    expect(isValidScimPath('members[value eq "user-123"]')).toBe(true)
    expect(
      isValidScimPath('urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager.value')
    ).toBe(true)
    expect(isValidScimPath('emails[type eq "work"].value')).toBe(true)
    expect(isValidScimPath('emails[]')).toBe(false)
    expect(isValidScimPath('emails[type maybe "work"]')).toBe(false)
    expect(isValidScimPath('name..givenName')).toBe(false)
  })

  it('rejects invalid documents, schemas, and empty operation lists', () => {
    expect(diagnosticCodes('{bad-json')).toContain('invalid_json')
    expect(diagnosticCodes('[]')).toContain('patch_type')
    expect(
      diagnosticCodes(
        JSON.stringify({ schemas: [], Operations: [{ op: 'remove', path: 'title' }] })
      )
    ).toContain('patch_schema_missing')
    expect(
      diagnosticCodes(JSON.stringify({ schemas: [SCIM_PATCH_OP_SCHEMA], Operations: [] }))
    ).toContain('operations_empty')
  })

  it('validates operation names and required path/value fields', () => {
    const result = validateScimPatch(
      JSON.stringify({
        schemas: [SCIM_PATCH_OP_SCHEMA],
        Operations: [
          { op: 'delete', path: 'title' },
          { op: 'remove' },
          { op: 'add', path: 'emails' },
          { op: 'replace', path: 'name..givenName', value: 'Barbara' },
        ],
      })
    )

    const codes = result.diagnostics.map((diagnostic) => diagnostic.code)
    expect(result.valid).toBe(false)
    expect(codes).toContain('operation_name_invalid')
    expect(codes).toContain('remove_path_required')
    expect(codes).toContain('operation_value_required')
    expect(codes).toContain('operation_path_syntax')
  })

  it('normalizes operation case with a warning', () => {
    const result = validateScimPatch(
      JSON.stringify({
        schemas: [SCIM_PATCH_OP_SCHEMA],
        Operations: [{ op: 'Replace', path: 'active', value: true }],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.operations[0]?.op).toBe('replace')
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ severity: 'warning', code: 'operation_name_case' })
    )
  })

  it('omits ignored values from normalized remove operations', () => {
    const result = validateScimPatch(
      JSON.stringify({
        schemas: [SCIM_PATCH_OP_SCHEMA],
        Operations: [{ op: 'remove', path: 'nickName', value: 'ignored' }],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.operations).toEqual([{ op: 'remove', path: 'nickName' }])
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ severity: 'warning', code: 'remove_value_ignored' })
    )
  })

  it('builds a canonical document and formatted JSON', () => {
    const result = buildScimPatch([
      { op: 'replace', path: ' active ', value: false },
      { op: 'add', value: { title: 'Tour Guide' } },
      { op: 'remove', path: 'nickName' },
    ])

    expect(result.document).toEqual({
      schemas: [SCIM_PATCH_OP_SCHEMA],
      Operations: [
        { op: 'replace', path: 'active', value: false },
        { op: 'add', value: { title: 'Tour Guide' } },
        { op: 'remove', path: 'nickName' },
      ],
    })
    expect(JSON.parse(result.json)).toEqual(result.document)
    expect(result.json).toContain('\n  "Operations"')
  })

  it('refuses to build empty or invalid operation sets', () => {
    expect(() => buildScimPatch([])).toThrow('At least one')
    expect(() => buildScimPatch([{ op: 'remove', path: 'emails[]' }])).toThrow('invalid SCIM path')
    expect(() =>
      buildScimPatch([{ op: 'replace', path: 'displayName', value: undefined }])
    ).toThrow('requires a value')
  })
})
