const ATTRIBUTE_NAME_PATTERN = /^(?:[A-Za-z][A-Za-z0-9_-]*|\$ref)$/
const SCHEMA_URI_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/
const FILTER_PATTERN = new RegExp(
  '^(?:[A-Za-z][A-Za-z0-9_-]*|\\$ref)(?:\\.(?:[A-Za-z][A-Za-z0-9_-]*|\\$ref))?\\s+(pr|eq|ne|co|sw|ew|gt|ge|lt|le)(?:\\s+(.+))?$',
  'i'
)

function isValidValueFilter(filter: string): boolean {
  const match = FILTER_PATTERN.exec(filter)
  if (!match) return false
  if (match[1].toLowerCase() === 'pr') return match[2] === undefined
  if (match[2] === undefined) return false
  try {
    // SCIM comparison values use JSON strings, numbers, booleans, and null.
    // JSON.parse validates escapes, control characters, and number syntax.
    const value: unknown = JSON.parse(match[2])
    return value === null || ['string', 'number', 'boolean'].includes(typeof value)
  } catch {
    return false
  }
}

function findFilterEnd(path: string, start: number): number {
  let quoted = false
  for (let index = start + 1; index < path.length; index += 1) {
    const character = path[index]
    if (quoted && character === '\\') {
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (!quoted && character === '[') {
      return -1
    } else if (!quoted && character === ']') {
      return index
    }
  }
  return -1
}

function isAttributePath(value: string): boolean {
  let attributePath = value
  const lastColon = value.lastIndexOf(':')

  if (lastColon !== -1) {
    const schemaUri = value.slice(0, lastColon)
    attributePath = value.slice(lastColon + 1)

    if (!SCHEMA_URI_PATTERN.test(schemaUri)) {
      return false
    }
  }

  const segments = attributePath.split('.')
  return (
    segments.length >= 1 &&
    segments.length <= 2 &&
    segments.every((segment) => ATTRIBUTE_NAME_PATTERN.test(segment))
  )
}

/**
 * Performs a conservative syntax check for the SCIM attribute paths commonly
 * used by PATCH operations. It supports schema-qualified attributes, one
 * sub-attribute, and a simple RFC 7644 value filter.
 */
export function isValidScimPath(input: string): boolean {
  const path = input.trim()
  if (!path) return false

  const openBracket = path.indexOf('[')
  const closeBracket = openBracket === -1 ? path.indexOf(']') : findFilterEnd(path, openBracket)

  if (openBracket === -1 && closeBracket === -1) {
    return isAttributePath(path)
  }

  if (openBracket <= 0 || closeBracket <= openBracket + 1) {
    return false
  }

  const valuePath = path.slice(0, openBracket)
  const filter = path.slice(openBracket + 1, closeBracket).trim()
  const suffix = path.slice(closeBracket + 1)

  if (!isAttributePath(valuePath) || !isValidValueFilter(filter)) {
    return false
  }

  if (!suffix) return true
  if (!suffix.startsWith('.')) return false

  return ATTRIBUTE_NAME_PATTERN.test(suffix.slice(1))
}
