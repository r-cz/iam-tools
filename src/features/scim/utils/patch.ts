import { SCIM_PATCH_OP_SCHEMA } from './constants'
import { isValidScimPath } from './path'
import type {
  ScimDiagnostic,
  ScimDiagnosticSeverity,
  ScimPatchBuildResult,
  ScimPatchDocument,
  ScimPatchOperation,
  ScimPatchOperationInput,
  ScimPatchOperationName,
  ScimPatchValidationResult,
} from './types'

type ScimObject = Record<string, unknown>

const ALLOWED_OPERATIONS = new Set<ScimPatchOperationName>(['add', 'remove', 'replace'])

function isObject(value: unknown): value is ScimObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(object: ScimObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function diagnostic(
  diagnostics: ScimDiagnostic[],
  severity: ScimDiagnosticSeverity,
  path: string,
  code: string,
  message: string
): void {
  diagnostics.push({ severity, path, code, message })
}

function parsePatchSchemas(patch: ScimObject, diagnostics: ScimDiagnostic[]): void {
  if (!hasOwn(patch, 'schemas')) {
    diagnostic(
      diagnostics,
      'error',
      '$.schemas',
      'schemas_missing',
      'PATCH documents require a schemas array.'
    )
    return
  }

  if (!Array.isArray(patch.schemas)) {
    diagnostic(
      diagnostics,
      'error',
      '$.schemas',
      'schemas_type',
      'schemas must be an array of strings.'
    )
    return
  }

  const patchSchemaCount = patch.schemas.filter((schema) => schema === SCIM_PATCH_OP_SCHEMA).length
  if (patchSchemaCount === 0) {
    diagnostic(
      diagnostics,
      'error',
      '$.schemas',
      'patch_schema_missing',
      `schemas must include ${SCIM_PATCH_OP_SCHEMA}.`
    )
  } else if (patchSchemaCount > 1) {
    diagnostic(
      diagnostics,
      'warning',
      '$.schemas',
      'duplicate_schema',
      'The PatchOp schema is declared more than once.'
    )
  }

  patch.schemas.forEach((schema, index) => {
    if (typeof schema !== 'string' || !schema.trim()) {
      diagnostic(
        diagnostics,
        'error',
        `$.schemas[${index}]`,
        'schema_uri_type',
        'Each schemas entry must be a non-empty string.'
      )
    } else if (schema !== SCIM_PATCH_OP_SCHEMA) {
      diagnostic(
        diagnostics,
        'warning',
        `$.schemas[${index}]`,
        'unexpected_patch_schema',
        `PATCH documents normally declare only ${SCIM_PATCH_OP_SCHEMA}.`
      )
    }
  })
}

function normalizeOperation(
  value: unknown,
  index: number,
  diagnostics: ScimDiagnostic[]
): ScimPatchOperation | null {
  const operationPath = `$.Operations[${index}]`
  if (!isObject(value)) {
    diagnostic(
      diagnostics,
      'error',
      operationPath,
      'operation_type',
      'Each PATCH operation must be an object.'
    )
    return null
  }

  if (typeof value.op !== 'string') {
    diagnostic(
      diagnostics,
      'error',
      `${operationPath}.op`,
      'operation_name_missing',
      'op must be add, remove, or replace.'
    )
    return null
  }

  const op = value.op.toLowerCase() as ScimPatchOperationName
  if (!ALLOWED_OPERATIONS.has(op)) {
    diagnostic(
      diagnostics,
      'error',
      `${operationPath}.op`,
      'operation_name_invalid',
      `Unsupported PATCH operation ${value.op}. Use add, remove, or replace.`
    )
    return null
  }

  if (value.op !== op) {
    diagnostic(
      diagnostics,
      'warning',
      `${operationPath}.op`,
      'operation_name_case',
      `Use lowercase ${op} for a canonical PATCH document.`
    )
  }

  let path: string | undefined
  if (hasOwn(value, 'path')) {
    if (typeof value.path !== 'string' || !value.path.trim()) {
      diagnostic(
        diagnostics,
        'error',
        `${operationPath}.path`,
        'operation_path_type',
        'path must be a non-empty string when provided.'
      )
    } else {
      path = value.path.trim()
      if (!isValidScimPath(path)) {
        diagnostic(
          diagnostics,
          'error',
          `${operationPath}.path`,
          'operation_path_syntax',
          `Invalid SCIM attribute path: ${path}.`
        )
      }
    }
  }

  if (op === 'remove' && !path) {
    diagnostic(
      diagnostics,
      'error',
      `${operationPath}.path`,
      'remove_path_required',
      'remove operations require a path.'
    )
  }

  const hasValue = hasOwn(value, 'value') && value.value !== undefined
  if ((op === 'add' || op === 'replace') && !hasValue) {
    diagnostic(
      diagnostics,
      'error',
      `${operationPath}.value`,
      'operation_value_required',
      `${op} operations require a value.`
    )
  }

  if (op === 'remove' && hasValue) {
    diagnostic(
      diagnostics,
      'warning',
      `${operationPath}.value`,
      'remove_value_ignored',
      'remove operations do not use value; it will be ignored by the canonical builder.'
    )
  }

  return {
    op,
    ...(path ? { path } : {}),
    ...(op !== 'remove' && hasValue ? { value: value.value } : {}),
  }
}

/** Validate an RFC 7644 PATCH request represented as JSON text. */
export function validateScimPatch(input: string): ScimPatchValidationResult {
  const diagnostics: ScimDiagnostic[] = []
  if (!input.trim()) {
    diagnostic(diagnostics, 'error', '$', 'empty_input', 'Enter a SCIM PATCH document as JSON.')
    return { valid: false, parsed: null, operations: [], diagnostics }
  }

  let value: unknown
  try {
    value = JSON.parse(input)
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : ''
    diagnostic(diagnostics, 'error', '$', 'invalid_json', `Input is not valid JSON.${detail}`)
    return { valid: false, parsed: null, operations: [], diagnostics }
  }

  if (!isObject(value)) {
    diagnostic(
      diagnostics,
      'error',
      '$',
      'patch_type',
      'A SCIM PATCH document must be a JSON object.'
    )
    return { valid: false, parsed: null, operations: [], diagnostics }
  }

  parsePatchSchemas(value, diagnostics)

  const operations: ScimPatchOperation[] = []
  if (!hasOwn(value, 'Operations')) {
    diagnostic(
      diagnostics,
      'error',
      '$.Operations',
      'operations_missing',
      'Operations is required.'
    )
  } else if (!Array.isArray(value.Operations)) {
    diagnostic(
      diagnostics,
      'error',
      '$.Operations',
      'operations_type',
      'Operations must be an array.'
    )
  } else if (value.Operations.length === 0) {
    diagnostic(
      diagnostics,
      'error',
      '$.Operations',
      'operations_empty',
      'Operations must contain at least one operation.'
    )
  } else {
    value.Operations.forEach((operation, index) => {
      const normalized = normalizeOperation(operation, index, diagnostics)
      if (normalized) operations.push(normalized)
    })
    diagnostic(
      diagnostics,
      'info',
      '$.Operations',
      'operation_count',
      `Parsed ${value.Operations.length} PATCH operation${value.Operations.length === 1 ? '' : 's'}.`
    )
  }

  return {
    valid: !diagnostics.some((item) => item.severity === 'error'),
    parsed: value,
    operations,
    diagnostics,
  }
}

/** Build a validated, canonical RFC 7644 PATCH document and formatted JSON. */
export function buildScimPatch(
  operations: readonly ScimPatchOperationInput[]
): ScimPatchBuildResult {
  if (operations.length === 0) {
    throw new RangeError('At least one SCIM PATCH operation is required.')
  }

  const canonicalOperations: ScimPatchOperation[] = operations.map((operation, index) => {
    const op = operation.op
    if (!ALLOWED_OPERATIONS.has(op)) {
      throw new TypeError(`Operation ${index + 1} has an unsupported op.`)
    }

    const path = operation.path?.trim()
    if (operation.path !== undefined && !path) {
      throw new TypeError(`Operation ${index + 1} has an empty path.`)
    }
    if (path && !isValidScimPath(path)) {
      throw new TypeError(`Operation ${index + 1} has an invalid SCIM path: ${path}.`)
    }
    if (op === 'remove' && !path) {
      throw new TypeError(`Remove operation ${index + 1} requires a path.`)
    }
    if ((op === 'add' || op === 'replace') && operation.value === undefined) {
      throw new TypeError(`${op} operation ${index + 1} requires a value.`)
    }

    return {
      op,
      ...(path ? { path } : {}),
      ...(op !== 'remove' ? { value: operation.value } : {}),
    }
  })

  const document: ScimPatchDocument = {
    schemas: [SCIM_PATCH_OP_SCHEMA],
    Operations: canonicalOperations,
  }

  return {
    document,
    json: JSON.stringify(document, null, 2),
  }
}
