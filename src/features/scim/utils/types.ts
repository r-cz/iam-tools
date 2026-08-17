export type ScimDiagnosticSeverity = 'error' | 'warning' | 'info'

export interface ScimDiagnostic {
  severity: ScimDiagnosticSeverity
  path: string
  message: string
  code: string
}

export type ScimResourceType = 'User' | 'Group' | 'Unknown'

export interface ScimResourceValidationResult {
  valid: boolean
  resourceType: ScimResourceType
  parsed: Record<string, unknown> | null
  diagnostics: ScimDiagnostic[]
}

export type ScimPatchOperationName = 'add' | 'remove' | 'replace'

export type ScimPatchOperation =
  { op: 'add' | 'replace'; path?: string; value: unknown } | { op: 'remove'; path: string }

export type ScimPatchOperationInput =
  | { op: 'add' | 'replace'; path?: string; value: unknown }
  | { op: 'remove'; path: string; value?: never }

export interface ScimPatchDocument {
  schemas: [typeof SCIM_PATCH_OP_SCHEMA]
  Operations: ScimPatchOperation[]
}

export type ScimPatchValidationResult =
  | {
      valid: true
      parsed: Record<string, unknown>
      operations: ScimPatchOperation[]
      diagnostics: ScimDiagnostic[]
    }
  | {
      valid: false
      parsed: Record<string, unknown> | null
      diagnostics: ScimDiagnostic[]
    }

export interface ScimPatchBuildResult {
  document: ScimPatchDocument
  json: string
}
import type { SCIM_PATCH_OP_SCHEMA } from './constants'
