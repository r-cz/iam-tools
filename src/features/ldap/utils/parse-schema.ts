export interface ParsedAttributeType {
  oid: string
  names: string[]
  description?: string
  syntax?: string
  equality?: string
  ordering?: string
  substr?: string
  singleValue: boolean
  collective: boolean
  noUserModification: boolean
  usage?: string
  superior?: string
  raw: string
}

export interface ParsedObjectClass {
  oid: string
  names: string[]
  description?: string
  kind?: 'ABSTRACT' | 'STRUCTURAL' | 'AUXILIARY'
  superior?: string[]
  must?: string[]
  may?: string[]
  raw: string
}

export interface ParsedSchema {
  attributeTypes: ParsedAttributeType[]
  objectClasses: ParsedObjectClass[]
  errors: string[]
}

const listPattern = (keyword: string) => new RegExp(`${keyword}\\s+\\(\\s*([^\\)]+)\\)`, 'i')
const singlePattern = (keyword: string) => new RegExp(`${keyword}\\s+'([^']+)'`, 'i')

function extractList(value: string, keyword: string): string[] | undefined {
  const listMatch = value.match(listPattern(keyword))
  if (listMatch) {
    return listMatch[1]
      .split(/\s*\$\s*/)
      .map((entry) => entry.replace(/['\s]/g, ''))
      .filter(Boolean)
  }

  const singleMatch = value.match(singlePattern(keyword))
  if (singleMatch) {
    return [singleMatch[1]]
  }

  return undefined
}

function extractFlag(value: string, keyword: string): boolean {
  const pattern = new RegExp(`\\b${keyword}\\b`, 'i')
  return pattern.test(value)
}

function extractToken(value: string, keyword: string): string | undefined {
  const pattern = new RegExp(`${keyword}\\s+([^\\s\\)]+)`, 'i')
  const match = value.match(pattern)
  if (match) {
    return match[1].replace(/[,\s]/g, '')
  }
  return undefined
}

function normalizeLines(input: string): string[] {
  const rawLines = input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.split('\u0000').join(''))

  const unfolded: string[] = []
  for (const line of rawLines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      const lastIndex = unfolded.length - 1
      if (lastIndex >= 0) {
        unfolded[lastIndex] += line.slice(1)
      }
    } else {
      unfolded.push(line)
    }
  }

  return unfolded
}

function parseAttributeType(value: string): ParsedAttributeType {
  const oidMatch = value.match(/\(\s*([^\s\)]+)/)
  const names = extractList(value, 'NAME') ?? []
  const description = value.match(/DESC\s+'([^']+)'/i)?.[1]
  const syntax = extractToken(value, 'SYNTAX')
  const equality = extractToken(value, 'EQUALITY')
  const ordering = extractToken(value, 'ORDERING')
  const substr = extractToken(value, 'SUBSTR')
  const usage = extractToken(value, 'USAGE')
  const superiorList = extractList(value, 'SUP')

  return {
    oid: oidMatch?.[1] ?? 'unknown',
    names,
    description,
    syntax,
    equality,
    ordering,
    substr,
    usage,
    superior: superiorList ? superiorList[0] : undefined,
    singleValue: extractFlag(value, 'SINGLE-VALUE'),
    collective: extractFlag(value, 'COLLECTIVE'),
    noUserModification: extractFlag(value, 'NO-USER-MODIFICATION'),
    raw: value.trim(),
  }
}

function parseObjectClass(value: string): ParsedObjectClass {
  const oidMatch = value.match(/\(\s*([^\s\)]+)/)
  const names = extractList(value, 'NAME') ?? []
  const description = value.match(/DESC\s+'([^']+)'/i)?.[1]
  const kindMatch = value.match(/(ABSTRACT|STRUCTURAL|AUXILIARY)/i)
  const superior = extractList(value, 'SUP')
  const must = extractList(value, 'MUST')
  const may = extractList(value, 'MAY')

  return {
    oid: oidMatch?.[1] ?? 'unknown',
    names,
    description,
    kind: kindMatch?.[1]?.toUpperCase() as ParsedObjectClass['kind'],
    superior,
    must,
    may,
    raw: value.trim(),
  }
}

export function parseLdapSchema(input: string): ParsedSchema {
  if (!input.trim()) {
    return { attributeTypes: [], objectClasses: [], errors: [] }
  }

  const lines = normalizeLines(input)
  const attributeTypes: ParsedAttributeType[] = []
  const objectClasses: ParsedObjectClass[] = []
  const errors: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith('#')) {
      continue
    }

    if (/^attributeTypes\s*:/i.test(line)) {
      const value = line.replace(/^attributeTypes\s*:/i, '').trim()
      if (value) {
        try {
          attributeTypes.push(parseAttributeType(value))
        } catch (error) {
          errors.push(
            `Failed to parse attribute type definition: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        }
      }
    } else if (/^objectClasses\s*:/i.test(line)) {
      const value = line.replace(/^objectClasses\s*:/i, '').trim()
      if (value) {
        try {
          objectClasses.push(parseObjectClass(value))
        } catch (error) {
          errors.push(
            `Failed to parse object class definition: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        }
      }
    }
  }

  return { attributeTypes, objectClasses, errors }
}
