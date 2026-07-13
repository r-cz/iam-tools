import { SCIM_ENTERPRISE_USER_SCHEMA, SCIM_GROUP_SCHEMA, SCIM_USER_SCHEMA } from './constants'
import type {
  ScimDiagnostic,
  ScimDiagnosticSeverity,
  ScimResourceType,
  ScimResourceValidationResult,
} from './types'

type ScimObject = Record<string, unknown>

const USER_STRING_ATTRIBUTES = [
  'displayName',
  'nickName',
  'profileUrl',
  'title',
  'userType',
  'preferredLanguage',
  'locale',
  'timezone',
  'password',
] as const

const COMMON_STRING_ATTRIBUTES = ['id', 'externalId'] as const

const USER_MULTI_VALUE_ATTRIBUTES = [
  'emails',
  'phoneNumbers',
  'ims',
  'photos',
  'addresses',
  'groups',
  'entitlements',
  'roles',
  'x509Certificates',
] as const

const NAME_SUB_ATTRIBUTES = [
  'formatted',
  'familyName',
  'givenName',
  'middleName',
  'honorificPrefix',
  'honorificSuffix',
] as const

const ADDRESS_SUB_ATTRIBUTES = [
  'formatted',
  'streetAddress',
  'locality',
  'region',
  'postalCode',
  'country',
] as const

const ENTERPRISE_STRING_ATTRIBUTES = [
  'employeeNumber',
  'costCenter',
  'organization',
  'division',
  'department',
] as const

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

function propertyPath(parent: string, property: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(property)
    ? `${parent}.${property}`
    : `${parent}[${JSON.stringify(property)}]`
}

function validateOptionalString(
  object: ScimObject,
  attribute: string,
  parentPath: string,
  diagnostics: ScimDiagnostic[],
  options: { nonEmpty?: boolean } = {}
): void {
  if (!hasOwn(object, attribute)) return

  const value = object[attribute]
  const path = propertyPath(parentPath, attribute)
  if (typeof value !== 'string') {
    diagnostic(diagnostics, 'error', path, 'attribute_type', `${attribute} must be a string.`)
    return
  }

  if (options.nonEmpty && !value.trim()) {
    diagnostic(
      diagnostics,
      'error',
      path,
      'required_attribute_empty',
      `${attribute} must not be empty.`
    )
  }
}

function validateRequiredString(
  object: ScimObject,
  attribute: string,
  diagnostics: ScimDiagnostic[]
): void {
  if (!hasOwn(object, attribute)) {
    diagnostic(
      diagnostics,
      'error',
      propertyPath('$', attribute),
      'required_attribute_missing',
      `${attribute} is required.`
    )
    return
  }

  validateOptionalString(object, attribute, '$', diagnostics, { nonEmpty: true })
}

function validateStringSubAttributes(
  object: ScimObject,
  attributes: readonly string[],
  parentPath: string,
  diagnostics: ScimDiagnostic[]
): void {
  for (const attribute of attributes) {
    validateOptionalString(object, attribute, parentPath, diagnostics)
  }
}

function validateComplexAttribute(
  resource: ScimObject,
  attribute: string,
  stringSubAttributes: readonly string[],
  diagnostics: ScimDiagnostic[]
): void {
  if (!hasOwn(resource, attribute)) return

  const path = propertyPath('$', attribute)
  const value = resource[attribute]
  if (!isObject(value)) {
    diagnostic(
      diagnostics,
      'error',
      path,
      'complex_attribute_type',
      `${attribute} must be an object.`
    )
    return
  }

  validateStringSubAttributes(value, stringSubAttributes, path, diagnostics)
}

function validateMultiValuedAttribute(
  resource: ScimObject,
  attribute: string,
  diagnostics: ScimDiagnostic[],
  options: { requireValue?: boolean; extraStringAttributes?: readonly string[] } = {}
): void {
  if (!hasOwn(resource, attribute)) return

  const path = propertyPath('$', attribute)
  const value = resource[attribute]
  if (!Array.isArray(value)) {
    diagnostic(
      diagnostics,
      'error',
      path,
      'multi_valued_attribute_type',
      `${attribute} must be an array.`
    )
    return
  }

  let primaryCount = 0
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isObject(item)) {
      diagnostic(
        diagnostics,
        'error',
        itemPath,
        'multi_valued_item_type',
        `${attribute} entries must be objects.`
      )
      return
    }

    const stringAttributes = [
      'value',
      'display',
      'type',
      '$ref',
      ...(options.extraStringAttributes ?? []),
    ]
    validateStringSubAttributes(item, stringAttributes, itemPath, diagnostics)

    if (
      options.requireValue &&
      (!hasOwn(item, 'value') || (typeof item.value === 'string' && !item.value.trim()))
    ) {
      diagnostic(
        diagnostics,
        'error',
        propertyPath(itemPath, 'value'),
        'multi_valued_value_missing',
        `${attribute} entries require a non-empty value.`
      )
    }

    if (hasOwn(item, 'primary')) {
      if (typeof item.primary !== 'boolean') {
        diagnostic(
          diagnostics,
          'error',
          propertyPath(itemPath, 'primary'),
          'primary_type',
          'primary must be a boolean.'
        )
      } else if (item.primary) {
        primaryCount += 1
      }
    }
  })

  if (primaryCount > 1) {
    diagnostic(
      diagnostics,
      'error',
      path,
      'multiple_primary_values',
      `${attribute} may contain at most one entry with primary set to true.`
    )
  }
}

function validateMeta(
  resource: ScimObject,
  resourceType: ScimResourceType,
  diagnostics: ScimDiagnostic[]
): void {
  if (!hasOwn(resource, 'meta')) return

  const meta = resource.meta
  if (!isObject(meta)) {
    diagnostic(diagnostics, 'error', '$.meta', 'meta_type', 'meta must be an object.')
    return
  }

  validateStringSubAttributes(
    meta,
    ['resourceType', 'created', 'lastModified', 'location', 'version'],
    '$.meta',
    diagnostics
  )

  for (const dateAttribute of ['created', 'lastModified'] as const) {
    const dateValue = meta[dateAttribute]
    if (typeof dateValue === 'string' && Number.isNaN(Date.parse(dateValue))) {
      diagnostic(
        diagnostics,
        'warning',
        propertyPath('$.meta', dateAttribute),
        'date_time_format',
        `${dateAttribute} should be an RFC 3339 date-time.`
      )
    }
  }

  if (
    resourceType !== 'Unknown' &&
    typeof meta.resourceType === 'string' &&
    meta.resourceType !== resourceType
  ) {
    diagnostic(
      diagnostics,
      'warning',
      '$.meta.resourceType',
      'meta_resource_type_mismatch',
      `meta.resourceType is ${meta.resourceType}, but schemas identify a ${resourceType}.`
    )
  }
}

function validateEnterpriseExtension(
  resource: ScimObject,
  schemas: readonly string[],
  resourceType: ScimResourceType,
  diagnostics: ScimDiagnostic[]
): void {
  const declared = schemas.includes(SCIM_ENTERPRISE_USER_SCHEMA)
  const present = hasOwn(resource, SCIM_ENTERPRISE_USER_SCHEMA)
  const extensionPath = propertyPath('$', SCIM_ENTERPRISE_USER_SCHEMA)

  if (declared && !present) {
    diagnostic(
      diagnostics,
      'error',
      extensionPath,
      'extension_value_missing',
      'The Enterprise User schema is declared, but its extension object is missing.'
    )
  }

  if (present && !declared) {
    diagnostic(
      diagnostics,
      'error',
      '$.schemas',
      'extension_schema_missing',
      'The Enterprise User extension is present, but its schema URN is not declared.'
    )
  }

  if ((declared || present) && resourceType !== 'User') {
    diagnostic(
      diagnostics,
      'error',
      extensionPath,
      'extension_resource_type',
      'The Enterprise User extension can only be used with User resources.'
    )
  }

  if (!present) return

  const extension = resource[SCIM_ENTERPRISE_USER_SCHEMA]
  if (!isObject(extension)) {
    diagnostic(
      diagnostics,
      'error',
      extensionPath,
      'extension_type',
      'The Enterprise User extension must be an object.'
    )
    return
  }

  validateStringSubAttributes(extension, ENTERPRISE_STRING_ATTRIBUTES, extensionPath, diagnostics)

  if (hasOwn(extension, 'manager')) {
    const managerPath = propertyPath(extensionPath, 'manager')
    if (!isObject(extension.manager)) {
      diagnostic(
        diagnostics,
        'error',
        managerPath,
        'complex_attribute_type',
        'manager must be an object.'
      )
    } else {
      validateStringSubAttributes(
        extension.manager,
        ['value', '$ref', 'displayName'],
        managerPath,
        diagnostics
      )
    }
  }
}

function validateExtensionConsistency(
  resource: ScimObject,
  schemas: readonly string[],
  diagnostics: ScimDiagnostic[]
): void {
  for (const [attribute, value] of Object.entries(resource)) {
    if (!attribute.startsWith('urn:') || attribute === SCIM_ENTERPRISE_USER_SCHEMA) continue

    const path = propertyPath('$', attribute)
    if (!schemas.includes(attribute)) {
      diagnostic(
        diagnostics,
        'error',
        '$.schemas',
        'extension_schema_missing',
        `Extension ${attribute} is present, but its schema URN is not declared.`
      )
    }
    if (!isObject(value)) {
      diagnostic(
        diagnostics,
        'error',
        path,
        'extension_type',
        `Extension ${attribute} must be an object.`
      )
    }
  }

  for (const schema of schemas) {
    if (
      schema !== SCIM_USER_SCHEMA &&
      schema !== SCIM_GROUP_SCHEMA &&
      schema !== SCIM_ENTERPRISE_USER_SCHEMA &&
      !hasOwn(resource, schema)
    ) {
      diagnostic(
        diagnostics,
        'error',
        propertyPath('$', schema),
        'extension_value_missing',
        `Extension schema ${schema} is declared, but its extension object is missing.`
      )
    }
  }
}

function parseSchemas(resource: ScimObject, diagnostics: ScimDiagnostic[]): string[] {
  if (!hasOwn(resource, 'schemas')) {
    diagnostic(diagnostics, 'error', '$.schemas', 'schemas_missing', 'schemas is required.')
    return []
  }

  if (!Array.isArray(resource.schemas)) {
    diagnostic(
      diagnostics,
      'error',
      '$.schemas',
      'schemas_type',
      'schemas must be an array of schema URN strings.'
    )
    return []
  }

  if (resource.schemas.length === 0) {
    diagnostic(
      diagnostics,
      'error',
      '$.schemas',
      'schemas_empty',
      'schemas must contain at least one schema URN.'
    )
  }

  const schemas: string[] = []
  const seen = new Set<string>()
  resource.schemas.forEach((schema, index) => {
    const path = `$.schemas[${index}]`
    if (typeof schema !== 'string' || !schema.trim()) {
      diagnostic(
        diagnostics,
        'error',
        path,
        'schema_uri_type',
        'Each schemas entry must be a non-empty string.'
      )
      return
    }

    const normalized = schema.trim()
    schemas.push(normalized)
    if (seen.has(normalized)) {
      diagnostic(
        diagnostics,
        'warning',
        path,
        'duplicate_schema',
        `Schema ${normalized} is declared more than once.`
      )
    }
    seen.add(normalized)
  })

  return schemas
}

function determineResourceType(
  schemas: readonly string[],
  diagnostics: ScimDiagnostic[]
): ScimResourceType {
  const hasUser = schemas.includes(SCIM_USER_SCHEMA)
  const hasGroup = schemas.includes(SCIM_GROUP_SCHEMA)

  if (hasUser && hasGroup) {
    diagnostic(
      diagnostics,
      'error',
      '$.schemas',
      'multiple_core_schemas',
      'A resource cannot declare both the core User and Group schemas.'
    )
    return 'Unknown'
  }

  if (!hasUser && !hasGroup) {
    diagnostic(
      diagnostics,
      'error',
      '$.schemas',
      'core_schema_missing',
      'schemas must declare either the core User or Group schema.'
    )
    return 'Unknown'
  }

  const resourceType: ScimResourceType = hasUser ? 'User' : 'Group'
  diagnostic(
    diagnostics,
    'info',
    '$.schemas',
    'resource_type_detected',
    `Detected a SCIM ${resourceType} resource.`
  )
  return resourceType
}

function validateUser(resource: ScimObject, diagnostics: ScimDiagnostic[]): void {
  validateRequiredString(resource, 'userName', diagnostics)

  for (const attribute of COMMON_STRING_ATTRIBUTES) {
    validateOptionalString(resource, attribute, '$', diagnostics)
  }
  for (const attribute of USER_STRING_ATTRIBUTES) {
    validateOptionalString(resource, attribute, '$', diagnostics)
  }

  if (hasOwn(resource, 'active') && typeof resource.active !== 'boolean') {
    diagnostic(diagnostics, 'error', '$.active', 'attribute_type', 'active must be a boolean.')
  }

  validateComplexAttribute(resource, 'name', NAME_SUB_ATTRIBUTES, diagnostics)
  for (const attribute of USER_MULTI_VALUE_ATTRIBUTES) {
    validateMultiValuedAttribute(resource, attribute, diagnostics, {
      extraStringAttributes: attribute === 'addresses' ? ADDRESS_SUB_ATTRIBUTES : undefined,
    })
  }
}

function validateGroup(resource: ScimObject, diagnostics: ScimDiagnostic[]): void {
  validateRequiredString(resource, 'displayName', diagnostics)
  for (const attribute of COMMON_STRING_ATTRIBUTES) {
    validateOptionalString(resource, attribute, '$', diagnostics)
  }
  validateMultiValuedAttribute(resource, 'members', diagnostics, { requireValue: true })
}

/** Validate a SCIM User or Group resource represented as JSON text. */
export function validateScimResource(input: string): ScimResourceValidationResult {
  const diagnostics: ScimDiagnostic[] = []
  if (!input.trim()) {
    diagnostic(diagnostics, 'error', '$', 'empty_input', 'Enter a SCIM resource as JSON.')
    return { valid: false, resourceType: 'Unknown', parsed: null, diagnostics }
  }

  let value: unknown
  try {
    value = JSON.parse(input)
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : ''
    diagnostic(diagnostics, 'error', '$', 'invalid_json', `Input is not valid JSON.${detail}`)
    return { valid: false, resourceType: 'Unknown', parsed: null, diagnostics }
  }

  if (!isObject(value)) {
    diagnostic(diagnostics, 'error', '$', 'resource_type', 'A SCIM resource must be a JSON object.')
    return { valid: false, resourceType: 'Unknown', parsed: null, diagnostics }
  }

  const schemas = parseSchemas(value, diagnostics)
  const resourceType = determineResourceType(schemas, diagnostics)

  if (resourceType === 'User') validateUser(value, diagnostics)
  if (resourceType === 'Group') validateGroup(value, diagnostics)

  validateMeta(value, resourceType, diagnostics)
  validateEnterpriseExtension(value, schemas, resourceType, diagnostics)
  validateExtensionConsistency(value, schemas, diagnostics)

  return {
    valid: !diagnostics.some((item) => item.severity === 'error'),
    resourceType,
    parsed: value,
    diagnostics,
  }
}
