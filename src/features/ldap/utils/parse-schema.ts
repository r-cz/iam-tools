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
  kind: 'ABSTRACT' | 'STRUCTURAL' | 'AUXILIARY'
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

type Token = { kind: 'atom' | 'string' | 'lparen' | 'rparen' | 'dollar'; value: string }

function normalizeLines(input: string): string[] {
  const rawLines = input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replaceAll('\u0000', ''))
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

function tokenize(value: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  while (index < value.length) {
    const character = value[index]
    if (/\s/.test(character)) {
      index++
      continue
    }
    if (character === '(' || character === ')' || character === '$') {
      tokens.push({
        kind: character === '(' ? 'lparen' : character === ')' ? 'rparen' : 'dollar',
        value: character,
      })
      index++
      continue
    }
    if (character === "'") {
      let text = ''
      index++
      let closed = false
      while (index < value.length) {
        if (value[index] === '\\' && index + 1 < value.length) {
          text += value[index + 1]
          index += 2
        } else if (value[index] === "'") {
          index++
          closed = true
          break
        } else {
          text += value[index++]
        }
      }
      if (!closed) throw new Error('Unterminated quoted string')
      tokens.push({ kind: 'string', value: text })
      continue
    }
    const start = index
    while (index < value.length && !/[\s()$']/.test(value[index])) index++
    if (start === index) throw new Error(`Unexpected character ${value[index]}`)
    tokens.push({ kind: 'atom', value: value.slice(start, index) })
  }
  return tokens
}

class DefinitionReader {
  private index = 0
  constructor(private readonly tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[this.index]
  }

  take(kind?: Token['kind']): Token {
    const token = this.tokens[this.index++]
    if (!token || (kind && token.kind !== kind)) {
      throw new Error(`Expected ${kind ?? 'token'}`)
    }
    return token
  }

  value(): string {
    const token = this.take()
    if (token.kind !== 'atom' && token.kind !== 'string') throw new Error('Expected value')
    return token.value
  }

  values(): string[] {
    if (this.peek()?.kind !== 'lparen') return [this.value()]
    this.take('lparen')
    const values: string[] = []
    while (this.peek() && this.peek()?.kind !== 'rparen') {
      if (this.peek()?.kind === 'dollar') this.take('dollar')
      else values.push(this.value())
    }
    this.take('rparen')
    if (values.length === 0) throw new Error('Expected at least one list value')
    return values
  }

  finish(): void {
    this.take('rparen')
    if (this.peek()) throw new Error('Unexpected content after definition')
  }
}

function startDefinition(value: string): { reader: DefinitionReader; oid: string } {
  const reader = new DefinitionReader(tokenize(value))
  reader.take('lparen')
  const oid = reader.value()
  if (!/^\d+(?:\.\d+)+$/.test(oid)) throw new Error(`Invalid numeric OID: ${oid}`)
  return { reader, oid }
}

function skipExtensionValue(reader: DefinitionReader): void {
  reader.values()
}

function parseAttributeType(value: string): ParsedAttributeType {
  const { reader, oid } = startDefinition(value)
  const result: ParsedAttributeType = {
    oid,
    names: [],
    singleValue: false,
    collective: false,
    noUserModification: false,
    raw: value.trim(),
  }
  while (reader.peek()?.kind !== 'rparen') {
    const keyword = reader.take('atom').value.toUpperCase()
    switch (keyword) {
      case 'NAME':
        result.names = reader.values()
        break
      case 'DESC':
        result.description = reader.value()
        break
      case 'SUP':
        result.superior = reader.values()[0]
        break
      case 'EQUALITY':
        result.equality = reader.value()
        break
      case 'ORDERING':
        result.ordering = reader.value()
        break
      case 'SUBSTR':
        result.substr = reader.value()
        break
      case 'SYNTAX':
        result.syntax = reader.value()
        break
      case 'USAGE':
        result.usage = reader.value()
        break
      case 'SINGLE-VALUE':
        result.singleValue = true
        break
      case 'COLLECTIVE':
        result.collective = true
        break
      case 'NO-USER-MODIFICATION':
        result.noUserModification = true
        break
      case 'OBSOLETE':
        break
      default:
        if (keyword.startsWith('X-')) skipExtensionValue(reader)
        else throw new Error(`Unexpected attribute type keyword: ${keyword}`)
    }
  }
  reader.finish()
  return result
}

function parseObjectClass(value: string): ParsedObjectClass {
  const { reader, oid } = startDefinition(value)
  const result: ParsedObjectClass = { oid, names: [], kind: 'STRUCTURAL', raw: value.trim() }
  while (reader.peek()?.kind !== 'rparen') {
    const keyword = reader.take('atom').value.toUpperCase()
    switch (keyword) {
      case 'NAME':
        result.names = reader.values()
        break
      case 'DESC':
        result.description = reader.value()
        break
      case 'SUP':
        result.superior = reader.values()
        break
      case 'MUST':
        result.must = reader.values()
        break
      case 'MAY':
        result.may = reader.values()
        break
      case 'ABSTRACT':
        result.kind = 'ABSTRACT'
        break
      case 'STRUCTURAL':
        result.kind = 'STRUCTURAL'
        break
      case 'AUXILIARY':
        result.kind = 'AUXILIARY'
        break
      case 'OBSOLETE':
        break
      default:
        if (keyword.startsWith('X-')) skipExtensionValue(reader)
        else throw new Error(`Unexpected object class keyword: ${keyword}`)
    }
  }
  reader.finish()
  return result
}

export function parseLdapSchema(input: string): ParsedSchema {
  const attributeTypes: ParsedAttributeType[] = []
  const objectClasses: ParsedObjectClass[] = []
  const errors: string[] = []
  if (!input.trim()) return { attributeTypes, objectClasses, errors }

  normalizeLines(input).forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const attributeMatch = /^attributeTypes\s*:\s*(.*)$/i.exec(trimmed)
    const objectClassMatch = /^objectClasses\s*:\s*(.*)$/i.exec(trimmed)
    if (!attributeMatch && !objectClassMatch) return
    const value = (attributeMatch ?? objectClassMatch)![1]
    if (!value) {
      errors.push(`Line ${index + 1}: Definition is empty`)
      return
    }
    try {
      if (attributeMatch) attributeTypes.push(parseAttributeType(value))
      else objectClasses.push(parseObjectClass(value))
    } catch (error) {
      const kind = attributeMatch ? 'attribute type' : 'object class'
      errors.push(
        `Line ${index + 1}: Failed to parse ${kind}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  })
  return { attributeTypes, objectClasses, errors }
}
