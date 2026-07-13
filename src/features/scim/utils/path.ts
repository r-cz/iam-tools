const ATTRIBUTE_NAME_PATTERN = /^(?:[A-Za-z][A-Za-z0-9_-]*|\$ref)$/
const SCHEMA_URI_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/
const FILTER_VALUE_PATTERN = '(?:"(?:[^"\\\\]|\\\\.)*"|true|false|null|-?\\d+(?:\\.\\d+)?)'
const FILTER_PATTERN = new RegExp(
  `^(?:[A-Za-z][A-Za-z0-9_-]*|\\$ref)(?:\\.(?:[A-Za-z][A-Za-z0-9_-]*|\\$ref))?\\s+(?:pr|(?:eq|ne|co|sw|ew|gt|ge|lt|le)\\s+${FILTER_VALUE_PATTERN})$`,
  'i'
)

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
  const closeBracket = path.lastIndexOf(']')

  if (openBracket === -1 && closeBracket === -1) {
    return isAttributePath(path)
  }

  if (
    openBracket <= 0 ||
    closeBracket <= openBracket + 1 ||
    path.indexOf('[', openBracket + 1) !== -1 ||
    path.indexOf(']', closeBracket + 1) !== -1
  ) {
    return false
  }

  const valuePath = path.slice(0, openBracket)
  const filter = path.slice(openBracket + 1, closeBracket).trim()
  const suffix = path.slice(closeBracket + 1)

  if (!isAttributePath(valuePath) || !FILTER_PATTERN.test(filter)) {
    return false
  }

  if (!suffix) return true
  if (!suffix.startsWith('.')) return false

  return ATTRIBUTE_NAME_PATTERN.test(suffix.slice(1))
}
