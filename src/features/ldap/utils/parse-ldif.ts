export interface LdifAttribute {
  name: string
  options: string[]
  values: string[]
  rawLines: string[]
}

interface LdifRecordBase {
  sourceOrdinal: number
  dn: string
  lines: string[]
}

export interface LdifContentRecord extends LdifRecordBase {
  kind: 'content' | 'add'
  attributes: Record<string, LdifAttribute>
}

export interface LdifModifyOperation {
  operation: 'add' | 'delete' | 'replace'
  attribute: string
  options: string[]
  values: string[]
  rawLines: string[]
}

export interface LdifModifyRecord extends LdifRecordBase {
  kind: 'modify'
  modifications: LdifModifyOperation[]
}

export interface LdifDeleteRecord extends LdifRecordBase {
  kind: 'delete'
}

export type LdifRecord = LdifContentRecord | LdifModifyRecord | LdifDeleteRecord

export interface LdifParseResult {
  records: LdifRecord[]
  errors: string[]
}

function normalizeLines(input: string): string[] {
  const rawLines = input.replace(/\r\n?/g, '\n').split('\n')
  const unfolded: string[] = []
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1)
    } else unfolded.push(line)
  }
  return unfolded
}

function decodeValue(raw: string): string {
  const trimmed = raw.trimStart()
  if (trimmed.startsWith('::')) {
    const encoded = trimmed.slice(2).trim()
    try {
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
      return new TextDecoder().decode(bytes)
    } catch {
      throw new Error('Invalid base64 value')
    }
  }
  if (trimmed.startsWith(':<')) return trimmed.slice(2).trim()
  return trimmed.replace(/^:/, '').trimStart()
}

function parseAttributeLine(line: string) {
  const separator = line.indexOf(':')
  if (separator < 1) return null
  const [attribute, ...options] = line.slice(0, separator).trim().split(';')
  if (!attribute) return null
  return { attribute, options: options.filter(Boolean), value: decodeValue(line.slice(separator)) }
}

function ordinaryAttributes(
  lines: string[],
  errors: string[],
  ignored = new Set<string>()
): Record<string, LdifAttribute> {
  const attributes: Record<string, LdifAttribute> = {}
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#') || line.trim() === '-') continue
    let parsed: ReturnType<typeof parseAttributeLine>
    try {
      parsed = parseAttributeLine(line)
    } catch (error) {
      errors.push(`${error instanceof Error ? error.message : String(error)}: "${line}"`)
      continue
    }
    if (!parsed) {
      errors.push(`Could not parse line: "${line}"`)
      continue
    }
    const key = parsed.attribute.toLowerCase()
    if (ignored.has(key)) continue
    const existing = attributes[key]
    if (existing) {
      existing.values.push(parsed.value)
      existing.rawLines.push(line)
    } else {
      attributes[key] = {
        name: parsed.attribute,
        options: parsed.options,
        values: [parsed.value],
        rawLines: [line],
      }
    }
  }
  return attributes
}

function headerValue(lines: string[], name: string, errors: string[]): string | undefined {
  for (const line of lines) {
    let parsed: ReturnType<typeof parseAttributeLine>
    try {
      parsed = parseAttributeLine(line)
    } catch (error) {
      errors.push(`${error instanceof Error ? error.message : String(error)}: "${line}"`)
      return undefined
    }
    if (parsed?.attribute.toLowerCase() === name) return parsed.value
  }
  return undefined
}

function parseModify(lines: string[], base: LdifRecordBase, errors: string[]): LdifModifyRecord {
  const modifications: LdifModifyOperation[] = []
  const bodyStart =
    lines.findIndex((line) => parseAttributeLine(line)?.attribute.toLowerCase() === 'changetype') +
    1
  let block: string[] = []
  const flush = () => {
    const meaningful = block.filter((line) => line.trim() && !line.startsWith('#'))
    block = []
    if (meaningful.length === 0) return
    const declaration = parseAttributeLine(meaningful[0])
    const operation = declaration?.attribute.toLowerCase()
    if (
      !declaration ||
      (operation !== 'add' && operation !== 'delete' && operation !== 'replace')
    ) {
      errors.push(`Record ${base.sourceOrdinal}: Invalid modify operation declaration`)
      return
    }
    const target = declaration.value.toLowerCase()
    const values: string[] = []
    for (const line of meaningful.slice(1)) {
      const parsed = parseAttributeLine(line)
      if (!parsed || parsed.attribute.toLowerCase() !== target) {
        errors.push(
          `Record ${base.sourceOrdinal}: Modify value does not match ${declaration.value}`
        )
        continue
      }
      values.push(parsed.value)
    }
    modifications.push({
      operation,
      attribute: declaration.value,
      options: declaration.options,
      values,
      rawLines: meaningful,
    })
  }
  for (const line of lines.slice(Math.max(bodyStart, 0))) {
    if (line.trim() === '-') flush()
    else block.push(line)
  }
  flush()
  if (modifications.length === 0) errors.push(`Record ${base.sourceOrdinal}: No modify operations`)
  return { ...base, kind: 'modify', modifications }
}

function parseRecord(
  lines: string[],
  sourceOrdinal: number
): { record: LdifRecord | null; errors: string[] } {
  const errors: string[] = []
  const dn = headerValue(lines, 'dn', errors)
  if (!dn)
    return {
      record: null,
      errors: [...errors, `Record ${sourceOrdinal}: Missing distinguished name (dn)`],
    }
  const base = { sourceOrdinal, dn, lines }
  const changeType = headerValue(lines, 'changetype', errors)?.toLowerCase()
  if (!changeType) {
    return {
      record: {
        ...base,
        kind: 'content',
        attributes: ordinaryAttributes(lines, errors, new Set(['dn', 'control'])),
      },
      errors,
    }
  }
  if (changeType === 'add') {
    return {
      record: {
        ...base,
        kind: 'add',
        attributes: ordinaryAttributes(lines, errors, new Set(['dn', 'changetype', 'control'])),
      },
      errors,
    }
  }
  if (changeType === 'delete') return { record: { ...base, kind: 'delete' }, errors }
  if (changeType === 'modify') return { record: parseModify(lines, base, errors), errors }
  return {
    record: null,
    errors: [...errors, `Record ${sourceOrdinal}: Unsupported changetype ${changeType}`],
  }
}

export function parseLdif(input: string): LdifParseResult {
  const records: LdifRecord[] = []
  const errors: string[] = []
  if (!input.trim()) return { records, errors }
  let current: string[] = []
  let ordinal = 0
  const seenDns = new Map<string, number>()
  const flush = () => {
    if (current.length === 0) return
    ordinal++
    const result = parseRecord(current, ordinal)
    current = []
    errors.push(...result.errors)
    if (!result.record) return
    const dnKey = result.record.dn.toLowerCase()
    const first = seenDns.get(dnKey)
    if (first) errors.push(`Record ${ordinal}: Duplicate dn from record ${first}`)
    else seenDns.set(dnKey, ordinal)
    records.push(result.record)
  }
  for (const line of normalizeLines(input)) {
    if (!line.trim()) flush()
    else current.push(line)
  }
  flush()
  return { records, errors }
}
