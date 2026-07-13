export interface LdapAndFilter {
  type: 'and'
  children: LdapFilterAst[]
}

export interface LdapOrFilter {
  type: 'or'
  children: LdapFilterAst[]
}

export interface LdapNotFilter {
  type: 'not'
  child: LdapFilterAst
}

export interface LdapEqualityFilter {
  type: 'equality'
  attribute: string
  value: string
}

export interface LdapPresenceFilter {
  type: 'presence'
  attribute: string
}

export interface LdapSubstringFilter {
  type: 'substring'
  attribute: string
  initial?: string
  any: string[]
  final?: string
}

export interface LdapGreaterOrEqualFilter {
  type: 'greaterOrEqual'
  attribute: string
  value: string
}

export interface LdapLessOrEqualFilter {
  type: 'lessOrEqual'
  attribute: string
  value: string
}

export interface LdapApproxFilter {
  type: 'approx'
  attribute: string
  value: string
}

export type LdapFilterAst =
  | LdapAndFilter
  | LdapOrFilter
  | LdapNotFilter
  | LdapEqualityFilter
  | LdapPresenceFilter
  | LdapSubstringFilter
  | LdapGreaterOrEqualFilter
  | LdapLessOrEqualFilter
  | LdapApproxFilter

export interface LdapFilterDiagnostic {
  /** Zero-based UTF-16 offset into the supplied filter string. */
  position: number
  /** One-based line number. */
  line: number
  /** One-based column number. */
  column: number
  message: string
}

export type LdapFilterValidationResult =
  | {
      valid: true
      ast: LdapFilterAst
      diagnostics: LdapFilterDiagnostic[]
    }
  | {
      valid: false
      ast: null
      diagnostics: LdapFilterDiagnostic[]
    }

export class LdapFilterSyntaxError extends Error {
  readonly position: number

  constructor(message: string, position: number) {
    super(message)
    this.name = 'LdapFilterSyntaxError'
    this.position = position
  }
}

interface PositionedByte {
  byte: number
  position: number
}

interface RawSubstringSegment {
  raw: string
  offset: number
}

type AssertionOperator = '=' | '>=' | '<=' | '~='

const HEX_PAIR = /^[0-9a-fA-F]{2}$/
const ATTRIBUTE_DESCRIPTION =
  /^(?:[A-Za-z][A-Za-z0-9-]*|[0-9]+(?:\.[0-9]+)+)(?:;[A-Za-z][A-Za-z0-9-]*)*$/

function isHighSurrogate(codeUnit: number): boolean {
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff
}

function isLowSurrogate(codeUnit: number): boolean {
  return codeUnit >= 0xdc00 && codeUnit <= 0xdfff
}

function appendCodePointBytes(codePoint: number, position: number, bytes: PositionedByte[]): void {
  if (codePoint <= 0x7f) {
    bytes.push({ byte: codePoint, position })
    return
  }

  if (codePoint <= 0x7ff) {
    bytes.push(
      { byte: 0xc0 | (codePoint >> 6), position },
      { byte: 0x80 | (codePoint & 0x3f), position }
    )
    return
  }

  if (codePoint <= 0xffff) {
    bytes.push(
      { byte: 0xe0 | (codePoint >> 12), position },
      { byte: 0x80 | ((codePoint >> 6) & 0x3f), position },
      { byte: 0x80 | (codePoint & 0x3f), position }
    )
    return
  }

  bytes.push(
    { byte: 0xf0 | (codePoint >> 18), position },
    { byte: 0x80 | ((codePoint >> 12) & 0x3f), position },
    { byte: 0x80 | ((codePoint >> 6) & 0x3f), position },
    { byte: 0x80 | (codePoint & 0x3f), position }
  )
}

function decodePositionedUtf8(bytes: PositionedByte[]): string {
  let result = ''

  for (let index = 0; index < bytes.length;) {
    const first = bytes[index]
    if (first.byte <= 0x7f) {
      result += String.fromCodePoint(first.byte)
      index += 1
      continue
    }

    let width: number
    let codePoint: number
    let minimum: number

    if (first.byte >= 0xc2 && first.byte <= 0xdf) {
      width = 2
      codePoint = first.byte & 0x1f
      minimum = 0x80
    } else if (first.byte >= 0xe0 && first.byte <= 0xef) {
      width = 3
      codePoint = first.byte & 0x0f
      minimum = 0x800
    } else if (first.byte >= 0xf0 && first.byte <= 0xf4) {
      width = 4
      codePoint = first.byte & 0x07
      minimum = 0x10000
    } else {
      throw new LdapFilterSyntaxError('Invalid UTF-8 byte in escaped value', first.position)
    }

    if (index + width > bytes.length) {
      throw new LdapFilterSyntaxError('Incomplete UTF-8 sequence in escaped value', first.position)
    }

    for (let continuationIndex = 1; continuationIndex < width; continuationIndex += 1) {
      const continuation = bytes[index + continuationIndex]
      if ((continuation.byte & 0xc0) !== 0x80) {
        throw new LdapFilterSyntaxError(
          'Invalid UTF-8 continuation byte in escaped value',
          continuation.position
        )
      }
      codePoint = (codePoint << 6) | (continuation.byte & 0x3f)
    }

    if (
      codePoint < minimum ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      throw new LdapFilterSyntaxError('Invalid UTF-8 sequence in escaped value', first.position)
    }

    result += String.fromCodePoint(codePoint)
    index += width
  }

  return result
}

function decodeFilterValue(value: string, basePosition: number): string {
  const bytes: PositionedByte[] = []

  for (let index = 0; index < value.length;) {
    const codeUnit = value.charCodeAt(index)

    if (value[index] === '\\') {
      const pair = value.slice(index + 1, index + 3)
      if (!HEX_PAIR.test(pair)) {
        throw new LdapFilterSyntaxError(
          'Escape sequences must contain exactly two hexadecimal digits',
          basePosition + index
        )
      }
      bytes.push({ byte: Number.parseInt(pair, 16), position: basePosition + index })
      index += 3
      continue
    }

    if (isHighSurrogate(codeUnit)) {
      const nextCodeUnit = value.charCodeAt(index + 1)
      if (!isLowSurrogate(nextCodeUnit)) {
        throw new LdapFilterSyntaxError(
          'Value contains an unpaired UTF-16 surrogate',
          basePosition + index
        )
      }
      const codePoint = 0x10000 + ((codeUnit - 0xd800) << 10) + (nextCodeUnit - 0xdc00)
      appendCodePointBytes(codePoint, basePosition + index, bytes)
      index += 2
      continue
    }

    if (isLowSurrogate(codeUnit)) {
      throw new LdapFilterSyntaxError(
        'Value contains an unpaired UTF-16 surrogate',
        basePosition + index
      )
    }

    appendCodePointBytes(codeUnit, basePosition + index, bytes)
    index += 1
  }

  return decodePositionedUtf8(bytes)
}

/** Escape an assertion value according to RFC 4515 valueencoding rules. */
export function escapeLdapFilterValue(value: string): string {
  let result = ''

  for (let index = 0; index < value.length;) {
    const codeUnit = value.charCodeAt(index)

    if (isHighSurrogate(codeUnit)) {
      const nextCodeUnit = value.charCodeAt(index + 1)
      if (!isLowSurrogate(nextCodeUnit)) {
        throw new LdapFilterSyntaxError('Value contains an unpaired UTF-16 surrogate', index)
      }
      result += value.slice(index, index + 2)
      index += 2
      continue
    }

    if (isLowSurrogate(codeUnit)) {
      throw new LdapFilterSyntaxError('Value contains an unpaired UTF-16 surrogate', index)
    }

    switch (codeUnit) {
      case 0x00:
        result += '\\00'
        break
      case 0x28:
        result += '\\28'
        break
      case 0x29:
        result += '\\29'
        break
      case 0x2a:
        result += '\\2a'
        break
      case 0x5c:
        result += '\\5c'
        break
      default:
        result += value[index]
    }
    index += 1
  }

  return result
}

/** Decode RFC 4515 hexadecimal octet escapes, including escaped UTF-8 sequences. */
export function unescapeLdapFilterValue(value: string): string {
  return decodeFilterValue(value, 0)
}

function findAssertionOperator(rawItem: string): {
  operator: AssertionOperator
  index: number
} | null {
  for (let index = 0; index < rawItem.length; index += 1) {
    if (rawItem[index] === '\\') {
      index += 2
      continue
    }

    const pair = rawItem.slice(index, index + 2)
    if (pair === '>=' || pair === '<=' || pair === '~=') {
      return { operator: pair, index }
    }
    if (rawItem[index] === '=') {
      return { operator: '=', index }
    }
  }

  return null
}

function splitSubstringValue(rawValue: string): RawSubstringSegment[] {
  const segments: RawSubstringSegment[] = []
  let segmentStart = 0

  for (let index = 0; index < rawValue.length; index += 1) {
    if (rawValue[index] === '\\') {
      index += 2
      continue
    }
    if (rawValue[index] === '*') {
      segments.push({ raw: rawValue.slice(segmentStart, index), offset: segmentStart })
      segmentStart = index + 1
    }
  }

  segments.push({ raw: rawValue.slice(segmentStart), offset: segmentStart })
  return segments
}

function findUnescapedAsterisk(rawValue: string): number {
  for (let index = 0; index < rawValue.length; index += 1) {
    if (rawValue[index] === '\\') {
      index += 2
      continue
    }
    if (rawValue[index] === '*') {
      return index
    }
  }
  return -1
}

class FilterParser {
  private position = 0

  constructor(private readonly input: string) {}

  parse(): LdapFilterAst {
    this.skipWhitespace()
    if (this.position >= this.input.length) {
      this.fail('A filter expression is required')
    }

    const ast = this.parseFilter()
    this.skipWhitespace()

    if (this.position !== this.input.length) {
      this.fail('Unexpected trailing input after the filter')
    }

    return ast
  }

  private parseFilter(): LdapFilterAst {
    if (this.input[this.position] !== '(') {
      this.fail('Expected "(" to start a filter')
    }
    this.position += 1

    if (this.position >= this.input.length) {
      this.fail('Unclosed filter; expected an expression and ")"')
    }

    const token = this.input[this.position]
    if (token === '&' || token === '|') {
      return this.parseFilterList(token)
    }
    if (token === '!') {
      return this.parseNotFilter()
    }

    return this.parseItemFilter()
  }

  private parseFilterList(operator: '&' | '|'): LdapAndFilter | LdapOrFilter {
    const operatorPosition = this.position
    this.position += 1
    this.skipWhitespace()

    const children: LdapFilterAst[] = []
    while (this.input[this.position] === '(') {
      children.push(this.parseFilter())
      this.skipWhitespace()
    }

    if (children.length === 0) {
      this.fail(
        `${operator === '&' ? 'AND' : 'OR'} filters require at least one child filter`,
        operatorPosition
      )
    }

    if (this.input[this.position] !== ')') {
      this.fail('Expected another child filter or ")"')
    }
    this.position += 1

    return operator === '&' ? { type: 'and', children } : { type: 'or', children }
  }

  private parseNotFilter(): LdapNotFilter {
    const operatorPosition = this.position
    this.position += 1
    this.skipWhitespace()

    if (this.input[this.position] !== '(') {
      this.fail('NOT filters require exactly one child filter', operatorPosition)
    }

    const child = this.parseFilter()
    this.skipWhitespace()

    if (this.input[this.position] === '(') {
      this.fail('NOT filters cannot contain more than one child filter')
    }
    if (this.input[this.position] !== ')') {
      this.fail('Expected ")" after the NOT child filter')
    }
    this.position += 1

    return { type: 'not', child }
  }

  private parseItemFilter(): LdapFilterAst {
    const itemStart = this.position

    while (this.position < this.input.length && this.input[this.position] !== ')') {
      const character = this.input[this.position]
      if (character === '(') {
        this.fail('Unescaped "(" is not allowed in an assertion value')
      }
      if (character === '\0') {
        this.fail('NUL bytes must be escaped as "\\00"')
      }
      if (character === '\\') {
        const pair = this.input.slice(this.position + 1, this.position + 3)
        if (!HEX_PAIR.test(pair)) {
          this.fail('Escape sequences must contain exactly two hexadecimal digits')
        }
        this.position += 3
        continue
      }
      this.position += 1
    }

    if (this.position >= this.input.length) {
      this.fail('Unclosed filter; expected ")"')
    }

    const rawItem = this.input.slice(itemStart, this.position)
    this.position += 1

    const foundOperator = findAssertionOperator(rawItem)
    if (!foundOperator) {
      throw new LdapFilterSyntaxError(
        'Expected one of "=", ">=", "<=", or "~=" in the filter item',
        itemStart
      )
    }

    const rawAttribute = rawItem.slice(0, foundOperator.index)
    if (rawAttribute.includes(':')) {
      throw new LdapFilterSyntaxError(
        'Extensible match filters (":=") are not supported',
        itemStart + rawAttribute.indexOf(':')
      )
    }
    if (!ATTRIBUTE_DESCRIPTION.test(rawAttribute)) {
      throw new LdapFilterSyntaxError(
        `Invalid LDAP attribute description "${rawAttribute || '(empty)'}"`,
        itemStart
      )
    }

    const operatorLength = foundOperator.operator.length
    const valueStart = itemStart + foundOperator.index + operatorLength
    const rawValue = rawItem.slice(foundOperator.index + operatorLength)

    if (foundOperator.operator === '=') {
      return this.parseEqualityLikeFilter(rawAttribute, rawValue, valueStart)
    }

    const wildcardPosition = findUnescapedAsterisk(rawValue)
    if (wildcardPosition !== -1) {
      throw new LdapFilterSyntaxError(
        'Asterisks in comparison values must be escaped as "\\2a"',
        valueStart + wildcardPosition
      )
    }

    const value = decodeFilterValue(rawValue, valueStart)
    if (foundOperator.operator === '>=') {
      return { type: 'greaterOrEqual', attribute: rawAttribute, value }
    }
    if (foundOperator.operator === '<=') {
      return { type: 'lessOrEqual', attribute: rawAttribute, value }
    }
    return { type: 'approx', attribute: rawAttribute, value }
  }

  private parseEqualityLikeFilter(
    attribute: string,
    rawValue: string,
    valueStart: number
  ): LdapEqualityFilter | LdapPresenceFilter | LdapSubstringFilter {
    const segments = splitSubstringValue(rawValue)
    if (segments.length === 1) {
      return {
        type: 'equality',
        attribute,
        value: decodeFilterValue(rawValue, valueStart),
      }
    }

    if (rawValue === '*') {
      return { type: 'presence', attribute }
    }

    const first = segments[0]
    const last = segments[segments.length - 1]
    const middle = segments.slice(1, -1)

    return {
      type: 'substring',
      attribute,
      initial:
        first.raw.length > 0 ? decodeFilterValue(first.raw, valueStart + first.offset) : undefined,
      any: middle.map((segment) => decodeFilterValue(segment.raw, valueStart + segment.offset)),
      final:
        last.raw.length > 0 ? decodeFilterValue(last.raw, valueStart + last.offset) : undefined,
    }
  }

  private skipWhitespace(): void {
    while (/\s/u.test(this.input[this.position] ?? '')) {
      this.position += 1
    }
  }

  private fail(message: string, position = this.position): never {
    throw new LdapFilterSyntaxError(message, position)
  }
}

/** Parse one complete RFC 4515 LDAP filter string into a typed AST. */
export function parseLdapFilter(input: string): LdapFilterAst {
  return new FilterParser(input).parse()
}

function assertAttributeDescription(attribute: string): void {
  if (!ATTRIBUTE_DESCRIPTION.test(attribute)) {
    throw new TypeError(`Invalid LDAP attribute description "${attribute}"`)
  }
}

function formatSubstringValue(filter: LdapSubstringFilter): string {
  let value = filter.initial === undefined ? '' : escapeLdapFilterValue(filter.initial)
  value += '*'
  for (const segment of filter.any) {
    value += `${escapeLdapFilterValue(segment)}*`
  }
  if (filter.final !== undefined) {
    value += escapeLdapFilterValue(filter.final)
  }
  return value
}

function formatFilterNode(ast: LdapFilterAst, pretty: boolean, depth: number): string {
  const indent = '  '.repeat(depth)
  const childIndent = '  '.repeat(depth + 1)

  switch (ast.type) {
    case 'and':
    case 'or': {
      if (ast.children.length === 0) {
        throw new TypeError(`${ast.type.toUpperCase()} filters require at least one child`)
      }
      const operator = ast.type === 'and' ? '&' : '|'
      if (!pretty) {
        return `(${operator}${ast.children
          .map((child) => formatFilterNode(child, false, depth + 1))
          .join('')})`
      }
      const children = ast.children
        .map((child) => `${childIndent}${formatFilterNode(child, true, depth + 1)}`)
        .join('\n')
      return `(${operator}\n${children}\n${indent})`
    }
    case 'not':
      if (!pretty) {
        return `(!${formatFilterNode(ast.child, false, depth + 1)})`
      }
      return `(!\n${childIndent}${formatFilterNode(ast.child, true, depth + 1)}\n${indent})`
    case 'equality':
      assertAttributeDescription(ast.attribute)
      return `(${ast.attribute}=${escapeLdapFilterValue(ast.value)})`
    case 'presence':
      assertAttributeDescription(ast.attribute)
      return `(${ast.attribute}=*)`
    case 'substring':
      assertAttributeDescription(ast.attribute)
      return `(${ast.attribute}=${formatSubstringValue(ast)})`
    case 'greaterOrEqual':
      assertAttributeDescription(ast.attribute)
      return `(${ast.attribute}>=${escapeLdapFilterValue(ast.value)})`
    case 'lessOrEqual':
      assertAttributeDescription(ast.attribute)
      return `(${ast.attribute}<=${escapeLdapFilterValue(ast.value)})`
    case 'approx':
      assertAttributeDescription(ast.attribute)
      return `(${ast.attribute}~=${escapeLdapFilterValue(ast.value)})`
  }
}

/** Format an AST as a compact filter or as an indented, parseable filter. */
export function formatLdapFilter(ast: LdapFilterAst, pretty = false): string {
  return formatFilterNode(ast, pretty, 0)
}

function quote(value: string): string {
  return JSON.stringify(value)
}

function leafExplanation(
  ast: Exclude<LdapFilterAst, LdapAndFilter | LdapOrFilter | LdapNotFilter>
): string {
  switch (ast.type) {
    case 'equality':
      return `${ast.attribute} equals ${quote(ast.value)}`
    case 'presence':
      return `${ast.attribute} is present`
    case 'substring':
      return `${ast.attribute} matches substring pattern ${quote(formatSubstringValue(ast))}`
    case 'greaterOrEqual':
      return `${ast.attribute} is greater than or equal to ${quote(ast.value)}`
    case 'lessOrEqual':
      return `${ast.attribute} is less than or equal to ${quote(ast.value)}`
    case 'approx':
      return `${ast.attribute} approximately equals ${quote(ast.value)}`
  }
}

function explainFilterNode(ast: LdapFilterAst, depth: number): string[] {
  const indent = '  '.repeat(depth)

  if (ast.type !== 'and' && ast.type !== 'or' && ast.type !== 'not') {
    return [`${indent}${leafExplanation(ast)}`]
  }

  const label =
    ast.type === 'and'
      ? 'All of the following must match'
      : ast.type === 'or'
        ? 'Any of the following may match'
        : 'The following must not match'
  const children = ast.type === 'not' ? [ast.child] : ast.children
  const lines = [`${indent}${label}:`]

  for (const child of children) {
    const childLines = explainFilterNode(child, depth + 1)
    const childIndent = '  '.repeat(depth + 1)
    lines.push(`${childIndent}- ${childLines[0].trimStart()}`)
    for (const continuation of childLines.slice(1)) {
      lines.push(`${childIndent}  ${continuation.trimStart()}`)
    }
  }

  return lines
}

/** Produce a plain-language, multi-line explanation of a filter AST. */
export function explainLdapFilter(ast: LdapFilterAst): string {
  return explainFilterNode(ast, 0).join('\n')
}

function diagnosticLocation(
  input: string,
  position: number
): Pick<LdapFilterDiagnostic, 'line' | 'column'> {
  const safePosition = Math.max(0, Math.min(position, input.length))
  const prefix = input.slice(0, safePosition)
  const lines = prefix.split(/\r\n|\r|\n/u)
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  }
}

/** Validate without throwing and return an AST or a position-aware diagnostic. */
export function validateLdapFilter(input: string): LdapFilterValidationResult {
  try {
    return { valid: true, ast: parseLdapFilter(input), diagnostics: [] }
  } catch (error) {
    const syntaxError =
      error instanceof LdapFilterSyntaxError
        ? error
        : new LdapFilterSyntaxError(
            error instanceof Error ? error.message : 'Unable to parse LDAP filter',
            0
          )
    const location = diagnosticLocation(input, syntaxError.position)
    return {
      valid: false,
      ast: null,
      diagnostics: [
        {
          position: syntaxError.position,
          line: location.line,
          column: location.column,
          message: syntaxError.message,
        },
      ],
    }
  }
}

/** Percent-encode a validated filter for use as a URL query value. */
export function encodeLdapFilterForUrl(filter: LdapFilterAst | string): string {
  const normalized =
    typeof filter === 'string'
      ? formatLdapFilter(parseLdapFilter(filter), false)
      : formatLdapFilter(filter, false)

  return encodeURIComponent(normalized).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  )
}
