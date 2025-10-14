export interface LdifAttribute {
  name: string
  options: string[]
  values: string[]
  rawLines: string[]
}

export interface LdifEntry {
  dn: string
  attributes: Record<string, LdifAttribute>
  lines: string[]
}

export interface LdifParseResult {
  entries: LdifEntry[]
  errors: string[]
}

function normalizeLines(input: string): string[] {
  const rawLines = input.replace(/\r\n?/g, '\n').split('\n')
  const unfolded: string[] = []

  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1)
    } else {
      unfolded.push(line)
    }
  }

  return unfolded
}

function decodeValue(raw: string): string {
  const trimmed = raw.trimStart()

  if (trimmed.startsWith('::')) {
    const base64Value = trimmed.slice(2).trim()
    try {
      if (typeof atob === 'function') {
        return atob(base64Value)
      }
    } catch (error) {
      console.warn('Failed to decode base64 LDIF value', error)
    }
    return base64Value
  }

  if (trimmed.startsWith(':<')) {
    // URL reference – leave as-is for display
    return trimmed.slice(2).trim()
  }

  return trimmed.replace(/^:/, '').trimStart()
}

function parseAttributeLine(
  line: string
): { attribute: string; value: string; options: string[] } | null {
  const separatorIndex = line.indexOf(':')
  if (separatorIndex === -1) {
    return null
  }

  const attrToken = line.slice(0, separatorIndex).trim()
  if (!attrToken) {
    return null
  }

  const [attribute, ...optionParts] = attrToken.split(';')
  const options = optionParts.filter(Boolean)

  const rawValue = line.slice(separatorIndex)
  const value = decodeValue(rawValue)

  return { attribute, value, options }
}

function buildEntry(lines: string[]): { entry: LdifEntry | null; errors: string[] } {
  const errors: string[] = []
  const attributes: Record<string, LdifAttribute> = {}
  let dn = ''

  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) {
      continue
    }

    const parsed = parseAttributeLine(line)
    if (!parsed) {
      errors.push(`Could not parse line: "${line}"`)
      continue
    }

    const { attribute, value, options } = parsed
    const key = attribute.toLowerCase()

    if (key === 'dn') {
      dn = value
      continue
    }

    if (!attributes[key]) {
      attributes[key] = {
        name: attribute,
        options,
        values: [value],
        rawLines: [line],
      }
    } else {
      attributes[key].values.push(value)
      attributes[key].rawLines.push(line)
    }
  }

  if (!dn) {
    errors.push('Entry is missing a distinguished name (dn)')
    return { entry: null, errors }
  }

  return {
    entry: {
      dn,
      attributes,
      lines,
    },
    errors,
  }
}

export function parseLdif(input: string): LdifParseResult {
  if (!input.trim()) {
    return { entries: [], errors: [] }
  }

  const lines = normalizeLines(input)
  const entries: LdifEntry[] = []
  const errors: string[] = []

  let currentLines: string[] = []

  const flush = () => {
    if (currentLines.length === 0) {
      return
    }
    const { entry, errors: entryErrors } = buildEntry(currentLines)
    if (entry) {
      entries.push(entry)
    }
    errors.push(...entryErrors)
    currentLines = []
  }

  for (const line of lines) {
    if (!line.trim()) {
      flush()
    } else {
      currentLines.push(line)
    }
  }

  flush()

  return { entries, errors }
}
