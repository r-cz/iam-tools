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

export interface ScimPatchOperation {
  op: ScimPatchOperationName
  path?: string
  value?: unknown
}

export type ScimPatchOperationInput =
  | { op: 'add' | 'replace'; path?: string; value: unknown }
  | { op: 'remove'; path: string; value?: never }

export interface ScimPatchDocument {
  schemas: string[]
  Operations: ScimPatchOperation[]
}

export interface ScimPatchValidationResult {
  valid: boolean
  parsed: Record<string, unknown> | null
  operations: ScimPatchOperation[]
  diagnostics: ScimDiagnostic[]
}

export interface ScimPatchBuildResult {
  document: ScimPatchDocument
  json: string
}
